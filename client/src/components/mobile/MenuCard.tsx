/**
 * MenuCard: shared icon + label + sub-line card used across the mobile More menu.
 */
import { Link } from "wouter";
import {
  Compass, Sparkles, SlidersHorizontal, Wrench, Map, Sprout, Coins, Globe,
  Users, BookOpen, FileText, MessageCircle, Calendar, Shield, Mail, Vote,
} from "lucide-react";
import { TreeOfLifeIcon } from "@/components/icons/TreeOfLifeIcon";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass, Sparkles, SlidersHorizontal, Wrench, Map, Sprout, Coins, Globe,
  Users, BookOpen, FileText, MessageCircle, Calendar, Shield, Mail, Vote,
};

type Props = {
  label: string;
  sub?: string;
  href: string;
  icon: string; // lucide name or "wizards"
  primary?: boolean;
  onSelect?: () => void;
};

export function MenuCard({ label, sub, href, icon, primary = false, onSelect }: Props) {
  const Icon = ICONS[icon];

  const renderIcon = () => {
    if (icon === "wizards") {
      return <TreeOfLifeIcon size={28} className={primary ? "text-[#1a472a]" : "text-[#7dd87d]"} />;
    }
    if (Icon) return <Icon className={`w-6 h-6 ${primary ? "text-[#1a472a]" : "text-[#7dd87d]"}`} />;
    return <Compass className={`w-6 h-6 ${primary ? "text-[#1a472a]" : "text-[#7dd87d]"}`} />;
  };

  const baseClass = primary
    ? "bg-[#7dd87d] text-[#1a472a] border-[#7dd87d]"
    : "bg-white/5 text-white border-white/10 hover:bg-white/10";

  return (
    <Link
      href={href}
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${baseClass}`}
    >
      <div className="flex-shrink-0">{renderIcon()}</div>
      <div className="flex-1 min-w-0 text-left">
        <div className={`font-bold text-sm ${primary ? "text-[#1a472a]" : "text-white"}`}>{label}</div>
        {sub && <div className={`text-[11px] ${primary ? "text-[#1a472a]/70" : "text-white/55"}`}>{sub}</div>}
      </div>
    </Link>
  );
}
