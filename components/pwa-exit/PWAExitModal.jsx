"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PWAExitModal() {
  const [show, setShow] = useState(false);
  // Ref mirrors state so the event handler (closed over on mount) always sees
  // the latest value without needing to re-register.
  const showRef = useRef(false);
  // Blocks backdrop/button clicks for a short window after the modal opens,
  // preventing the ghost-click from the hardware back button from instantly
  // dismissing the modal.
  const readyRef = useRef(false);
  const readyTimer = useRef(null);

  const openModal = () => {
    showRef.current = true;
    readyRef.current = false;
    setShow(true);
    // Allow interactions only after 400 ms — enough to swallow the ghost click
    // that the OS fires alongside the hardware back-button press.
    clearTimeout(readyTimer.current);
    readyTimer.current = setTimeout(() => { readyRef.current = true; }, 400);
  };

  const closeModal = () => {
    if (!readyRef.current) return; // still in the deaf window
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
      // --- Case 1: back was pressed while the modal is already visible ---
      // User is trying to "back out" of the modal; keep it open and re-trap.
      if (showRef.current) {
        // Stop Next.js from reacting to this pop
        e.stopImmediatePropagation();
        window.history.pushState({ __pwaActive: true }, "");
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
    closeModal();
    // window.close() works in most Android/iOS PWA contexts
    window.close();
    // Fallback: go all the way back past the guard so the OS closes the view
    setTimeout(() => {
      window.history.go(-(window.history.length));
    }, 150);
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
