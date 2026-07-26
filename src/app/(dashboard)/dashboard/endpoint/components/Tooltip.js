"use client";

/**
 * Self-contained inline tooltip (renders its own help icon trigger).
 * For wrapping-tooltip behavior, use @/shared/components/Tooltip instead.
 */
export default function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="material-symbols-outlined text-[14px] text-text-muted cursor-help">help</span>
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-50 w-64 bg-surface border border-border shadow-[var(--shadow-elev)] text-text-main text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-200">
        {text}
      </span>
    </span>
  );
}
