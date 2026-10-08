import { connectSocket, getSocket } from "../context/socket";

const POLL_MS = 30000;

/**
 * Live comment notifications.
 * Primary transport is the existing socket.io event "comment-notification".
 * When the socket is down, this polls every 30 seconds and skips ticks while
 * the tab is hidden. Swap `attachSocket` if a different realtime channel is added later.
 */
export function subscribeToCommentNotifications({
  userType,
  userId,
  onNotification,
  onPoll,
}) {
  let pollTimer = null;
  let socket = null;
  let stopped = false;

  const matchesUser = (payload) =>
    payload &&
    payload.recipient_type === userType &&
    Number(payload.recipient_id) === Number(userId);

  const startPoll = () => {
    if (pollTimer || stopped) return;
    pollTimer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      onPoll();
    }, POLL_MS);
  };

  const stopPoll = () => {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  };

  const onSocketEvent = (payload) => {
    if (!matchesUser(payload)) return;
    onNotification(payload);
  };

  const onConnect = () => stopPoll();
  const onDisconnect = () => startPoll();

  const attachSocket = async () => {
    try {
      socket = getSocket() || (await connectSocket());
    } catch (error) {
      socket = getSocket();
    }

    if (stopped) return;

    if (!socket) {
      startPoll();
      return;
    }

    socket.on("comment-notification", onSocketEvent);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (stopped) {
      socket.off("comment-notification", onSocketEvent);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      return;
    }

    if (socket.connected) stopPoll();
    else startPoll();
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") onPoll();
  };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("comment-notifications-changed", onPoll);
    attachSocket();

    return () => {
      stopped = true;
      stopPoll();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("comment-notifications-changed", onPoll);
    if (socket) {
      socket.off("comment-notification", onSocketEvent);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    }
  };
}
