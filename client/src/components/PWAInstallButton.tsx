import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

export function PWAInstallButton() {
  const { canInstall, install, isInstalled } = usePWAInstall();
  const [showTooltip, setShowTooltip] = useState(false);

  if (isInstalled) return null;

  // iOS Safari: no beforeinstallprompt support
  if (!canInstall && isIOSSafari()) {
    return (
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowTooltip((v) => !v)}
          onBlur={() => setShowTooltip(false)}
          className="text-white/60 hover:text-white transition-colors text-xs cursor-pointer"
        >
          Install App
        </button>
        {showTooltip && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1a472a] text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
            Tap Share then "Add to Home Screen"
          </span>
        )}
      </span>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={install}
      className="text-white/60 hover:text-white transition-colors text-xs cursor-pointer"
    >
      Install App
    </button>
  );
}
