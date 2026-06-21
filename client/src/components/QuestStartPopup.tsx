import { useEffect, useState } from "react";
import { X, Star, ArrowRight } from "lucide-react";

const FLAG_KEY = "hasSeenQuestPrompt";

interface QuestStartPopupProps {
  onNavigateToQuests: () => void;
}

export function QuestStartPopup({ onNavigateToQuests }: QuestStartPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(FLAG_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(FLAG_KEY, "true");
    setVisible(false);
  };

  const goToQuests = () => {
    dismiss();
    onNavigateToQuests();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] border border-[#7dd87d]/30 rounded-2xl shadow-2xl max-w-md w-full p-7">
        {/* Visible 44px tap target for dismiss. Moved to a real bordered
            chip so the affordance reads as a button, not a stray icon. */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white/85 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#7dd87d]/25 border border-[#7dd87d]/50 flex items-center justify-center shadow-[0_0_20px_rgba(125,216,125,0.25)]">
            <Star className="w-6 h-6 text-[#7dd87d]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#7dd87d] text-[11px] font-bold uppercase tracking-[0.18em]">Welcome Aboard</p>
            <h2 className="text-white font-bold text-xl leading-tight mt-0.5" style={{ fontFamily: "var(--font-display)" }}>
              Your Quests Are Ready
            </h2>
          </div>
        </div>

        <p className="text-white/85 text-sm leading-relaxed mb-5">
          Ten Welcome Aboard Quests are waiting for you. Complete them to earn 330 $ReGen + 1 RGVoice and place your first Claim in the ReGen Game.
        </p>

        <ul className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 space-y-2">
          {["Share your experience and give feedback", "Write your origin story", "Do a regenerative act", "Connect with your bioregion"].map((q) => (
            <li key={q} className="flex items-start gap-2.5 text-sm text-white/80">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7dd87d] flex-shrink-0" />
              <span className="leading-snug">{q}</span>
            </li>
          ))}
          <li className="text-xs text-white/60 pl-4">+ 6 more quests</li>
        </ul>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={goToQuests}
            className="flex-1 flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-5 py-3 rounded-xl text-sm transition-colors min-h-[48px]"
          >
            Start Questing
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-white/80 hover:text-white border border-white/15 hover:bg-white/10 transition-colors min-h-[48px]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

/** Call this once after a successful profile creation to trigger the popup on next render */
export function flagShowQuestPrompt() {
  localStorage.removeItem(FLAG_KEY);
}
