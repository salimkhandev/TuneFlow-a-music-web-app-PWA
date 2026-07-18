"use client";

import { useEffect } from "react";

// PWA back-button handler — immediately exits without a confirmation modal.
// On first back press it pops the guard entry, which triggers native PWA exit.
export default function PWAExitModal() {
  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (!isPWA) return;

    const currentState = window.history.state || {};
    window.history.replaceState({ ...currentState, __pwaGuard: true }, "");
    window.history.pushState({ ...currentState, __pwaActive: true }, "");

    const handlePopState = (e) => {
      if (e.state && e.state.__pwaGuard === true) {
        // Back pressed at the guard — go one more step back to exit natively
        e.stopImmediatePropagation();
        window.history.back();
      }
    };

    window.addEventListener("popstate", handlePopState, true);
    return () => window.removeEventListener("popstate", handlePopState, true);
  }, []);

  // No modal rendered — confirmation removed
  return null;
}
