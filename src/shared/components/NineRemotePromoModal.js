"use client";

import Modal from "./Modal";

const FEATURES = [
  { icon: "terminal", label: "Terminal", desc: "Full shell access" },
  { icon: "cast", label: "Desktop", desc: "Screen sharing" },
  { icon: "folder_open", label: "Files", desc: "Browse & edit files" },
];

const BULLETS = [
  { icon: "qr_code_scanner", text: "Scan QR to connect instantly" },
  { icon: "wifi_off", text: "No port forwarding needed" },
  { icon: "devices", text: "Works on any device" },
];

const NINE_REMOTE_URL = "https://9remote.cc";

export default function NineRemotePromoModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="9Remote"
      size="sm"
      className="overflow-hidden"
    >
      <div className="-mx-5 -mt-5 flex flex-col gap-6">
        {/* Hero */}
        <div className="flex flex-col items-center gap-2 text-center px-7 mt-2">
          <div className="w-14 h-14 flex items-center justify-center mb-1 bg-primary shadow-[var(--shadow-warm)] rounded-full">
            <span className="material-symbols-outlined text-white text-[30px]">
              terminal
            </span>
          </div>
          <h1 className="text-lg font-bold text-text-main tracking-tight">
            9Remote
          </h1>
          <p className="text-xs text-text-muted leading-5 max-w-[220px]">
            Access your terminal, desktop &amp; files from anywhere
          </p>
        </div>

        <div className="px-7 flex flex-col gap-6 pb-9">
          {/* Feature cards */}
          <div className="flex gap-2 w-full">
            {FEATURES.map(({ icon, label, desc }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center gap-1.5 py-4 px-1 rounded-[var(--radius-brand)] border border-border-subtle bg-surface-2"
              >
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {icon}
                </span>
                <p className="text-xs font-semibold text-text-main">{label}</p>
                <p className="text-[10px] text-text-muted text-center leading-4">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bullets */}
          <div className="flex flex-col gap-3 w-full">
            {BULLETS.map(({ icon, text }) => (
              <div key={icon} className="flex items-center gap-2.5">
                <span className="material-symbols-outlined flex-shrink-0 text-primary text-[16px]">
                  {icon}
                </span>
                <span className="text-xs text-text-muted">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => window.open(NINE_REMOTE_URL, "_blank")}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-[var(--radius-brand)] bg-primary hover:bg-primary-hover shadow-[var(--shadow-warm)] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-base">
              open_in_new
            </span>
            Get 9Remote
          </button>
        </div>
      </div>
    </Modal>
  );
}
