"use client";

import { useState, useEffect } from "react";
import { PillButton } from "./PillButton";

const STORAGE_KEY = "regen-gov-welcome-seen";

export function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [fadeStage, setFadeStage] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const timers = [1, 2, 3, 4, 5].map((i) =>
      setTimeout(() => setFadeStage(i), i * 400)
    );
    return () => timers.forEach(clearTimeout);
  }, [show]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  const p = (stage: number, children: React.ReactNode) => (
    <p className={`transition-opacity duration-500 ${fadeStage >= stage ? "opacity-100" : "opacity-0"}`}>
      {children}
    </p>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[20px] px-4">
      <div className="w-full max-w-[520px] text-center space-y-5">
        {/* Logo */}
        <div className={`transition-opacity duration-500 ${fadeStage >= 1 ? "opacity-100" : "opacity-0"}`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a472a] border border-[#7dd87d]/30 flex items-center justify-center">
            <span className="text-[#7dd87d] text-2xl font-bold">RG</span>
          </div>
        </div>

        <h1 className={`text-3xl font-bold text-white transition-opacity duration-500 ${fadeStage >= 1 ? "opacity-100" : "opacity-0"}`} style={{ fontFamily: "var(--font-display, system-ui)" }}>
          Welcome to your Passport
        </h1>

        <div className="space-y-4 text-white/80 text-base leading-relaxed">
          {p(2, "This is your command center for coordinating the Regenerative Renaissance.")}
          {p(3, "Built on wisdom from movements before us, blended with the best in decentralized governance, regenerative economics, and game design.")}
          {p(4, "Interoperable with Hypha for secure on-chain governance on Base blockchain, and with LocalScale for bioregional food-backed economic systems.")}
          {p(5, "This dashboard is governed by you. Propose what we track. Vote on how it evolves.")}
        </div>

        <div className={`pt-4 transition-opacity duration-500 ${fadeStage >= 5 ? "opacity-100" : "opacity-0"}`}>
          <PillButton onClick={dismiss}>
            Open My Passport
          </PillButton>
        </div>
      </div>
    </div>
  );
}
