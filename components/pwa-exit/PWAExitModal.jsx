"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PWAExitModal() {
  const [show, setShow] = useState(false);
  const showRef = useRef(false);
  const isExitingRef = useRef(false);
  // During the deaf window we block ALL clicks at window-capture level so
  // the ghost click from the hardware back button cannot reach any element.
  const deafRef = useRef(null);

  // Swallow every click/touch for 500ms at capture phase
  const blockClicks = () => {
    const absorb = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener('click',      absorb, true);
    window.addEventListener('touchend',   absorb, true);
    window.addEventListener('touchstart', absorb, true);
    deafRef.current = setTimeout(() => {
      window.removeEventListener('click',      absorb, true);
      window.removeEventListener('touchend',   absorb, true);
      window.removeEventListener('touchstart', absorb, true);
    }, 500);
  };

  const openModal = () => {
    blockClicks();          // arm the deaf window FIRST
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

    // Replace the very first history entry with our guard marker (no URL
    // change so Next.js won't attempt a client-side navigation), then push
    // a clean "active" entry on top. All subsequent app navigations stack
    // above these two entries.
    window.history.replaceState({ __pwaGuard: true }, "");
    window.history.pushState({ __pwaActive: true }, "");

    const handlePopState = (e) => {
      if (isExitingRef.current) return;

      // --- Case 1: back was pressed while the modal is already visible ---
      // User is trying to "back out" of the modal; they want to force exit.
      if (showRef.current) {
        e.stopImmediatePropagation();
        confirmExit();
        return;
      }

      // --- Case 2: user reached our guard entry → show modal ---
      if (e.state && e.state.__pwaGuard === true) {
        // Capture the event so Next.js router never sees it; otherwise it would
        // attempt a navigation and the resulting re-render resets React state,
        // making the modal flash and disappear.
        e.stopImmediatePropagation();
        openModal();
        // Re-push the active entry so the user is trapped above the guard
        window.history.pushState({ __pwaActive: true }, "");
      }
    };

    // IMPORTANT: capture:true ensures we run BEFORE Next.js's bubble-phase
    // listener, so stopImmediatePropagation() actually blocks Next.js.
    window.addEventListener("popstate", handlePopState, true);
    return () => window.removeEventListener("popstate", handlePopState, true);
  }, []);

  const confirmExit = () => {
    isExitingRef.current = true;
    closeModal();
    
    // Attempt standard window close (works in some PWA environments)
    try {
      window.close();
    } catch (err) {}

    // Fallback: forcefully navigate back past our guard state to trigger OS exit
    setTimeout(() => {
      window.history.go(-2);
    }, 100);
  };

  const cancelExit = () => closeModal();

  if (!show) return null;

  return (
    // No tap-outside-to-cancel: only the explicit buttons should act
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-border">
        <h2 className="text-xl font-bold mb-2 text-foreground">Exit App?</h2>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to close Tune Flow?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={cancelExit}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmExit}>
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
