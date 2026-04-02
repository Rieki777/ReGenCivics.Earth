/**
 * DataProtectionBadge - Trust badge shown near form submit buttons
 * Communicates data handling practices to increase form completion rates
 */
import { Shield, Lock } from "lucide-react";
import { Link } from "wouter";

interface DataProtectionBadgeProps {
  className?: string;
  compact?: boolean;
}

export function DataProtectionBadge({ className = "", compact = false }: DataProtectionBadgeProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-white/60 text-[10px] ${className}`}>
        <Lock className="w-3 h-3" />
        <span>Encrypted and secure.{" "}
          <Link href="/privacy-policy" className="underline hover:text-white/60">
            Privacy Policy
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 ${className}`}>
      <Shield className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
      <p className="text-white/50 text-xs leading-snug">
        Your data is encrypted and never shared with third parties.{" "}
        <Link href="/privacy-policy" className="text-[#7dd87d]/70 underline hover:text-[#7dd87d]">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export default DataProtectionBadge;
