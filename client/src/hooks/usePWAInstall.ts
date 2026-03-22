import { useEffect, useRef, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches);

    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setCanInstall(false);
        deferredPrompt.current = null;
      }
    };
    mq.addEventListener("change", handleDisplayChange);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      mq.removeEventListener("change", handleDisplayChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setIsInstalled(true);
    }
    deferredPrompt.current = null;
  }, []);

  return { canInstall, install, isInstalled };
}
