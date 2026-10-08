const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Client_Registration = require('../Models/Client_Registration');
const User = require('../Models/User');
const SubmissionComment = require('../NewModels/SubmissionComment');
const CommentSession = require('../NewModels/CommentSession');
const CommentNotification = require('../NewModels/CommentNotification');
const { getIO } = require('../sockets/socketHandler');

function httpError(status, publicMessage) {
  const error = new Error(publicMessage);
  error.status = status;
  error.publicMessage = publicMessage;
  return error;
}

function walkComments(comments, visit) {
  (comments || []).forEach((comment) => {
    visit(comment);
    walkComments(comment.replies, visit);
  });
}

function collectPeople(comments) {
  const people = new Map();
  walkComments(comments, (comment) => {
    const key = `${comment.sender_type}:${comment.sender_id}`;
    if (!people.has(key)) {
      people.set(key, {
        sender_type: comment.sender_type,
        sender_id: comment.sender_id,
        sender_name: comment.sender_name,
      });
    }
  });
  return [...people.values()];
}

function countTree(comments) {
  let total = 0;
  walkComments(comments, () => {
    total += 1;
  });
  return total;
}

function shapeSession(sessionRow, comments) {
  const participants = collectPeople(comments);
  if (
    sessionRow.started_by_id &&
    !participants.some(
      (person) =>
        person.sender_type === sessionRow.started_by_type &&
        Number(person.sender_id) === Number(sessionRow.started_by_id)
    )
  ) {
    participants.unshift({
      sender_type: sessionRow.started_by_type,
      sender_id: sessionRow.started_by_id,
      sender_name: sessionRow.started_by_name,
    });
  }

  return {
    session_id: sessionRow.session_id,
    status: sessionRow.status,
    is_legacy: false,
    started_at: sessionRow.started_at,
    closed_at: sessionRow.closed_at,
    started_by_name: sessionRow.started_by_name || null,
    participants,
    comment_count: countTree(comments),
    comments,
  };
}

function compareSessions(a, b) {
  if (a.status === 'open' && b.status !== 'open') return -1;
  if (b.status === 'open' && a.status !== 'open') return 1;
  if (a.is_legacy && !b.is_legacy) return 1;
  if (b.is_legacy && !a.is_legacy) return -1;
  return new Date(b.started_at || 0) - new Date(a.started_at || 0);
}

async function getOrCreateOpenSession(submissionId, actor) {
  return sequelize.transaction(async (transaction) => {
    const existing = await CommentSession.findOne({
      where: { submission_id: submissionId, status: 'open' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) return existing;

    return CommentSession.create(
      {
        submission_id: Number(submissionId),
        status: 'open',
        started_at: new Date(),
        started_by_type: actor.sender_type,
        started_by_id: actor.sender_id,
        started_by_name: actor.sender_name,
      },
      { transaction }
    );
  });
}

async function assignSessionForNewComment({ submissionId, parentComment, actor }) {
  if (parentComment) {
    if (parentComment.session_id == null) {
      throw httpError(
        400,
        'This earlier discussion is closed. Start a new discussion to continue.'
      );
    }

    const session = await CommentSession.findByPk(parentComment.session_id);
    if (!session || session.status !== 'open') {
      throw httpError(
        400,
        'This discussion is closed. Start a new discussion to continue.'
      );
    }
    return session.session_id;
  }

  const session = await getOrCreateOpenSession(submissionId, actor);
  return session.session_id;
}

async function closeCommentSession(submissionId, sessionId) {
  if (String(sessionId) === 'legacy') {
    throw httpError(400, 'The earlier discussion is already closed.');
  }

  const session = await CommentSession.findOne({
    where: { session_id: sessionId, submission_id: submissionId },
  });
  if (!session) {
    throw httpError(404, 'Discussion not found.');
  }
  if (session.status === 'closed') return session;

  session.status = 'closed';
  session.closed_at = new Date();
  await session.save();
  return session;
}

async function buildSessionView(submissionId) {
  const [sessionRows, commentRows, total] = await Promise.all([
    CommentSession.findAll({
      where: { submission_id: submissionId },
      order: [['started_at', 'ASC']],
    }),
    SubmissionComment.findAll({
      where: { submission_id: submissionId, parent_comment_id: null },
      include: [
        {
          model: SubmissionComment,
          as: 'replies',
          separate: true,
          order: [['created_at', 'ASC']],
        },
      ],
      order: [['created_at', 'ASC']],
    }),
    SubmissionComment.count({ where: { submission_id: submissionId } }),
  ]);

  const comments = commentRows.map((row) => row.toJSON());
  const grouped = new Map();
  const legacyComments = [];

  comments.forEach((comment) => {
    if (comment.session_id == null) {
      legacyComments.push(comment);
      return;
    }
    const key = String(comment.session_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(comment);
  });

  const sessions = sessionRows.map((row) => {
    const plain = row.toJSON();
    return shapeSession(plain, grouped.get(String(plain.session_id)) || []);
  });

  grouped.forEach((list, key) => {
    const known = sessions.some((session) => String(session.session_id) === key);
    if (known) return;
    sessions.push(
      shapeSession(
        {
          session_id: Number(key),
          status: 'closed',
          started_at: list[0]?.created_at || null,
          closed_at: null,
          started_by_type: null,
          started_by_id: null,
          started_by_name: null,
        },
        list
      )
    );
  });

  if (legacyComments.length) {
    const startedAt = legacyComments[0]?.created_at || null;
    const endedAt = legacyComments[legacyComments.length - 1]?.created_at || startedAt;
    sessions.push({
      session_id: 'legacy',
      status: 'closed',
      is_legacy: true,
      started_at: startedAt,
      closed_at: endedAt,
      started_by_name: null,
      participants: collectPeople(legacyComments),
      comment_count: countTree(legacyComments),
      comments: legacyComments,
    });
  }

  sessions.sort(compareSessions);
  return { data: comments, total, sessions };
}

function snippetOf(message) {
  return String(message || '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

async function notifyCommentParticipants({ submission, comment }) {
  const prior = await SubmissionComment.findAll({
    where: { submission_id: comment.submission_id },
    attributes: ['sender_type', 'sender_id'],
  });

  const recipients = new Map();
  const addRecipient = (type, id) => {
    if (!type || id == null) return;
    if (
      type === comment.sender_type &&
      Number(id) === Number(comment.sender_id)
    ) {
      return;
    }
    recipients.set(`${type}:${id}`, {
      recipient_type: type,
      recipient_id: Number(id),
    });
  };

  addRecipient('Client', submission.client_registration_id);
  prior.forEach((row) => addRecipient(row.sender_type, row.sender_id));

  // The submission inbox is shared by staff, so every active employee
  // hears about a comment they did not write.
  const staff = await User.findAll({
    where: {
      user_type: { [Op.ne]: 'Unverified' },
      [Op.or]: [{ is_active: true }, { is_active: null }],
    },
    attributes: ['user_id'],
  });
  staff.forEach((user) => addRecipient('Employee', user.user_id));

  if (!recipients.size) return [];

  const client = await Client_Registration.findByPk(submission.client_registration_id, {
    attributes: ['name'],
  });
  const contextLabel = client?.name || `Submission #${submission.submission_id}`;
  const snippet = snippetOf(comment.message);
  const created = [];

  for (const recipient of recipients.values()) {
    const row = await CommentNotification.create({
      ...recipient,
      submission_id: comment.submission_id,
      comment_id: comment.comment_id,
      author_name: comment.sender_name,
      author_type: comment.sender_type,
      snippet,
      context_label: contextLabel,
    });
    created.push(row);
  }

  const io = getIO();
  if (io) {
    created.forEach((row) => {
      io.emit('comment-notification', {
        notification_id: row.notification_id,
        recipient_type: row.recipient_type,
        recipient_id: row.recipient_id,
        submission_id: row.submission_id,
        comment_id: row.comment_id,
        author_name: row.author_name,
        author_type: row.author_type,
        snippet: row.snippet,
        context_label: row.context_label,
        created_at: row.created_at,
        read_at: null,
      });
    });
  }

  return created;
}

module.exports = {
  assignSessionForNewComment,
  buildSessionView,
  closeCommentSession,
  getOrCreateOpenSession,
  notifyCommentParticipants,
};
