import api from "./axios";

function userTypeQuery(userType) {
  return userType ? `?user_type=${encodeURIComponent(userType)}` : "";
}

function walkComments(comments, visit) {
  (comments || []).forEach((comment) => {
    visit(comment);
    walkComments(comment.replies, visit);
  });
}

function peopleFrom(comments) {
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

export function sessionsFromPayload(payload) {
  if (Array.isArray(payload?.sessions)) {
    return { sessions: payload.sessions, sessionsSupported: true };
  }

  const comments = Array.isArray(payload?.data) ? payload.data : [];
  if (!comments.length) {
    return { sessions: [], sessionsSupported: false };
  }

  return {
    sessionsSupported: false,
    sessions: [
      {
        session_id: "current",
        status: "open",
        is_legacy: false,
        started_at: comments[0]?.created_at || null,
        closed_at: null,
        participants: peopleFrom(comments),
        comment_count: payload?.total || comments.length,
        comments,
      },
    ],
  };
}

export async function fetchCommentThread(submissionId) {
  const response = await api.get(`/api/client/submissions/${submissionId}/comments`);
  return sessionsFromPayload(response.data);
}

export async function postSubmissionComment(submissionId, body) {
  const response = await api.post(
    `/api/client/submissions/${submissionId}/comments`,
    body,
  );
  return response.data;
}

export async function startCommentSession(submissionId, body) {
  const response = await api.post(
    `/api/client/submissions/${submissionId}/comment-sessions`,
    body,
  );
  return response.data;
}

export async function closeCommentSession(submissionId, sessionId) {
  const response = await api.put(
    `/api/client/submissions/${submissionId}/comment-sessions/${sessionId}/close`,
  );
  return response.data;
}

export async function fetchCommentNotifications(userType) {
  const response = await api.get(
    `/api/client/comment-notifications${userTypeQuery(userType)}`,
  );
  return {
    unreadCount: response.data?.unread_count || 0,
    items: response.data?.data || [],
  };
}

export async function markCommentNotificationsRead(userType, body) {
  const response = await api.post(
    `/api/client/comment-notifications/read${userTypeQuery(userType)}`,
    body,
  );
  return response.data;
}
