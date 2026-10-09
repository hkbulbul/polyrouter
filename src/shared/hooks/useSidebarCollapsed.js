"use client";

import { useCallback, useSyncExternalStore } from "react";

// Desktop sidebar collapsed preference, persisted in localStorage under `storageKey`
// and synced across tabs. Falls back to in-memory state when storage is blocked.
const CHANGE_EVENT = "polyrouter:sidebar-collapsed-change";
const memory = new Map();

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function read(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === null ? memory.get(storageKey) === true : stored === "1";
  } catch {
    return memory.get(storageKey) === true;
  }
}

function write(storageKey, collapsed) {
  memory.set(storageKey, collapsed);
  try {
    localStorage.setItem(storageKey, collapsed ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** @returns {[boolean, () => void]} collapsed flag and a toggle */
export function useSidebarCollapsed(storageKey) {
  const collapsed = useSyncExternalStore(subscribe, () => read(storageKey), () => false);
  const toggle = useCallback(() => write(storageKey, !read(storageKey)), [storageKey]);
  return [collapsed, toggle];
}
