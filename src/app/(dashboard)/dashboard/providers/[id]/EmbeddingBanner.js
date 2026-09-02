"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";

function BannerMedia({ banner }) {
  const label = banner.displayName || "Banner";

  if (banner.mediaKind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image would need remotePatterns
      <img
        src={banner.mediaContent}
        alt={label}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="block max-h-64 w-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  if (banner.mediaKind === "youtube") {
    // allow-same-origin lets the player reach its OWN youtube-nocookie storage — without it the
    // frame renders black. On a cross-origin frame it grants no access to this app's origin.
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${banner.mediaContent}`}
        title={label}
        className="block aspect-video w-full"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        allowFullScreen
      />
    );
  }

  // ponytail: empty sandbox — static markup and inline CSS only. srcdoc frames inherit the
  // embedder's origin, so this attribute is the whole control: never pair allow-scripts with
  // allow-same-origin here, that is a full escape. Add a CSP before loosening it.
  // A full document owns its own <head>; anything prepended before <!DOCTYPE> forces quirks mode.
  // So the reset is only injected for bare fragments, where the browser's default 8px body margin
  // is what showed as a white frame. A <style> tag is not script, so the sandbox is unaffected.
  const html = /^\s*<(!doctype|html)\b/i.test(banner.mediaContent)
    ? banner.mediaContent
    : `<style>html,body{margin:0;padding:0;overflow:hidden}</style>${banner.mediaContent}`;
  return <iframe srcDoc={html} title={label} className="block h-56 w-full" sandbox="" referrerPolicy="no-referrer" />;
}

export default function EmbeddingBanner({ providerId }) {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    if (!providerId) return undefined;
    let cancelled = false;
    fetch(`/api/embedding-banners?provider_id=${encodeURIComponent(providerId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setBanners(Array.isArray(data?.banners) ? data.banners : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  // Nothing configured, request failed, or still loading — the page looks exactly as it does today.
  if (banners.length === 0) return null;

  return (
    <>
      {banners.map((banner) => {
        const media = <BannerMedia banner={banner} />;
        return (
          <Card key={banner.id} padding="none" className="w-full min-w-0 overflow-hidden">
            {banner.href && banner.mediaKind === "image" ? (
              <a href={banner.href} target="_blank" rel="noopener noreferrer" className="block">
                {media}
              </a>
            ) : (
              media
            )}
            {/* An anchor wrapping an iframe never receives the click — link separately instead. */}
            {banner.href && banner.mediaKind !== "image" ? (
              <a
                href={banner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border-t border-border-subtle px-3 py-2 text-xs text-text-muted hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                {banner.displayName || "Learn more"}
              </a>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
