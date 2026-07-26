"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/utils/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className,
}) {
  const widths = {
    sm: "w-[400px]",
    md: "w-[500px]",
    lg: "w-[600px]",
    xl: "w-[800px]",
    full: "w-full",
  };

  // ── Exit animation state ──
  const [mounting, setMounting] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const closeTimer = useRef(null);
  const openTimer = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMounting(true);
      openTimer.current = requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounting(false), 200);
    }
    return () => {
      cancelAnimationFrame(openTimer.current);
      clearTimeout(closeTimer.current);
    };
  }, [isOpen]);

  // ── Scroll lock ──
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

  // ── Close handler with animation ──
  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimer.current = setTimeout(() => {
      setMounting(false);
      onClose?.();
    }, 200);
  }, [onClose]);

  // ── Escape key ──
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
    previousFocusRef.current = document.activeElement;

    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector(FOCUSABLE);
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
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

  if (!mounting) return null;
  if (typeof document === "undefined") return null;

  const overlayAnim = visible ? "fade-in" : "fade-out";
  const drawerAnim = visible ? "slide-in-right" : "slide-out-right";

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer",
          overlayAnim
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Drawer"}
        className={cn(
          "absolute right-0 top-0 h-full bg-surface flex flex-col",
          "shadow-[var(--shadow-elev)]",
          drawerAnim,
          "border-l border-border-subtle",
          widths[width] || widths.md,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            {title && (
              <h2 className="text-lg font-semibold text-text-main">{title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-text-muted hover:bg-surface-2 hover:text-text-main transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>
      </div>
    </div>,
    document.body
  );
}
