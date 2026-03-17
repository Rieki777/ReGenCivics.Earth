/**
 * TaoSpinner - Seed of Life spinner with randomized Tao Te Ching quotes
 * Used as the global loading/transition state across all pages
 */
import { useState, useEffect } from "react";
import { SeedOfLifeSpinner } from "./SeedOfLifeSpinner";

// Curated quotes relevant to regeneration, nature, and growth
const taoQuotes = [
  // Tao Te Ching
  { text: "Nature does not hurry, yet everything is accomplished.", attribution: "Tao Te Ching, ch. 15" },
  { text: "A journey of a thousand miles begins with a single step.", attribution: "Tao Te Ching, ch. 64" },
  { text: "The soft overcomes the hard. The slow overcomes the fast.", attribution: "Tao Te Ching, ch. 36" },
  { text: "When I let go of what I am, I become what I might be.", attribution: "Tao Te Ching, ch. 22" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", attribution: "Tao Te Ching, ch. 64" },
  { text: "Be content with what you have; rejoice in the way things are.", attribution: "Tao Te Ching, ch. 44" },
  { text: "Water is the softest thing, yet it can penetrate mountains and earth.", attribution: "Tao Te Ching, ch. 78" },
  { text: "The wise person acts without effort and teaches without words.", attribution: "Tao Te Ching, ch. 2" },
  { text: "To lead people, walk behind them.", attribution: "Tao Te Ching, ch. 66" },
  { text: "In dwelling, live close to the ground. In thinking, keep to the simple.", attribution: "Tao Te Ching, ch. 8" },
  { text: "The whole world is a series of miracles, but we are so used to them we call them ordinary things.", attribution: "Tao Te Ching, ch. 52" },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom.", attribution: "Tao Te Ching, ch. 33" },
  { text: "Those who flow as life flows know they need no other force.", attribution: "Tao Te Ching, ch. 32" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", attribution: "Tao Te Ching, ch. 67" },
  { text: "The seed of mystery lies in muddy water. How can I perceive this mystery? Water becomes clear through stillness.", attribution: "Tao Te Ching, ch. 15" },
  { text: "Give evil nothing to oppose and it will disappear by itself.", attribution: "Tao Te Ching, ch. 60" },
  { text: "New beginnings are often disguised as painful endings.", attribution: "Tao Te Ching, ch. 74" },
  { text: "If you realize that all things change, there is nothing you will try to hold on to.", attribution: "Tao Te Ching, ch. 74" },
  { text: "Life is a series of natural and spontaneous changes. Do not resist them.", attribution: "Tao Te Ching, ch. 23" },
  { text: "The earth is a vessel so sacred that it cannot be improved.", attribution: "Tao Te Ching, ch. 29" },
  { text: "All streams flow to the sea because it is lower than they are.", attribution: "Tao Te Ching, ch. 66" },
  { text: "Care about what other people think and you will always be their prisoner.", attribution: "Tao Te Ching, ch. 9" },
  { text: "The master observes the world but trusts their inner vision.", attribution: "Tao Te Ching, ch. 12" },
  { text: "What the caterpillar calls the end, the rest of the world calls a butterfly.", attribution: "Tao Te Ching, ch. 76" },
  { text: "Act without expectation. Lead without controlling. Achieve without forcing.", attribution: "Tao Te Ching, ch. 81" },
  { text: "The Tao that can be told is not the eternal Tao.", attribution: "Tao Te Ching, ch. 1" },
  { text: "Returning is the motion of the Tao. Yielding is the way of the Tao.", attribution: "Tao Te Ching, ch. 40" },
  { text: "To the mind that is still, the whole universe surrenders.", attribution: "Tao Te Ching, ch. 16" },
  { text: "He who knows that enough is enough will always have enough.", attribution: "Tao Te Ching, ch. 46" },
  { text: "From caring comes courage.", attribution: "Tao Te Ching, ch. 67" },
  { text: "The usefulness of a pot comes from its emptiness.", attribution: "Tao Te Ching, ch. 11" },
  { text: "Respond intelligently even to unintelligent treatment.", attribution: "Tao Te Ching, ch. 63" },
  { text: "Health is the greatest possession. Contentment is the greatest treasure. Confidence is the greatest friend.", attribution: "Tao Te Ching, ch. 44" },
  { text: "Do the difficult things while they are easy. Do the great things while they are small.", attribution: "Tao Te Ching, ch. 63" },
  { text: "The Tao nourishes without striving. It accomplishes without competing.", attribution: "Tao Te Ching, ch. 81" },
  // Rumi
  { text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.", attribution: "Rumi" },
  { text: "The wound is the place where the light enters you.", attribution: "Rumi" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", attribution: "Rumi" },
  { text: "Let the beauty of what you love be what you do.", attribution: "Rumi" },
  { text: "The quieter you become, the more you are able to hear.", attribution: "Rumi" },
  { text: "Wherever you are, and whatever you do, be in love.", attribution: "Rumi" },
  // Robin Wall Kimmerer
  { text: "The earth does not belong to us. We belong to the earth.", attribution: "Robin Wall Kimmerer" },
  { text: "Abundance is a consequence of gratitude.", attribution: "Robin Wall Kimmerer" },
  { text: "In some Native languages the land is alive and breathing, for the simple reason that it is.", attribution: "Robin Wall Kimmerer" },
  { text: "What would it mean to be native to a place, to belong to it the way the trees belong to the forest floor?", attribution: "Robin Wall Kimmerer" },
  { text: "We are showered every day with gifts, but they are not free. The only appropriate response is gratitude.", attribution: "Robin Wall Kimmerer" },
  { text: "All flourishing is mutual.", attribution: "Robin Wall Kimmerer" },
  // Thich Nhat Hanh
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", attribution: "Thich Nhat Hanh" },
  { text: "The most precious gift we can offer anyone is our attention.", attribution: "Thich Nhat Hanh" },
  { text: "We are here to awaken from the illusion of our separateness.", attribution: "Thich Nhat Hanh" },
  { text: "The earth knows how to heal itself. The question is whether we will give it the chance.", attribution: "Thich Nhat Hanh" },
  { text: "When you plant lettuce, if it does not grow well, you do not blame the lettuce. You look for the reason.", attribution: "Thich Nhat Hanh" },
  // Joanna Macy
  { text: "The most radical thing any of us can do at this time in history is to be fully present to what is happening in the world.", attribution: "Joanna Macy" },
  { text: "To be alive in this beautiful, self-organizing universe, to notice this, is the biggest gift of all.", attribution: "Joanna Macy" },
  { text: "Don't be afraid of the darkness. It is not the absence of light. It is the womb of what is to come.", attribution: "Joanna Macy" },
  // African and Andean proverbs
  { text: "A person is a person through other persons.", attribution: "African proverb" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", attribution: "African proverb" },
  { text: "The land is a mirror. What we give, it reflects back.", attribution: "Andean proverb" },
  { text: "We do not inherit the earth from our ancestors; we borrow it from our children.", attribution: "Proverb" },
  // Celtic / Earth-based
  { text: "A seed knows it will become a tree, even though it has never seen one.", attribution: "Celtic wisdom" },
  { text: "The forest answers the question you bring to it.", attribution: "Celtic wisdom" },
  { text: "In every walk with nature, one receives far more than they seek.", attribution: "John Muir" },
  // Hopi and other Indigenous
  { text: "We are the ones we have been waiting for.", attribution: "Hopi wisdom" },
  { text: "We do not walk alone. Great Being walks beside us.", attribution: "Hopi wisdom" },
  // Others aligned with regeneration
  { text: "There is enough for everyone's need, but not for everyone's greed.", attribution: "Gandhi" },
  { text: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.", attribution: "Marcel Proust" },
  { text: "It always seems impossible until it's done.", attribution: "Nelson Mandela" },
  { text: "In the sweetness of friendship let there be laughter and sharing of pleasures.", attribution: "Kahlil Gibran" },
  { text: "There is a vitality, a life force, an energy, a quickening that is translated through you into action.", attribution: "Martha Graham" },
  { text: "What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves.", attribution: "Mahatma Gandhi" },
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

  // Rotate quotes every 5 seconds with fade transition
  useEffect(() => {
    if (!showQuote) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuote(getRandomQuote());
        setFadeIn(true);
      }, 300);
    }, 5000);
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
            {quote.attribution}
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
