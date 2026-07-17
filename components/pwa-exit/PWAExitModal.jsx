"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PWAExitModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (!isPWA) return;

    // Replace the initial entry with a clearly marked guard, then push a clean
    // "active" entry on top. Navigation from Next.js / FullScreenPlayer always
    // pushes entries ABOVE this pair, so popping down to the guard means the
    // user has exhausted all real back-history and wants to leave the app.
    window.history.replaceState({ __pwaGuard: true }, "");
    window.history.pushState({ __pwaActive: true }, "");

    const handlePopState = (e) => {
      // Only trigger when we land exactly on our guard entry
      if (e.state && e.state.__pwaGuard === true) {
        setShow(true);
        // Re-push an active entry so the user stays trapped inside the app
        window.history.pushState({ __pwaActive: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const confirmExit = () => {
    setShow(false);
    // window.close() works in many Android PWA contexts
    window.close();
    // Fallback: go back all the way so the OS closes the activity
    setTimeout(() => {
      window.history.go(-(window.history.length));
    }, 150);
  };

  const cancelExit = () => setShow(false);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cancelExit} // tap outside = cancel
    >
      <div
        className="bg-card w-full max-w-sm rounded-xl p-6 shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()} // prevent click-through
      >
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
