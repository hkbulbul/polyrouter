"use client";

/** Security warning banner with optional action link */
export default function SecurityWarning({ message, action }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/25 text-yellow-800 dark:text-yellow-300">
      <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
      <p className="text-xs flex-1 leading-relaxed">{message}</p>
      {action && (
        <a
          href={action.href}
          className="text-xs font-semibold underline shrink-0 hover:opacity-80 mt-0.5"
          onClick={action.href.startsWith("#") ? (e) => {
            e.preventDefault();
            document.getElementById(action.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
          } : undefined}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
