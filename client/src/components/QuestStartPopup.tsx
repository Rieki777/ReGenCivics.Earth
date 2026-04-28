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
      <div className="relative bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] border border-[#7dd87d]/30 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 flex items-center justify-center">
            <Star className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <div>
            <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wide">Welcome Aboard</p>
            <h2 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              Your Quests Are Ready
            </h2>
          </div>
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-4">
          You have 10 Welcome Aboard Quests waiting for you. Complete them to earn 330 $ReGen + 1 RGVoice and place your first Claim in the ReGen Game.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5 space-y-1.5">
          {["Share your experience and give feedback", "Write your origin story", "Do a regenerative act", "Connect with your bioregion"].map((q) => (
            <div key={q} className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7dd87d]/60 flex-shrink-0" />
              {q}
            </div>
          ))}
          <div className="text-xs text-white/60 pl-3.5">+ 6 more quests...</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={goToQuests}
            className="flex-1 flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Start Questing
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white/80 transition-colors"
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
