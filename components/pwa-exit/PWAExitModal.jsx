"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PWAExitModal() {
  const [show, setShow] = useState(false);
  const showRef = useRef(false);
  const deafRef = useRef(null);

  // Swallow every click/touch for 500ms at capture phase
  const blockClicks = () => {
    const absorb = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener("click", absorb, true);
    window.addEventListener("touchend", absorb, true);
    window.addEventListener("touchstart", absorb, true);
    deafRef.current = setTimeout(() => {
      window.removeEventListener("click", absorb, true);
      window.removeEventListener("touchend", absorb, true);
      window.removeEventListener("touchstart", absorb, true);
    }, 500);
  };

  const openModal = () => {
    blockClicks(); // arm the deaf window FIRST
    showRef.current = true;
    setShow(true);
  };

  const closeModal = () => {
    showRef.current = false;
    setShow(false);
  };

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (!isPWA) return;

    const currentState = window.history.state || {};
    window.history.replaceState({ ...currentState, __pwaGuard: true }, "");
    window.history.pushState({ ...currentState, __pwaActive: true }, "");

    const handlePopState = (e) => {
      // If we popped down to our guard entry
      if (e.state && e.state.__pwaGuard === true) {
        if (showRef.current) {
          // Modal is already open, and user pressed back again.
          // Let's go back one more time to go past the guard and exit natively.
          e.stopImmediatePropagation();
          window.history.back();
          return;
        }

        // Modal is not open. Stop Next.js and show modal.
        e.stopImmediatePropagation();
        openModal();
        // Trap them again
        const currentState = window.history.state || {};
        window.history.pushState({ ...currentState, __pwaActive: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState, true);
    return () => window.removeEventListener("popstate", handlePopState, true);
  }, []);

  const cancelExit = () => closeModal();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-border text-center">
        <h2 className="text-xl font-bold mb-2 text-foreground">Exit Tune Flow?</h2>
        <p className="text-muted-foreground mb-6">
          Press the back button again to exit.
        </p>
        <div className="flex justify-center">
          <Button variant="outline" className="w-full max-w-[200px]" onClick={cancelExit}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
