/**
 * TaoSpinner - Seed of Life spinner with randomized Tao Te Ching quotes
 * Used as the global loading/transition state across all pages
 */
import { useState, useEffect } from "react";
import { SeedOfLifeSpinner } from "./SeedOfLifeSpinner";

// Curated Tao Te Ching quotes relevant to regeneration, nature, and growth
const taoQuotes = [
  { text: "Nature does not hurry, yet everything is accomplished.", chapter: 15 },
  { text: "A journey of a thousand miles begins with a single step.", chapter: 64 },
  { text: "The soft overcomes the hard. The slow overcomes the fast.", chapter: 36 },
  { text: "When I let go of what I am, I become what I might be.", chapter: 22 },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", chapter: 64 },
  { text: "Be content with what you have; rejoice in the way things are.", chapter: 44 },
  { text: "Water is the softest thing, yet it can penetrate mountains and earth.", chapter: 78 },
  { text: "The wise person acts without effort and teaches without words.", chapter: 2 },
  { text: "To lead people, walk behind them.", chapter: 66 },
  { text: "In dwelling, live close to the ground. In thinking, keep to the simple.", chapter: 8 },
  { text: "The whole world is a series of miracles, but we are so used to them we call them ordinary things.", chapter: 52 },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom.", chapter: 33 },
  { text: "Those who flow as life flows know they need no other force.", chapter: 32 },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", chapter: 67 },
  { text: "The seed of mystery lies in muddy water. How can I perceive this mystery? Water becomes clear through stillness.", chapter: 15 },
  { text: "Give evil nothing to oppose and it will disappear by itself.", chapter: 60 },
  { text: "New beginnings are often disguised as painful endings.", chapter: 74 },
  { text: "If you realize that all things change, there is nothing you will try to hold on to.", chapter: 74 },
  { text: "Life is a series of natural and spontaneous changes. Do not resist them.", chapter: 23 },
  { text: "The earth is a vessel so sacred that it cannot be improved.", chapter: 29 },
  { text: "All streams flow to the sea because it is lower than they are.", chapter: 66 },
  { text: "Care about what other people think and you will always be their prisoner.", chapter: 9 },
  { text: "The master observes the world but trusts their inner vision.", chapter: 12 },
  { text: "What the caterpillar calls the end, the rest of the world calls a butterfly.", chapter: 76 },
];

function getRandomQuote() {
  return taoQuotes[Math.floor(Math.random() * taoQuotes.length)];
}

interface TaoSpinnerProps {
  size?: number;
  className?: string;
  showQuote?: boolean;
  fullPage?: boolean;
}

export function TaoSpinner({ 
  size = 64, 
  className = "", 
  showQuote = true,
  fullPage = true 
}: TaoSpinnerProps) {
  const [quote, setQuote] = useState(getRandomQuote);
  const [fadeIn, setFadeIn] = useState(true);

  // Rotate quotes every 4 seconds with fade transition
  useEffect(() => {
    if (!showQuote) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuote(getRandomQuote());
        setFadeIn(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [showQuote]);

  const content = (
    <div className={`text-center ${className}`}>
      <SeedOfLifeSpinner size={size} className="text-[#7dd87d] mx-auto mb-5" />
      {showQuote && (
        <div className="max-w-sm mx-auto px-4">
          <p
            className={`text-white/80 text-sm italic leading-relaxed transition-opacity duration-300 ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            "{quote.text}"
          </p>
          <p
            className={`text-[#7dd87d]/50 text-xs mt-2 transition-opacity duration-300 ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Tao Te Ching
          </p>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        {content}
      </div>
    );
  }

  return content;
}

export default TaoSpinner;
