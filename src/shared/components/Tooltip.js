"use client";

export default function Tooltip({ text, children, position = "top" }) {
  const arrowClass = {
    top: "left-1/2 -translate-x-1/2 top-full -mt-px border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-surface border-t dark:border-t-[var(--color-surface)]",
    bottom: "left-1/2 -translate-x-1/2 bottom-full -mb-px border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-surface border-b dark:border-b-[var(--color-surface)]",
    left: "top-1/2 -translate-y-1/2 left-full -ml-px border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-surface border-l dark:border-l-[var(--color-surface)]",
    right: "top-1/2 -translate-y-1/2 right-full -mr-px border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-surface border-r dark:border-r-[var(--color-surface)]",
  }[position];

  const posClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  return (
    <div className="relative inline-flex group/tt">
      {children}
      <div
        className={`pointer-events-none absolute ${posClass} z-50 w-max max-w-64 opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 delay-200`}
      >
        {/* Tooltip body */}
        <div className="relative px-2.5 py-1.5 text-[11px] leading-snug bg-surface border border-border shadow-[var(--shadow-elev)] text-text-main whitespace-normal">
          {text}
          {/* Arrow */}
          <div className={`absolute w-0 h-0 ${arrowClass}`} />
        </div>
      </div>
    </div>
  );
}
