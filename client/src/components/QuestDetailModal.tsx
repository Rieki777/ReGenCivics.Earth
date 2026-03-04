import { X, ExternalLink, CheckCircle2, Clock, Coins, Vote, Sparkles, ArrowRight, PlayCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestStep {
  step: number;
  title: string;
  description: string;
}

interface QuestDetails {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  rewards: { regen: number; rvoice: number };
  deliverable: string;
  estimatedTime: string;
  steps: QuestStep[];
  resources?: { title: string; url: string }[];
  tips?: string[];
  videoUrl?: string; // YouTube video URL for the quest tutorial
}

interface QuestDetailModalProps {
  quest: QuestDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

// Quest details database
export const questDetailsData: Record<string, QuestDetails> = {
  "quest-0": {
    id: "quest-0",
    title: "Quest 0: Fire",
    subtitle: "Transforming Passion into Purpose",
    description: "Discover and articulate what truly lights you up. This foundational quest helps you connect with your inner fire and understand what drives you to create positive change in the world.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A video/article sharing your fire and passion",
    estimatedTime: "2-4 hours",
    videoUrl: "https://www.youtube.com/watch?v=U5ZTTy0SCaA",
    steps: [
      { step: 1, title: "Reflect", description: "Spend time in quiet reflection. What issues, causes, or activities make you feel most alive? What would you do even if you weren't paid?" },
      { step: 2, title: "Journal", description: "Write freely about your passions, dreams, and what you want to contribute to the world. Don't edit yourself." },
      { step: 3, title: "Identify Themes", description: "Look for patterns in your reflections. What themes emerge? What connects your various interests?" },
      { step: 4, title: "Create Your Story", description: "Craft a compelling narrative about your fire. This could be a 3-minute video or a written article." },
      { step: 5, title: "Share & Submit", description: "Share your creation with the community and submit for review." }
    ],
    resources: [
      { title: "Watch Intro Video", url: "https://www.youtube.com/watch?v=U5ZTTy0SCaA" },
      { title: "SEEDS Quest Guide", url: "https://explore.joinseeds.earth/regen-civics-infinite-game/play-the-game/quest" }
    ],
    tips: [
      "Be authentic - there's no right or wrong answer",
      "Consider recording multiple takes and choosing your favorite",
      "Share from the heart, not just the head"
    ]
  },
  "quest-1": {
    id: "quest-1",
    title: "Quest 1: Potions",
    subtitle: "Healing Modalities",
    description: "Make a healing potion to connect your gut to the ancient wisdom of your bioregion and home.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A 'Showcasing my Potions' video/article",
    estimatedTime: "3-5 hours",
    videoUrl: "https://www.youtube.com/watch?v=pbhGgg2GZUM",
    steps: [
      { step: 1, title: "Make Your Potion", description: "Follow along with the video to make your potion!" },
      { step: 2, title: "Select Your Potions", description: "Select 1-3 potions you want to showcase." },
      { step: 3, title: "Document Your Practice", description: "Create content showing how you prepared your potion." },
      { step: 4, title: "Share Your Creation", description: "Explain the benefits and how others might incorporate these practices. Any immediate effects, lesson, etc?" },
      { step: 5, title: "Submit Your Showcase", description: "Upload your video or article to your social medias and use your link to add to your proposal to our Game Space." }
    ],
    resources: [
      { title: "Watch Potions Tutorial Video", url: "https://www.youtube.com/watch?v=pbhGgg2GZUM" }
    ],
    tips: [
      "Focus on what you actually practice, not just theory",
      "Include practical tips others can use",
      "Share both the process and the results"
    ]
  },
  "quest-2": {
    id: "quest-2",
    title: "Quest 2: Seeds",
    subtitle: "Planting Abundance",
    description: "Connect with the power of seeds - both literal and metaphorical. This quest explores how small beginnings can create massive positive change.",
    rewards: { regen: 22, rvoice: 1 },
    deliverable: "Adding seeds to swap in your LocalScale profile",
    estimatedTime: "1-2 hours",
    steps: [
      { step: 1, title: "Gather Your Seeds", description: "Collect seeds from plants you've grown, traded, or purchased. Consider heirloom and open-pollinated varieties." },
      { step: 2, title: "Document Your Collection", description: "Take photos and note the variety, source, and any growing tips for each seed type." },
      { step: 3, title: "Create Your Profile", description: "Set up or update your LocalScale profile with your seed offerings." },
      { step: 4, title: "List for Swap", description: "Add your seeds to the swap marketplace with clear descriptions." },
      { step: 5, title: "Connect & Trade", description: "Reach out to other seed savers and arrange swaps." }
    ],
    resources: [
      { title: "LocalScale Platform", url: "https://localscale.org" }
    ],
    tips: [
      "Include growing zone information",
      "Share stories about where seeds came from",
      "Consider offering seed saving workshops"
    ]
  },
  "quest-3": {
    id: "quest-3",
    title: "Quest 3: Healing Whole",
    subtitle: "Holistic Wellness",
    description: "This quest is all about creating spaces of deep healing in our Earth. Where a 'seed of abundance' will sprout forth from.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "Showcasing my Healing Whole video/article",
    estimatedTime: "3-5 hours",
    steps: [
      { step: 1, title: "Details Coming Soon", description: "We're working on detailed step-by-step instructions for this quest. Check back soon or join our community sessions to learn more!" }
    ],
    tips: [
      "Be vulnerable and authentic",
      "Include both challenges and breakthroughs",
      "Invite others to share their experiences"
    ]
  },
  "food-foresting": {
    id: "food-foresting",
    title: "Food Foresting: Being Human Again",
    subtitle: "Turning Earth into a Food Forest",
    description: "Go out with your friends and family and plant seeds for fruit trees in public spaces, parks, forests, and anywhere nature can thrive. This quest is all about turning our planet into a food forest where hunger is no longer relevant.",
    rewards: { regen: 33, rvoice: 1 },
    deliverable: "A <3 min video and/or written article",
    estimatedTime: "2-4 hours",
    steps: [
      { step: 1, title: "Gather Your Crew", description: "Invite friends, family, or community members to join you on this adventure." },
      { step: 2, title: "Source Your Seeds/Seedlings", description: "Collect fruit tree seeds or small seedlings. Consider native species and what grows well in your area." },
      { step: 3, title: "Scout Locations", description: "Find suitable public spaces, parks, or forest edges where trees can thrive without being disturbed." },
      { step: 4, title: "Plant with Intention", description: "Plant your seeds/seedlings with care. Consider soil conditions, water access, and sunlight." },
      { step: 5, title: "Document & Share", description: "Record your adventure - what you planted, where, and the joy of being human again." },
      { step: 6, title: "Submit Your Story", description: "Share your video/article with the community. Include what you learned and insights gained." }
    ],
    tips: [
      "This quest can be done infinite times!",
      "Choose species that will thrive without maintenance",
      "Make it a celebration - bring snacks, music, joy",
      "Mark locations so you can return and check on your trees"
    ]
  }
};

export function QuestDetailModal({ quest, isOpen, onClose }: QuestDetailModalProps) {
  if (!isOpen || !quest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a472a] via-[#2e7d32] to-[#4a7c59] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="pr-10">
            <p className="text-[#7dd87d] text-sm font-medium mb-1">{quest.subtitle}</p>
            <h2 className="text-2xl font-bold mb-2">{quest.title}</h2>
            <p className="text-white/80 text-sm">{quest.description}</p>
          </div>

          {/* Rewards & Time */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Coins className="w-4 h-4 text-[#7dd87d]" />
              <span>+{quest.rewards.regen} $Regen</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Vote className="w-4 h-4 text-[#7dd87d]" />
              <span>+{quest.rewards.rvoice} RVoice</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>{quest.estimatedTime}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {/* Video Embed for Quest 0 */}
          {quest.id === "quest-0" && (
            <div className="mb-6">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/pbhGgg2GZUM"
                  title="Quest 0: Fire - Introduction Video"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-center text-gray-500 mt-2">Watch the introduction video to understand this quest</p>
            </div>
          )}

          {/* Video Embed for Quest 1 - Potions */}
          {quest.id === "quest-1" && (
            <div className="mb-6">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/pbhGgg2GZUM?si=A-H9B9lRjX8m_mrg"
                  title="Quest 1: Potions - Tutorial Video"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a 
                href="https://youtu.be/pbhGgg2GZUM?si=A-H9B9lRjX8m_mrg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-center text-[#4a7c59] hover:text-[#2e7d32] mt-2 block underline"
              >
                Watch on YouTube
              </a>
            </div>
          )}
          {/* Steps */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#1a472a] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#4a7c59]" />
              Step-by-Step Guide
            </h3>
            <div className="space-y-4">
              {quest.steps.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center text-[#4a7c59] font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1a472a]">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverable */}
          <div className="mb-6 p-4 bg-[#f0ebe3] rounded-xl">
            <h3 className="font-bold text-[#1a472a] mb-2">📦 Deliverable</h3>
            <p className="text-sm text-[#1a472a]/80">{quest.deliverable}</p>
          </div>

          {/* Tips */}
          {quest.tips && quest.tips.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                Pro Tips
              </h3>
              <ul className="space-y-2">
                {quest.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowRight className="w-4 h-4 text-[#4a7c59] flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resources */}
          {quest.resources && quest.resources.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a472a] mb-3">🔗 Resources</h3>
              <div className="flex flex-wrap gap-2">
                {quest.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#4a7c59]/10 hover:bg-[#4a7c59]/20 rounded-lg text-sm text-[#4a7c59] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {resource.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Video Reminder - UPDATE VIDEO_URL BELOW WHEN READY */}
          {(() => {
            // ╔════════════════════════════════════════════════════════════════╗
            // ║  🎬 VIDEO TUTORIAL LINK - UPDATE THIS WHEN READY!              ║
            // ║  Replace the empty string below with your YouTube video URL    ║
            // ║  Example: "https://youtu.be/pbhGgg2GZUM"                       ║
            // ╚════════════════════════════════════════════════════════════════╝
            const VIDEO_URL = ""; // <-- ADD YOUR VIDEO URL HERE
            
            return VIDEO_URL ? (
              <a
                href={VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl block hover:bg-green-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800 text-sm">Watch: How to Apply for Your Tokens</h4>
                    <p className="text-xs text-green-700 mt-1">Click to watch the tutorial video on submitting your quest and earning tokens!</p>
                  </div>
                </div>
              </a>
            ) : (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 text-sm">Watch: How to Apply for Your Tokens</h4>
                    <p className="text-xs text-amber-700 mt-1">Video coming soon - check back for instructions on submitting your quest and earning tokens!</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Submit Quest Link */}
          <div className="p-4 bg-gradient-to-r from-[#4a7c59]/10 to-[#2e7d32]/10 rounded-xl border border-[#4a7c59]/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-[#1a472a] text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Ready to Submit?
                </h4>
                <p className="text-xs text-[#1a472a]/70 mt-1">Submit your completed quest in the Game Space to earn tokens</p>
              </div>
              <a
                href="https://app.hypha.earth/en/dho/regen-games/agreements"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#4a7c59] hover:bg-[#3d6b4a] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Go to Game Space
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="order-3 sm:order-1"
          >
            Close
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            {/* Start Quest Button - Links to video, disabled if no video */}
            <Button
              variant="outline"
              className={`border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10 ${!quest.videoUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (quest.videoUrl) {
                  window.open(quest.videoUrl, '_blank');
                }
              }}
              disabled={!quest.videoUrl}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              {quest.videoUrl ? 'Start this Quest' : 'Video Coming Soon'}
            </Button>
            {/* Finish Quest Button - Links to Hypha contribution page */}
            <Button
              className="bg-gradient-to-r from-[#4a7c59] to-[#2e7d32] hover:from-[#3d6b4a] hover:to-[#256b29] text-white"
              onClick={() => {
                window.open('https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution', '_blank');
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Finish this Quest
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
