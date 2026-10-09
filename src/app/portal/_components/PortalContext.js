"use client";

import { createContext, useContext } from "react";

// The signed-in employee's /api/office/me payload plus a reload(), provided by PortalShell.
export const PortalContext = createContext({ me: null, reload: () => Promise.resolve() });

export function usePortal() {
  return useContext(PortalContext);
}
