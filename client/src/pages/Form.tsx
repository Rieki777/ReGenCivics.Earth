/**
 * Form Page - Tripetto Form Embed
 * Design: Enchanted Forest theme with animated background
 * Color: Deep forest greens (#1a472a, #4a7c59) with bright accents (#7dd87d)
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ArrowLeft, Leaf } from "lucide-react";
import { BackButton } from "@/components/BackButton";

// Floating leaf animation component
function FloatingLeaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
        <radialGradient id="formGlow" cx="50%" cy="50%" r="50%">
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
          fill="url(#formGlow)"
        />
      ))}
    </svg>
  );
}

export default function Form() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Load Tripetto scripts dynamically
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    const initTripetto = async () => {
      try {
        // Load scripts in order
        await loadScript('https://cdn.jsdelivr.net/npm/@tripetto/runner');
        await loadScript('https://cdn.jsdelivr.net/npm/@tripetto/runner-autoscroll');
        await loadScript('https://cdn.jsdelivr.net/npm/@tripetto/studio');
        
        // Initialize Tripetto form
        // @ts-ignore - Tripetto is loaded dynamically
        if (window.TripettoStudio && window.TripettoAutoscroll) {
          // @ts-ignore
          window.TripettoStudio.form({
            // @ts-ignore
            runner: window.TripettoAutoscroll,
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiSWxkM1NOZGdScWkzR2ZpZzZldDc0Z3VKTXlmZUJnTDg4M2Fra3Z0djJWRT0iLCJkZWZpbml0aW9uIjoiWEZWWk15M0NTcWZPWitTcEJyanJnazFCU2kra3hwMy9OcXBSUlVaSU9UVT0iLCJ0eXBlIjoiY29sbGVjdCJ9.ChXxMMZkwXSv6ecGhmDGiabcJ9Jw66-4dKFJ3khbCNQ",
            element: "tripetto-4q5x6c",
            onFinish: () => {
              // Redirect to socials page after form completion
              setLocation('/socials');
            }
          });
        }
      } catch (error) {
        console.error('Error loading Tripetto:', error);
      }
    };

    initTripetto();

    // Cleanup function
    return () => {
      // Remove the Tripetto container content on unmount
      const container = document.getElementById('tripetto-4q5x6c');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] relative overflow-hidden">
      <BackButton />
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
        <div className="container mx-auto px-4">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div 
              className="inline-block px-5 py-2 mb-4 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              🌱 Join the ReGenerative Renaissance
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold text-white mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Stay <span className="text-[#7dd87d]">Connected</span>
            </h1>
            <p className="text-white/70 max-w-xl mx-auto">
              Sign up to receive bespoke updates on new seasons, co-creation opportunities, and the growing regenerative movement (depending on what you express interest in).
            </p>
          </div>

          {/* Tripetto Form Container */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border-2 border-[#7dd87d]/30 p-6 md:p-8 shadow-2xl">
              <div 
                id="tripetto-4q5x6c" 
                className="min-h-[400px] flex items-center justify-center"
              >
                {/* Loading state */}
                <div className="text-center text-white/60">
                  <div className="w-10 h-10 border-2 border-[#7dd87d]/30 border-t-[#7dd87d] rounded-full animate-spin mx-auto mb-4" />
                  <p>Loading form...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="text-center mt-8">
            <p className="text-white/50 text-sm">
              🔒 Your information is secure and will never be shared.
            </p>
            <p className="text-white/40 text-xs mt-2">
              By submitting, you agree to receive communications from ReGen Civics Alliance.
            </p>
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
