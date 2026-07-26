"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/utils/cn";
import Button from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  className,
}) {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  // ── Exit animation state ──
  const [mounting, setMounting] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const closeTimer = useRef(null);
  const openTimer = useRef(null);

  // ── Mount/unmount with animation ──
  useEffect(() => {
    if (isOpen) {
      setMounting(true);
      // RAF + microtask to ensure the DOM node is painted before adding visible class
      openTimer.current = requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounting(false), 150);
    }
    return () => {
      cancelAnimationFrame(openTimer.current);
      clearTimeout(closeTimer.current);
    };
  }, [isOpen]);

  // ── Scroll lock + scrollbar compensation ──
  useEffect(() => {
    if (!mounting) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [mounting]);

  // ── Escape key ──
  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimer.current = setTimeout(() => {
      setMounting(false);
      onClose?.();
    }, 150);
  }, [onClose]);

  useEffect(() => {
    if (!mounting) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mounting, handleClose]);

  // ── Focus trap + return focus ──
  useEffect(() => {
    if (!mounting) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement;

    // Focus first focusable element in the panel
    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector(FOCUSABLE);
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
      } else {
        // If nothing focusable, focus the panel itself
        panel.setAttribute("tabindex", "-1");
        panel.focus();
      }
    }

    const handleTab = (e) => {
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);

    return () => {
      document.removeEventListener("keydown", handleTab);
      // Return focus
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        try {
          previousFocusRef.current.focus();
        } catch (_) {
          /* ignore */
        }
      }
    };
  }, [mounting]);

  // ── Don't render anything until we're "mounting" ──
  if (!mounting) return null;
  if (typeof document === "undefined") return null;

  const overlayAnim = visible ? "fade-in" : "fade-out";
  const panelAnim = visible ? "scale-in" : "scale-out";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className={cn("absolute inset-0 bg-black/50 backdrop-blur-[2px]", overlayAnim)}
        onClick={closeOnOverlay ? handleClose : undefined}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative w-full bg-surface",
          "border border-border-subtle",
          "shadow-[var(--shadow-elev)]",
          panelAnim,
          sizes[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border-subtle">
          <h2 id={titleId} className="text-sm font-semibold text-text-main truncate">
            {title}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="shrink-0 p-1 -mr-1 text-text-muted hover:text-text-main transition-colors rounded-md hover:bg-surface-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[calc(85vh-110px)] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle bg-surface-2/40">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-text-muted">{message}</p>
    </Modal>
  );
}
