"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNotificationStore } from "@/store/notificationStore";

function ToastItem({ notification, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const durationRef = useRef(notification.duration);
  const progressTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);

  // Sync duration if it changes
  useEffect(() => {
    durationRef.current = notification.duration;
  }, [notification.duration]);

  const handleDismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onRemove(notification.id), 250);
  }, [exiting, onRemove, notification.id]);

  // Auto-dismiss progress
  useEffect(() => {
    if (notification.duration <= 0) return;
    const start = Date.now();
    const duration = durationRef.current;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        clearInterval(progressTimerRef.current);
        handleDismiss();
      }
    }, 50);

    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearInterval(progressTimerRef.current);
      clearTimeout(dismissTimerRef.current);
    };
  }, [notification.id, notification.duration, handleDismiss]);

  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };

  const colors = {
    success:
      "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
    error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    warning:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  const type = notification.type || "info";

  return (
    <div
      className={`relative overflow-hidden border shadow-[var(--shadow-elev)] backdrop-blur-lg flex flex-col ${colors[type]} ${
        exiting ? "animate-[toastSlideOut_0.25s_ease-in_forwards]" : "animate-[toastSlideIn_0.3s_cubic-bezier(0.22,1,0.36,1)_forwards]"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <span className="material-symbols-outlined text-[18px] leading-5 flex-shrink-0">
          {icons[type] || icons.info}
        </span>
        <div className="min-w-0 flex-1">
          {notification.title ? (
            <p className="text-xs font-semibold mb-0.5">{notification.title}</p>
          ) : null}
          <p className="text-xs whitespace-pre-wrap break-words">
            {notification.message}
          </p>
        </div>
        {notification.dismissible !== false && (
          <button
            type="button"
            onClick={handleDismiss}
            className="text-current/70 hover:text-current flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>
      {/* Progress bar */}
      {notification.duration > 0 && (
        <div
          className="h-[3px] bg-current/30 w-full"
          style={{
            animation: `toastProgress ${notification.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

export default function ToastContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <ToastItem notification={n} onRemove={removeNotification} />
        </div>
      ))}
    </div>,
    document.body
  );
}

export { ToastContainer };
