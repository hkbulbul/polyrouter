"use client";

import PropTypes from "prop-types";
import ThemeToggle from "../ThemeToggle";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative bg-bg transition-colors duration-500 overflow-x-hidden">
      {/* Background: faint dot grid fading in from the edges, plus film grain (landing style) */}
      <div className="dot-grid fixed inset-0 pointer-events-none z-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_75%)]" aria-hidden="true" />
      <div className="app-grain" aria-hidden="true" />

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="card" />
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 z-10 w-full h-full">
        {children}
      </main>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

