import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "react-bootstrap";
import {
  closeCommentSession,
  fetchCommentThread,
  markCommentNotificationsRead,
  postSubmissionComment,
  startCommentSession,
} from "../api/submissionComments";
import { getSocket } from "../context/socket";
import { formatRelativeTime, formatSessionStamp } from "../utils/formatRelativeTime";

function treeHasComment(comments, commentId) {
  return (comments || []).some(
    (comment) =>
      String(comment.comment_id) === String(commentId) ||
      treeHasComment(comment.replies, commentId),
  );
}

function sessionTitle(session) {
  if (session.is_legacy) return "Earlier discussion";
  if (session.status === "open") return "Current discussion";
  return "Discussion";
}

function CommentBubble({ comment, sessionLabel, canReply, onReply, highlighted }) {
  const mine = comment.sender_type === "Client";
  return (
    <div
      id={`comment-${comment.comment_id}`}
      className={`comment-bubble${highlighted ? " comment-bubble--target" : ""}`}
      style={{
        backgroundColor: mine ? "#ffead5" : "#9e52a30f",
        borderColor: mine ? "#ff983347" : "rgba(146, 74, 151, 0.25)",
      }}
    >
      <Avatar
        label={comment.sender_name?.charAt(0)?.toUpperCase() || "?"}
        shape="circle"
        style={{
          backgroundColor: mine ? "#ff9832" : "rgb(146 74 151)",
          color: "#fff",
          width: "32px",
          height: "32px",
          minWidth: "32px",
          fontSize: "14px",
        }}
      />
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex justify-content-between align-items-center gap-2">
          <span className="comment-bubble__author">
            {comment.sender_name}
            <Badge bg={mine ? "warning" : "secondary"} className="ms-2">
              {comment.sender_type}
            </Badge>
          </span>
          <time dateTime={comment.created_at} className="comment-bubble__time">
            {formatRelativeTime(comment.created_at)}
          </time>
        </div>
        <p className="comment-bubble__session">{sessionLabel}</p>
        <p className="comment-bubble__message">{comment.message}</p>
        {canReply ? (
          <Button
            label="Reply"
            icon="pi pi-reply"
            className="p-0"
            text
            style={{ fontSize: "11px", height: "20px", color: "#808080" }}
            aria-label={`Reply to ${comment.sender_name}`}
            onClick={() => onReply(comment)}
          />
        ) : null}
      </div>
    </div>
  );
}

function CommentNode({ comment, session, canReply, onReply, highlightCommentId }) {
  const sessionLabel = session.is_legacy
    ? "Earlier discussion"
    : `${sessionTitle(session)} · ${formatSessionStamp(session.started_at)}`;
  const replies = [...(comment.replies || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  return (
    <div className="mb-3">
      <CommentBubble
        comment={comment}
        sessionLabel={sessionLabel}
        canReply={canReply}
        onReply={onReply}
        highlighted={String(highlightCommentId) === String(comment.comment_id)}
      />
      {replies.length > 0 ? (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentBubble
              key={reply.comment_id}
              comment={reply}
              sessionLabel={sessionLabel}
              canReply={false}
              onReply={onReply}
              highlighted={String(highlightCommentId) === String(reply.comment_id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const SubmissionCommentThread = ({
  active,
  submissionId,
  senderType,
  senderId,
  senderName,
  highlightCommentId,
}) => {
  const [sessions, setSessions] = useState([]);
  const [sessionsSupported, setSessionsSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");

  const actor = useMemo(
    () => ({
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName || "Unknown",
    }),
    [senderType, senderId, senderName],
  );

  const load = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchCommentThread(id);
      setSessions(result.sessions);
      setSessionsSupported(result.sessionsSupported);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setSessions([]);
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active || !submissionId) return undefined;
    load(submissionId);
    if (senderType && senderId) {
      markCommentNotificationsRead(senderType, { submission_id: submissionId })
        .then(() => {
          window.dispatchEvent(new Event("comment-notifications-changed"));
        })
        .catch(() => {});
    }
    return undefined;
  }, [active, submissionId, senderType, senderId]);

  useEffect(() => {
    if (!active || !submissionId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    const handler = (data) => {
      if (Number(data.submission_id) === Number(submissionId)) {
        load(submissionId);
      }
    };
    socket.on("submission-comment-added", handler);
    return () => socket.off("submission-comment-added", handler);
  }, [active, submissionId]);

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };
      sessions.forEach((session) => {
        const id = String(session.session_id);
        const highlighted =
          highlightCommentId && treeHasComment(session.comments, highlightCommentId);
        if (next[id] == null) next[id] = session.status === "open" || highlighted;
        if (highlighted) next[id] = true;
      });
      return next;
    });
  }, [sessions, highlightCommentId]);

  useEffect(() => {
    if (!highlightCommentId || loading) return undefined;
    const node = document.getElementById(`comment-${highlightCommentId}`);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    return undefined;
  }, [highlightCommentId, loading, sessions]);

  const openSession = sessions.find((session) => session.status === "open");
  const pastSessions = sessions.filter((session) => session.status !== "open");

  const send = async () => {
    if (!message.trim() || !submissionId || sending) return;
    setSending(true);
    setActionError("");
    try {
      await postSubmissionComment(submissionId, {
        ...actor,
        message: message.trim(),
        parent_comment_id: replyingTo?.comment_id || null,
      });
      setMessage("");
      setReplyingTo(null);
      await load(submissionId);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not send the comment.");
    } finally {
      setSending(false);
    }
  };

  const startSession = async () => {
    if (!submissionId || sending) return;
    setSending(true);
    setActionError("");
    try {
      await startCommentSession(submissionId, actor);
      await load(submissionId);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not start a discussion.");
    } finally {
      setSending(false);
    }
  };

  const closeSession = async (sessionId) => {
    if (!submissionId || sending) return;
    setSending(true);
    setActionError("");
    try {
      await closeCommentSession(submissionId, sessionId);
      setReplyingTo(null);
      await load(submissionId);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not close this discussion.");
    } finally {
      setSending(false);
    }
  };

  const composer = (placeholder) => (
    <div className="mt-2">
      {replyingTo ? (
        <div className="comment-replying">
          <i className="pi pi-reply" aria-hidden="true" />
          <span>
            Replying to <b>{replyingTo.sender_name}</b>
          </span>
          <Button
            icon="pi pi-times"
            className="p-0 ms-auto"
            text
            aria-label="Cancel reply"
            style={{ width: "20px", height: "20px" }}
            onClick={() => setReplyingTo(null)}
          />
        </div>
      ) : null}
      <div className="d-flex gap-2 align-items-end">
        <InputText
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-grow-1"
          style={{ fontSize: "13px" }}
          disabled={sending}
        />
        <Button
          icon={sending ? "pi pi-spin pi-spinner" : "pi pi-send"}
          className="p-0"
          aria-label="Send comment"
          style={{
            width: "38px",
            height: "38px",
            backgroundColor: "rgb(146 74 151)",
            borderColor: "rgb(146 74 151)",
            color: "#fff",
          }}
          onClick={send}
          disabled={!message.trim() || sending}
        />
      </div>
    </div>
  );

  const renderSession = (session) => {
    const id = String(session.session_id);
    const isOpen = expanded[id] !== false && (expanded[id] || session.status === "open");
    const panelId = `comment-session-${id}`;
    const names = (session.participants || [])
      .map((person) => person.sender_name)
      .filter(Boolean)
      .join(", ");
    const canReply = session.status === "open" && !session.is_legacy;

    return (
      <section
        key={id}
        className={`comment-session${session.status === "open" ? "" : " comment-session--past"}`}
      >
        <button
          type="button"
          className="comment-session__toggle"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => ({ ...current, [id]: !isOpen }))}
        >
          <span>
            <strong>{sessionTitle(session)}</strong>
            <small>{formatSessionStamp(session.started_at)}</small>
          </span>
          <span className="comment-session__meta">
            <Badge bg={session.status === "open" ? "success" : "secondary"}>
              {session.is_legacy ? "Record" : session.status}
            </Badge>
            <small>
              {session.comment_count || 0} comments
              {names ? ` · ${names}` : ""}
            </small>
          </span>
        </button>
        {isOpen ? (
          <div id={panelId} className="comment-session__body">
            {(session.comments || []).length === 0 ? (
              <p className="comment-session__empty">No comments in this discussion yet.</p>
            ) : (
              [...session.comments]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((comment) => (
                  <CommentNode
                    key={comment.comment_id}
                    comment={comment}
                    session={session}
                    canReply={canReply}
                    onReply={setReplyingTo}
                    highlightCommentId={highlightCommentId}
                  />
                ))
            )}
            {canReply ? (
              <>
                {composer(replyingTo ? "Write a reply..." : "Write a comment...")}
                {sessionsSupported && session.session_id !== "current" ? (
                  <Button
                    label="Close discussion"
                    icon="pi pi-lock"
                    text
                    className="mt-2 p-0"
                    disabled={sending}
                    onClick={() => closeSession(session.session_id)}
                  />
                ) : null}
              </>
            ) : (
              <p className="comment-session__locked">This discussion is read-only.</p>
            )}
          </div>
        ) : null}
      </section>
    );
  };

  if (!submissionId) return null;

  return (
    <div className="comment-thread">
      {loading ? (
        <p className="text-center py-4 mb-0" role="status">
          <i className="pi pi-spin pi-spinner me-2" aria-hidden="true" />
          Loading comments...
        </p>
      ) : null}
      {!loading && error ? (
        <div className="text-center py-3" role="alert">
          <p className="mb-2">{error}</p>
          <Button label="Try again" outlined severity="secondary" onClick={() => load(submissionId)} />
        </div>
      ) : null}
      {!loading && !error && sessions.length === 0 ? (
        <p className="text-center text-muted py-3 mb-0">
          No comments yet. Start a conversation.
        </p>
      ) : null}
      {!loading && !error ? (
        <>
          {openSession ? renderSession(openSession) : null}
          {!openSession ? (
            <div className="comment-session comment-session--new">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <strong>New discussion</strong>
                {sessionsSupported ? (
                  <Button
                    label="Start discussion"
                    icon="pi pi-plus"
                    text
                    className="p-0"
                    disabled={sending}
                    onClick={startSession}
                  />
                ) : null}
              </div>
              {composer("Write a comment...")}
            </div>
          ) : null}
          {pastSessions.length > 0 ? (
            <div className="comment-history">
              <h6>Previous discussions</h6>
              {pastSessions.map(renderSession)}
            </div>
          ) : null}
        </>
      ) : null}
      {actionError ? (
        <p className="comment-thread__error" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
};

export default SubmissionCommentThread;
