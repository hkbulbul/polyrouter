"use client";

import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/utils/cn";

/**
 * Dropdown menu — reusable portal-based dropdown with keyboard nav.
 *
 * Usage:
 *   <Dropdown trigger={<button>Open</button>} align="right">
 *     <DropdownItem icon="settings" label="Settings" onClick={...} />
 *     <DropdownItem icon="delete" label="Delete" onClick={...} danger />
 *   </Dropdown>
 *
 * For simple string-based menus:
 *   <Dropdown trigger={<button>...</button>} items={[
 *     { icon: "settings", label: "Settings", onClick: ... },
 *     { icon: "delete", label: "Delete", onClick: ..., danger: true },
 *   ]} />
 */

export function DropdownItem({ icon, label, onClick, danger, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left",
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : "text-text-main hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {icon && (
        <span
          className={cn(
            "material-symbols-outlined text-[20px]",
            danger ? "" : "text-text-muted"
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">{label}</span>
      {trailing && <span className="text-base">{trailing}</span>}
    </button>
  );
}

export default function Dropdown({
  trigger,
  items,
  children,
  align = "right",
  className,
  onOpenChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [flipUp, setFlipUp] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 280; // approximate max
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlip = spaceBelow < menuHeight && rect.top > menuHeight;

    setFlipUp(shouldFlip);

    const left =
      align === "right"
        ? rect.right
        : rect.left;

    if (align === "right") {
      setMenuPos({
        top: shouldFlip ? rect.top - 8 : rect.bottom + 8,
        right: window.innerWidth - rect.right,
        left: undefined,
      });
    } else {
      setMenuPos({
        top: shouldFlip ? rect.top - 8 : rect.bottom + 8,
        left: left,
      });
    }
  }, [isOpen, align]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, close]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const items = menuRef.current.querySelectorAll('[role="menuitem"]');

    const handleKey = (e) => {
      const currentIndex = Array.from(items).indexOf(document.activeElement);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = (currentIndex + 1) % items.length;
          items[next]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = (currentIndex - 1 + items.length) % items.length;
          items[prev]?.focus();
          break;
        }
        case "Escape":
          e.preventDefault();
          close();
          triggerRef.current?.focus();
          break;
        case "Tab":
          close();
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          if (document.activeElement?.click) {
            document.activeElement.click();
          }
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Focus first item on open
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const first = menuRef.current.querySelector('[role="menuitem"]');
    if (first) {
      requestAnimationFrame(() => first.focus());
    }
  }, [isOpen]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        ref: triggerRef,
        onClick: (e) => {
          trigger.props.onClick?.(e);
          toggle();
        },
        "aria-haspopup": "true",
        "aria-expanded": isOpen,
      })
    : null;

  // Resolve menu children
  const menuChildren = children
    ? children
    : items?.map((item, i) => (
        <DropdownItem
          key={i}
          icon={item.icon}
          label={item.label}
          onClick={() => {
            item.onClick?.();
            close();
          }}
          danger={item.danger}
          trailing={item.trailing}
        />
      ));

  return (
    <>
      {triggerElement}

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[60] min-w-[180px] bg-surface border border-border shadow-[var(--shadow-elev)] py-1 scale-in",
              flipUp ? "origin-bottom" : "origin-top",
              className
            )}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              right: menuPos.right,
            }}
            onClick={(e) => {
              // Close when clicking a menuitem
              if (e.target.closest('[role="menuitem"]')) {
                close();
              }
            }}
          >
            {menuChildren}
          </div>,
          document.body
        )}
    </>
  );
}
