import { Button } from "primereact/button";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomToast from "./CustomToast";
import { useAuth } from "../context/AuthContext";
import { useCommentNotifications } from "../hooks/useCommentNotifications";
import { commentThreadPath } from "../utils/commentLinks";
import { formatRelativeTime } from "../utils/formatRelativeTime";

const CommentNotificationBell = () => {
  const { isAuthenticated, role, userId } = useAuth();
  const navigate = useNavigate();
  const userType = role === "Client" ? "Client" : "Employee";
  const panelId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const toastRef = useRef(null);
  const lastToastId = useRef(null);
  const [open, setOpen] = useState(false);

  const { items, unreadCount, status, toastItem, markAllRead, markOneRead } =
    useCommentNotifications({
      enabled: isAuthenticated && !!userId,
      userType,
      userId,
    });

  useEffect(() => {
    if (!toastItem || toastItem.notification_id === lastToastId.current) return;
    lastToastId.current = toastItem.notification_id;
    toastRef.current?.show(
      "info",
      `New comment from ${toastItem.author_name || "someone"}`,
      toastItem.snippet || "Open notifications to read it.",
      4000,
    );
  }, [toastItem]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!isAuthenticated) return null;

  const closePanel = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onPanelKeyDown = (event) => {
    const list = panelRef.current?.querySelectorAll("[data-notify-item]") || [];
    const itemsInList = Array.from(list);
    const index = itemsInList.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = index < 0 ? 0 : Math.min(index + 1, itemsInList.length - 1);
      itemsInList[next]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = index < 0 ? itemsInList.length - 1 : Math.max(index - 1, 0);
      itemsInList[next]?.focus();
    }
    if (event.key === "Home") {
      event.preventDefault();
      itemsInList[0]?.focus();
    }
    if (event.key === "End") {
      event.preventDefault();
      itemsInList[itemsInList.length - 1]?.focus();
    }
  };

  const openNotification = async (item) => {
    if (!item.read_at) {
      try {
        await markOneRead(item.notification_id);
      } catch (error) {
        console.error("Could not mark notification read:", error);
      }
    }
    setOpen(false);
    navigate(
      commentThreadPath({
        role,
        submissionId: item.submission_id,
        commentId: item.comment_id,
      }),
    );
  };

  const badgeLabel = unreadCount
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <div className="comment-notify" ref={rootRef}>
      <CustomToast ref={toastRef} />
      <span className="visually-hidden" aria-live="polite">
        {unreadCount} unread comment notifications
      </span>
      <Button
        ref={buttonRef}
        icon="pi pi-bell"
        rounded
        text
        severity="info"
        aria-label={badgeLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        tooltip="Notifications"
        tooltipOptions={{ position: "bottom" }}
        onClick={() => setOpen((current) => !current)}
      />
      {unreadCount > 0 ? (
        <span className="comment-notify__badge" aria-hidden="true">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          className="comment-notify__panel"
          role="dialog"
          aria-label="Comment notifications"
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
        >
          <div className="comment-notify__header">
            <strong>Comments</strong>
            <Button
              label="Mark all as read"
              text
              className="p-0"
              disabled={!unreadCount}
              onClick={() => markAllRead().catch(() => {})}
            />
          </div>
          {status === "error" ? (
            <p className="comment-notify__empty" role="alert">
              Could not load notifications.
            </p>
          ) : null}
          {status !== "error" && items.length === 0 ? (
            <p className="comment-notify__empty">No comment notifications yet.</p>
          ) : null}
          <ul className="comment-notify__list">
            {items.map((item) => (
              <li key={item.notification_id}>
                <button
                  type="button"
                  data-notify-item
                  className={`comment-notify__item${item.read_at ? "" : " is-unread"}`}
                  onClick={() => openNotification(item)}
                >
                  <span className="comment-notify__author">
                    {item.author_name}
                    <small>{item.author_type}</small>
                  </span>
                  <span className="comment-notify__snippet">
                    {item.snippet || "New comment"}
                  </span>
                  <span className="comment-notify__meta">
                    <time dateTime={item.created_at}>{formatRelativeTime(item.created_at)}</time>
                    <small>{item.context_label || `Submission #${item.submission_id}`}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default CommentNotificationBell;
