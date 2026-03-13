/**
 * TaoSpinner - Seed of Life spinner with randomized Tao Te Ching quotes
 * Used as the global loading/transition state across all pages
 */
import { useState, useEffect } from "react";
import { SeedOfLifeSpinner } from "./SeedOfLifeSpinner";

// Curated Tao Te Ching quotes relevant to regeneration, nature, and growth
const taoQuotes = [
  // Tao Te Ching
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
  { text: "Act without expectation. Lead without controlling. Achieve without forcing.", chapter: 81 },
  { text: "The Tao that can be told is not the eternal Tao.", chapter: 1 },
  { text: "Returning is the motion of the Tao. Yielding is the way of the Tao.", chapter: 40 },
  { text: "To the mind that is still, the whole universe surrenders.", chapter: 16 },
  { text: "He who knows that enough is enough will always have enough.", chapter: 46 },
  { text: "From caring comes courage.", chapter: 67 },
  { text: "The usefulness of a pot comes from its emptiness.", chapter: 11 },
  { text: "Respond intelligently even to unintelligent treatment.", chapter: 63 },
  { text: "Health is the greatest possession. Contentment is the greatest treasure. Confidence is the greatest friend.", chapter: 44 },
  { text: "Do the difficult things while they are easy. Do the great things while they are small.", chapter: 63 },
  { text: "The Tao nourishes without striving. It accomplishes without competing.", chapter: 81 },
  // Rumi
  { text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.", chapter: 0 },
  { text: "The wound is the place where the light enters you.", chapter: 0 },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", chapter: 0 },
  { text: "Let the beauty of what you love be what you do.", chapter: 0 },
  { text: "The quieter you become, the more you are able to hear.", chapter: 0 },
  { text: "Wherever you are, and whatever you do, be in love.", chapter: 0 },
  // Robin Wall Kimmerer / Indigenous wisdom
  { text: "The earth does not belong to us — we belong to the earth.", chapter: 0 },
  { text: "Abundance is a consequence of gratitude.", chapter: 0 },
  { text: "In some Native languages the land is alive and breathing, for the simple reason that it is.", chapter: 0 },
  { text: "What would it mean to be native to a place, to belong to it the way the trees belong to the forest floor?", chapter: 0 },
  { text: "We are showered every day with gifts, but they are not free. The only appropriate response is gratitude.", chapter: 0 },
  { text: "All flourishing is mutual.", chapter: 0 },
  // Thich Nhat Hanh
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", chapter: 0 },
  { text: "The most precious gift we can offer anyone is our attention.", chapter: 0 },
  { text: "We are here to awaken from the illusion of our separateness.", chapter: 0 },
  { text: "The earth knows how to heal itself. The question is whether we will give it the chance.", chapter: 0 },
  { text: "When you plant lettuce, if it does not grow well, you do not blame the lettuce. You look for the reason.", chapter: 0 },
  // Joanna Macy
  { text: "The most radical thing any of us can do at this time in history is to be fully present to what is happening in the world.", chapter: 0 },
  { text: "To be alive in this beautiful, self-organizing universe — to notice this — is the biggest gift of all.", chapter: 0 },
  { text: "Don't be afraid of the darkness. It is not the absence of light — it is the womb of what is to come.", chapter: 0 },
  // African and Andean proverbs
  { text: "A person is a person through other persons.", chapter: 0 },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", chapter: 0 },
  { text: "The land is a mirror. What we give, it reflects back.", chapter: 0 },
  { text: "We do not inherit the earth from our ancestors; we borrow it from our children.", chapter: 0 },
  // Celtic / Earth-based
  { text: "A seed knows it will become a tree — even though it has never seen one.", chapter: 0 },
  { text: "The forest answers the question you bring to it.", chapter: 0 },
  { text: "In every walk with nature, one receives far more than they seek.", chapter: 0 },
  // Hopi and other Indigenous
  { text: "We are the ones we have been waiting for.", chapter: 0 },
  { text: "We do not walk alone. Great Being walks beside us.", chapter: 0 },
  // Others aligned with regeneration
  { text: "There is enough for everyone's need, but not for everyone's greed.", chapter: 0 },
  { text: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.", chapter: 0 },
  { text: "It always seems impossible until it's done.", chapter: 0 },
  { text: "In the sweetness of friendship let there be laughter and sharing of pleasures.", chapter: 0 },
  { text: "There is a vitality, a life force, an energy, a quickening that is translated through you into action.", chapter: 0 },
  { text: "What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves.", chapter: 0 },
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
            Wise Sage
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
