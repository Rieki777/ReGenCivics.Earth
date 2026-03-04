/**
 * Breadcrumb - Auto-generates breadcrumbs from URL path
 * Applied to all pages deeper than one level
 */
import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

// Human-readable labels for URL segments
const segmentLabels: Record<string, string> = {
  "": "Home",
  fund: "Investors",
  land: "Land Projects",
  ally: "Alliance",
  game: "Game",
  play: "Players",
  quest: "Quests",
  "quest-suggestions": "Quest Suggestions",
  seasons: "Seasons",
  schedule: "Open Sessions",
  apply: "Apply",
  team: "Team",
  blog: "Blog",
  community: "Community",
  connect: "Connect",
  opportunity: "Investment Thesis",
  calculator: "Calculator",
  "crowd-pooling": "Crowd Pooling",
  "crowd-pooling-projects": "Crowd Pool Projects",
  "crowd-pooling-campaigns": "Crowd Pool Campaigns",
  governance: "Governance",
  showcase: "Showcase",
  "project-comparison": "Compare Projects",
  socials: "Socials",
  admin: "Admin",
  applications: "Applications",
  moderation: "Moderation",
  "one-pager": "One-Pagers",
  "player-profile": "Player Profile",
  "forum-profile": "Forum Profile",
  glossary: "Glossary",
  "privacy-policy": "Privacy Policy",
  "terms-of-use": "Terms of Use",
  "risk-disclosure": "Risk Disclosure",
  disclaimers: "Disclaimers",
  unsubscribe: "Email Preferences",
  map: "Map",
};

interface BreadcrumbProps {
  /** Override the auto-generated label for the last segment */
  currentLabel?: string;
  className?: string;
}

export function Breadcrumb({ currentLabel, className = "" }: BreadcrumbProps) {
  const [location] = useLocation();
  const segments = location.split("/").filter(Boolean);

  // Don't show breadcrumbs on home page or single-level pages
  if (segments.length < 2) return null;

  const crumbs = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    const label =
      isLast && currentLabel
        ? currentLabel
        : segmentLabels[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return { path, label, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-xs text-white/40 overflow-x-auto scrollbar-hide ${className}`}
    >
      <Link href="/" className="hover:text-white/60 transition-colors flex-shrink-0">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3 h-3 text-white/20" />
          {crumb.isLast ? (
            <span className="text-white/60 font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.path} className="hover:text-white/60 transition-colors truncate max-w-[150px]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
