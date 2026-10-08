import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCommentNotifications,
  markCommentNotificationsRead,
} from "../api/submissionComments";
import { subscribeToCommentNotifications } from "../services/commentNotificationFeed";

export function useCommentNotifications({ enabled, userType, userId }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState("idle");
  const [toastItem, setToastItem] = useState(null);
  const seenIds = useRef(new Set());
  const loadedOnce = useRef(false);

  const applyPage = useCallback((page, { announce }) => {
    const nextItems = page.items || [];
    const fresh = nextItems.filter(
      (item) => !seenIds.current.has(item.notification_id) && !item.read_at,
    );
    nextItems.forEach((item) => seenIds.current.add(item.notification_id));
    setItems(nextItems);
    setUnreadCount(page.unreadCount || 0);
    if (announce && fresh.length && document.visibilityState === "visible") {
      setToastItem(fresh[0]);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !userType || !userId) return;
    try {
      const page = await fetchCommentNotifications(userType);
      const announce = loadedOnce.current;
      loadedOnce.current = true;
      applyPage(page, { announce });
      setStatus("ready");
    } catch (error) {
      console.error("Error loading comment notifications:", error);
      setStatus("error");
    }
  }, [applyPage, enabled, userId, userType]);

  useEffect(() => {
    if (!enabled || !userType || !userId) return undefined;
    loadedOnce.current = false;
    seenIds.current = new Set();
    refresh();

    const stop = subscribeToCommentNotifications({
      userType,
      userId,
      onPoll: () => refresh(),
      onNotification: (payload) => {
        if (seenIds.current.has(payload.notification_id)) return;
        seenIds.current.add(payload.notification_id);
        setItems((current) => [payload, ...current.filter((item) => item.notification_id !== payload.notification_id)].slice(0, 25));
        setUnreadCount((count) => count + 1);
        if (document.visibilityState === "visible") setToastItem(payload);
        setStatus("ready");
      },
    });

    return stop;
  }, [enabled, refresh, userId, userType]);

  const markAllRead = useCallback(async () => {
    await markCommentNotificationsRead(userType, { all: true });
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  }, [userType]);

  const markOneRead = useCallback(async (notificationId) => {
    await markCommentNotificationsRead(userType, { notification_id: notificationId });
    setItems((current) =>
      current.map((item) =>
        item.notification_id === notificationId
          ? { ...item, read_at: item.read_at || new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, [userType]);

  return {
    items,
    unreadCount,
    status,
    toastItem,
    refresh,
    markAllRead,
    markOneRead,
  };
}
