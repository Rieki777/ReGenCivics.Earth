/**
 * Socials Page - Post-form submission landing page
 * Design: Enchanted Forest theme with social links
 * Color: Deep forest greens (#1a472a, #4a7c59) with bright accents (#7dd87d)
 */

import { Link } from "wouter";
import { ArrowLeft, Leaf, MessageCircle, Youtube, Users, ExternalLink, Sparkles, Heart, Globe, Network } from "lucide-react";
import {
  WHATSAPP_COMMUNITY_URL,
  TELEGRAM_CHANNEL_URL,
  DISCORD_INVITE_URL,
  YOUTUBE_CHANNEL_URL,
  HYLO_SEEDS_URL,
  HOLOS_REGEN_CIVICS_URL,
} from "@shared/communityLinks";
import { Button } from "@/components/ui/button";
import { SEO, pageSEO } from "@/components/SEO";

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
