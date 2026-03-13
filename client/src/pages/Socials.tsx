/**
 * Socials Page - Post-form submission landing page
 * Design: Enchanted Forest theme with social links
 * Color: Deep forest greens (#1a472a, #4a7c59) with bright accents (#7dd87d)
 */

import { Link } from "wouter";
import { ArrowLeft, Leaf, MessageCircle, Youtube, Users, ExternalLink, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";

// Floating leaf animation component
function FloatingLeaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <BackButton />
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${8 + Math.random() * 4}s`,
            opacity: 0.15 + Math.random() * 0.15,
          }}
        >
          <Leaf 
            className="text-[#7dd87d]" 
            style={{ 
              width: `${20 + Math.random() * 30}px`,
              height: `${20 + Math.random() * 30}px`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }} 
          />
        </div>
      ))}
    </div>
  );
}

// Mycelium network background
function MyceliumBackground() {
  return (
    <svg 
      className="absolute inset-0 w-full h-full opacity-10"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="socialsGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7dd87d" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7dd87d" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Mycelium network lines */}
      <g stroke="#7dd87d" strokeWidth="1" fill="none" opacity="0.5">
        <path d="M100,500 Q300,300 500,500 T900,500" />
        <path d="M200,200 Q400,400 600,200 T1000,200" />
        <path d="M0,800 Q200,600 400,800 T800,800" />
        <path d="M300,100 Q500,300 700,100" />
        <path d="M150,600 Q350,400 550,600 T950,600" />
        <path d="M50,350 Q250,550 450,350 T850,350" />
      </g>
      
      {/* Glowing nodes */}
      {[...Array(15)].map((_, i) => (
        <circle
          key={i}
          cx={100 + (i * 60) % 800}
          cy={100 + Math.floor(i / 4) * 200 + (i % 3) * 50}
          r="8"
          fill="url(#socialsGlow)"
        />
      ))}
    </svg>
  );
}

const socialLinks = [
  {
    name: "WhatsApp Community",
    description: "Join our active community chat for real-time updates and discussions",
    icon: MessageCircle,
    url: "https://chat.whatsapp.com/KArQzEs0UQuLsGaLTvbp34",
    color: "#25D366",
    recommended: true,
  },
  {
    name: "Discord Server",
    description: "Connect with regenerators, ask questions, and find collaboration opportunities",
    icon: Users,
    url: "https://discord.gg/8aTzTxH3Qe",
    color: "#5865F2",
    recommended: true,
  },
  {
    name: "YouTube Channel",
    description: "Watch season recordings, project introductions, and educational content",
    icon: Youtube,
    url: "https://www.youtube.com/@SEEDSRegenerativeEconomies",
    color: "#FF0000",
    recommended: false,
  },
];

export default function Socials() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] relative overflow-hidden">
      <SEO {...pageSEO.socials} />
      
      {/* Background decorations */}
      <MyceliumBackground />
      <FloatingLeaves />
      
      {/* Glowing orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-[#7dd87d] blur-[120px] opacity-20" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-[#4a7c59] blur-[150px] opacity-25" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#7dd87d] blur-[200px] opacity-10" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a472a]/80 backdrop-blur-md border-b border-[#7dd87d]/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-[#7dd87d] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <img
              src="https://assets.regencivics.earth/MlOLFSvIBeiOvIFd.png"
              alt="ReGen Civics"
              className="w-8 h-8 object-contain"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span 
              className="text-white font-bold text-lg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ReGen Civics
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-16 min-h-screen flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#7dd87d]/20 border-2 border-[#7dd87d]/40 mb-6 animate-pulse">
              <Sparkles className="w-10 h-10 text-[#7dd87d]" />
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Welcome to the <span className="text-[#7dd87d]">ReGenerative Renaissance!</span>
            </h1>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              You're now part of our growing community. Here's the easiest way to get involved today and follow along with our journey.
            </p>
          </div>

          {/* Social Links */}
          <div className="space-y-4 mb-12">
            <h2 
              className="text-xl font-semibold text-white text-center mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Heart className="w-5 h-5 inline-block mr-2 text-[#7dd87d]" />
              Connect With Us
            </h2>
            
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border-2 border-[#7dd87d]/20 p-5 hover:border-[#7dd87d]/50 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${social.color}20` }}
                    >
                      <social.icon 
                        className="w-7 h-7" 
                        style={{ color: social.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-lg group-hover:text-[#7dd87d] transition-colors">
                          {social.name}
                        </h3>
                        {social.recommended && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        {social.description}
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-[#7dd87d] transition-colors shrink-0" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Additional Actions */}
          <div className="text-center space-y-4">
            <p className="text-white/50 text-sm">
              Want to dive deeper into the ReGenerative Renaissance?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/">
                <Button
                  variant="outline"
                  className="rounded-xl border-2 border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:border-[#7dd87d]/50"
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  Explore the Website
                </Button>
              </Link>
              <a 
                href="https://explore.joinseeds.earth/regen-civics-infinite-game/the-regenerative-renaissance"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="rounded-xl border-2 border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:border-[#7dd87d]/50"
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  Read Our Knowledge Base <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Custom CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
          }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
