"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

const InstallPWAButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isBannerDismissed, setIsBannerDismissed] = useState(false);

    useEffect(() => {
        setIsClient(true);
        
        // Read dismissed state from localStorage
        const dismissed = localStorage.getItem("pwa_banner_dismissed");
        if (dismissed === "true") {
            setIsBannerDismissed(true);
        }

        const checkInstalled = () => {
            if (typeof window !== 'undefined' && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true)) {
                setIsInstalled(true);
            }
        };

        const checkIOS = () => {
            if (typeof window !== 'undefined') {
                const userAgent = window.navigator.userAgent.toLowerCase();
                setIsIOS(/iphone|ipad|ipod/.test(userAgent) && !window.MSStream);
            }
        };

        checkInstalled();
        checkIOS();

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault(); // prevent auto prompt
            setDeferredPrompt(e);
        };
        
        if (typeof window !== 'undefined') {
            window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

            const handleAppInstalled = () => {
                setIsInstalled(true);
                setDeferredPrompt(null);
            };
            window.addEventListener("appinstalled", handleAppInstalled);

            return () => {
                window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
                window.removeEventListener("appinstalled", handleAppInstalled);
            };
        }
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            console.log("User choice:", choiceResult.outcome);
            if (choiceResult.outcome === "accepted") {
                setDeferredPrompt(null);
            }
        }
    };

    const handleDismiss = () => {
        setIsBannerDismissed(true);
        localStorage.setItem("pwa_banner_dismissed", "true");
    };

    if (!isClient || isInstalled) return null;
    if (!deferredPrompt && !isIOS) return null; // Wait for prompt or iOS detection

    return (
        <>
            {/* Top Banner State */}
            {!isBannerDismissed && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-3 sm:p-4 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                            <span className="text-xl font-bold text-primary">T</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm sm:text-base truncate">TuneFlow Music</span>
                            <span className="text-xs sm:text-sm text-muted-foreground truncate">
                                {isIOS ? "Tap Share → Add to Home Screen" : "Listen offline, no browser needed"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {deferredPrompt && (
                            <Button size="sm" onClick={handleInstall} className="rounded-full px-4 font-semibold shadow-md">
                                Install
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full shrink-0">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Bottom Pill Chip State */}
            {isBannerDismissed && deferredPrompt && (
                <div className="fixed bottom-[100px] md:bottom-28 right-4 z-50 animate-in fade-in zoom-in-95 duration-300">
                    <Button 
                        onClick={handleInstall}
                        size="sm"
                        className="rounded-full shadow-lg border border-primary/20 bg-card hover:bg-card/90 text-foreground flex items-center gap-2 px-4 py-5"
                    >
                        <Download className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Install App</span>
                    </Button>
                </div>
            )}
        </>
    );
};

export default InstallPWAButton;