/**
 * GlobeMap Component - Interactive 3D Globe with Land Projects & Organizations
 * Inspired by holomovement.net map, styled with enchanted forest theme
 * Uses globe.gl for 3D globe rendering with custom HTML markers
 * 
 * Features:
 * - Organization role tags with color coding
 * - Satellite orbit animation for global/location-less entities
 * - Season badges for land projects
 * - Inactive badges for broken-link projects
 * - Country dropdown filter
 * - Project/org images on entity cards
 */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MapPin, Leaf, Building2, ExternalLink, Globe, ChevronDown, ChevronUp, Sprout, Search, AlertCircle, Filter, X, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cdnImg } from "@/lib/utils";

/** Escape special HTML characters to prevent XSS in innerHTML interpolation. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Entity types for the map
export type EntityType = "land_project" | "organization" | "applicant";
export type FilterType = "all" | "land_project" | "organization" | "applicant";

// Organization role types
export type OrgRole =
  | "Coordination"
  | "Bioregional Econ"
  | "Infrastructure"
  | "Nourishment"
  | "Legal"
  | "Funding"
  | "Growth/Media"
  | "Events"
  | "Education"
  | "Technology"
  | "Wellness"
  | "Community Building"
  | "Land Services"
  | "Other";

// Role color mapping for badges
const ROLE_COLORS: Record<OrgRole, { bg: string; text: string }> = {
  "Coordination": { bg: "bg-purple-500/20", text: "text-purple-300" },
  "Bioregional Econ": { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  "Infrastructure": { bg: "bg-blue-500/20", text: "text-blue-300" },
  "Nourishment": { bg: "bg-orange-500/20", text: "text-orange-300" },
  "Legal": { bg: "bg-slate-400/20", text: "text-slate-300" },
  "Funding": { bg: "bg-yellow-500/20", text: "text-yellow-300" },
  "Growth/Media": { bg: "bg-pink-500/20", text: "text-pink-300" },
  "Events": { bg: "bg-cyan-500/20", text: "text-cyan-300" },
  "Education": { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  "Technology": { bg: "bg-teal-500/20", text: "text-teal-300" },
  "Wellness": { bg: "bg-rose-500/20", text: "text-rose-300" },
  "Community Building": { bg: "bg-amber-500/20", text: "text-amber-300" },
  "Land Services": { bg: "bg-lime-500/20", text: "text-lime-300" },
  "Other": { bg: "bg-gray-500/20", text: "text-gray-300" },
};

export interface MapEntity {
  id: string;
  name: string;
  type: EntityType;
  lat: number;
  lng: number;
  location: string;
  country: string;
  description: string;
  size?: string;
  url?: string;
  image?: string;
  status?: string;
  inactive?: boolean;
  season?: string;
  roles?: OrgRole[];
  isGlobal?: boolean; // true for entities that orbit the globe
  meetingFrequency?: string;
  dietaryPatterns?: string[]; // parsed from JSON
  forumThreadUrl?: string;
}

// Hard-coded Season 1 Land Projects with real coordinates from slide deck
const LAND_PROJECTS: MapEntity[] = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    type: "land_project",
    lat: 11.85,
    lng: -86.05,
    location: "Western Nicaragua",
    country: "Nicaragua",
    description: "4,000-acre oceanfront agrihood community building a regenerative society on the Pacific coast.",
    size: "4,000 acres",
    url: "https://www.ubunturegenvillage.earth/",
    image: cdnImg("https://assets.regencivics.earth/QoeFynHfnqeZcjzN.jpg"),
    inactive: true,
    season: "Season 1",
  },
  {
    id: "finca-sagrada",
    name: "Finca Sagrada",
    type: "land_project",
    lat: -4.26,
    lng: -79.23,
    location: "Vilcabamba, Ecuador",
    country: "Ecuador",
    description: "684-acre biodynamic community farm in the Valley of Longevity, focused on regenerative agriculture.",
    size: "684 acres",
    url: "https://fincasagrada.com/",
    image: cdnImg("https://assets.regencivics.earth/ptLdEEmSgyEQKzmF.jpg"),
    season: "Season 1",
  },
  {
    id: "tabi",
    name: "Tabi Regenerativo",
    type: "land_project",
    lat: 20.63,
    lng: -87.46,
    location: "Yucatan, Mexico",
    country: "Mexico",
    description: "3,350-acre living lab in the Yucatan peninsula, exploring regenerative land stewardship at scale.",
    size: "3,350 acres",
    url: "https://www.tabiregeneration.com/",
    inactive: true,
    season: "Season 1",
  },
  {
    id: "liminal-village",
    name: "Liminal Village",
    type: "land_project",
    lat: 42.83,
    lng: 12.56,
    location: "Central Italy",
    country: "Italy",
    description: "6,000m3 campus for co-living and co-creation, an eco-tech hub exploring the edges of regenerative culture.",
    size: "6,000 m3",
    url: "https://liminalvillage.com/",
    image: cdnImg("https://assets.regencivics.earth/akMLmQzqqlUsisDu.webp"),
    season: "Season 1",
  },
  {
    id: "salt-cross",
    name: "Salt Cross",
    type: "land_project",
    lat: 51.79,
    lng: -1.37,
    location: "Eynsham, U.K.",
    country: "United Kingdom",
    description: "378-acre, 2,200-home Community Land Trust creating a model for regenerative development in the UK.",
    size: "378 acres",
    season: "Season 1",
  },
  {
    id: "tdf",
    name: "Traditional Dream Factory",
    type: "land_project",
    lat: 37.65,
    lng: -8.15,
    location: "Alentejo, Portugal",
    country: "Portugal",
    description: "62-acre regenerative co-creation hub in southern Portugal, blending community living with innovation.",
    size: "62 acres",
    url: "https://traditionaldreamfactory.com/",
    image: cdnImg("https://assets.regencivics.earth/euecgkvMVMKpIduW.jpg"),
    season: "Season 1",
  },
  {
    id: "heartland",
    name: "Heartland Collective",
    type: "land_project",
    lat: 39.23,
    lng: -121.35,
    location: "Yuba, California",
    country: "USA",
    description: "24-224 acre regenerative learning center in Northern California, focused on education and land stewardship.",
    size: "24-224 acres",
    image: cdnImg("https://assets.regencivics.earth/xHHoWlRQHaZwWmCV.webp"),
    season: "Season 1",
  },
  {
    id: "lala-gardens",
    name: "LaLa Gardens",
    type: "land_project",
    lat: 40.59,
    lng: -105.08,
    location: "Fort Collins, Colorado",
    country: "USA",
    description: "1-acre urban garden and regen hub demonstrating that regeneration starts in your own backyard.",
    size: "1 acre",
    url: "https://lalagardens.org/",
    image: cdnImg("https://assets.regencivics.earth/RBFOBfivFZGRBilm.jpg"),
    inactive: true,
    season: "Season 1",
  },
  {
    id: "tioga",
    name: "Tioga",
    type: "land_project",
    lat: 42.1,
    lng: -76.3,
    location: "North East U.S.",
    country: "USA",
    description: "810-acre growing network of communities, homesteads, and farms in the northeastern United States.",
    size: "810 acres",
    season: "Season 1",
  },
  {
    id: "starseed",
    name: "StarSeed Village",
    type: "land_project",
    lat: 14.63,
    lng: -90.51,
    location: "Guatemala",
    country: "Guatemala",
    description: "385-acre regenerative village project in the highlands of Guatemala, blending indigenous wisdom with innovation.",
    size: "385 acres",
    image: cdnImg("https://assets.regencivics.earth/qDMEazGCLoNCuxiS.jpg"),
    season: "Season 1",
  },
  {
    id: "nyx",
    name: "Nyx",
    type: "land_project",
    lat: -8.41,
    lng: 115.19,
    location: "Bali, Indonesia",
    country: "Indonesia",
    description: "5-acre regenerative community in Bali exploring new models of conscious co-living.",
    size: "5 acres",
    image: cdnImg("https://assets.regencivics.earth/FuQmXVqMDIJIpIbl.jpg"),
    season: "Season 1",
  },
  {
    id: "regen-campus",
    name: "ReGen Campus",
    type: "land_project",
    lat: 35.43,
    lng: -82.52,
    location: "Highland Lake, NC, USA",
    country: "USA",
    description: "100-120 acre regenerative campus in the Blue Ridge Mountains, a living laboratory for systemic change.",
    size: "100-120 acres",
    image: cdnImg("https://assets.regencivics.earth/HLPCggmitjgcNLWL.jpg"),
    inactive: true,
    season: "Season 1",
  },
  {
    id: "la-tierra",
    name: "La Tierra",
    type: "land_project",
    lat: 9.93,
    lng: -84.08,
    location: "Costa Rica",
    country: "Costa Rica",
    description: "432-acre Blue Zone regenerative village in one of the world's longevity hotspots.",
    size: "432 acres",
    image: cdnImg("https://assets.regencivics.earth/wwnJXOsxkrlwtDre.jpg"),
    season: "Season 1",
  },
];

// Additional applicant projects (Season 2 candidates, not from Season 1)
const APPLICANT_PROJECTS: MapEntity[] = [
  {
    id: "neighbourgood",
    name: "Neighbourgood",
    type: "land_project",
    lat: -43.53,
    lng: 172.64,
    location: "Christchurch, New Zealand",
    country: "New Zealand",
    description: "Urban regenerative community hub in Christchurch, reimagining neighborhood-scale living.",
    image: cdnImg("https://assets.regencivics.earth/kEKLQJFyCBJjUEXT.jpg"),
    season: "Season 2",
  },
];

// Alliance Organizations with approximate HQ coordinates and role tags
const ORGANIZATIONS: MapEntity[] = [
  {
    id: "hypha",
    name: "Hypha DAO",
    type: "organization",
    lat: 52.37,
    lng: 4.90,
    location: "Amsterdam, Netherlands",
    country: "Netherlands",
    description: "DAO/DHO builder for coordinating regional DAOs and start-up towns. Decentralized governance and treasury management.",
    url: "https://hypha.earth",
    roles: ["Coordination"],
  },
  {
    id: "seeds",
    name: "SEEDS Economy",
    type: "organization",
    lat: 21.16,
    lng: -86.85,
    location: "Global / Yucatan, Mexico",
    country: "Mexico",
    description: "Regenerative economic and financial system with ecosystem tokens and social key recovery.",
    url: "https://joinseeds.earth",
    roles: ["Coordination", "Bioregional Econ"],
    isGlobal: true,
  },
  {
    id: "nestr",
    name: "Nestr.io",
    type: "organization",
    lat: 48.86,
    lng: 2.35,
    location: "Paris, France",
    country: "France",
    description: "Decentralized collaboration tools and processes for a decentralized world.",
    url: "https://nestr.io",
    roles: ["Coordination", "Technology"],
  },
  {
    id: "kinship",
    name: "Kinship Earth",
    type: "organization",
    lat: 51.51,
    lng: -0.13,
    location: "London, UK",
    country: "United Kingdom",
    description: "Flow Funding for grassroots leaders building regenerative futures.",
    url: "https://kinshipearth.org",
    roles: ["Funding"],
  },
  {
    id: "open-future",
    name: "Open Future Coalition",
    type: "organization",
    lat: 37.77,
    lng: -122.42,
    location: "San Francisco, USA",
    country: "USA",
    description: "Technical, social, and financial tools for impact coordination and measurement.",
    url: "https://openfuturecoalition.org",
    roles: ["Coordination", "Technology"],
  },
  {
    id: "up-game",
    name: "United Planet (UP.Game)",
    type: "organization",
    lat: 48.21,
    lng: 16.37,
    location: "Vienna, Austria",
    country: "Austria",
    description: "Immersive redesign game teleporting athletes of systems change to 2030 to reverse engineer futures.",
    url: "https://up.game",
    roles: ["Events"],
  },
  {
    id: "closer",
    name: "Closer.earth",
    type: "organization",
    lat: 37.65,
    lng: -8.15,
    location: "Alentejo, Portugal",
    country: "Portugal",
    description: "An operating system for sovereign communities: events, value distribution, visits, and membership.",
    url: "https://closer.earth",
    roles: ["Coordination", "Technology"],
  },
  {
    id: "regen-living",
    name: "Regen Living",
    type: "organization",
    lat: 34.05,
    lng: -118.24,
    location: "Los Angeles, USA",
    country: "USA",
    description: "Education, training, and regenerative frameworks. Community design and social architecture.",
    url: "https://regenliving.eco",
    roles: ["Education", "Community Building"],
  },
  {
    id: "desa",
    name: "DESA",
    type: "organization",
    lat: -8.65,
    lng: 115.22,
    location: "Bali, Indonesia",
    country: "Indonesia",
    description: "Land discovery, acquisition, and legal support for regenerative projects worldwide.",
    url: "https://desa.earth",
    roles: ["Land Services"],
  },
  {
    id: "localscale",
    name: "LocalScale",
    type: "organization",
    lat: 45.50,
    lng: -73.57,
    location: "Montreal, Canada",
    country: "Canada",
    description: "Coordinates bioregional economies: marketplaces, local transactions with diversity of ecosystem tokens.",
    url: "https://localscale.org",
    roles: ["Bioregional Econ"],
  },
  {
    id: "permatours",
    name: "Permatours",
    type: "organization",
    lat: 38.72,
    lng: -9.14,
    location: "Lisbon, Portugal",
    country: "Portugal",
    description: "On-the-ground ReGen festivals and project support/activation.",
    url: "https://permatours.org",
    roles: ["Events"],
  },
  {
    id: "oasa",
    name: "OASA.earth",
    type: "organization",
    lat: 37.98,
    lng: 23.73,
    location: "Athens, Greece",
    country: "Greece",
    description: "Operating system for regenerative civilization, connecting land projects globally.",
    url: "https://oasa.earth",
    roles: ["Coordination", "Technology"],
  },
  {
    id: "gaia-biolab",
    name: "Gaia Union BioLab",
    type: "organization",
    lat: 47.37,
    lng: 8.54,
    location: "Zurich, Switzerland",
    country: "Switzerland",
    description: "Bio-integral regenerative initiatives and scientific research for ecological restoration.",
    url: "https://gaia-union.com/biolab/",
    inactive: true,
    roles: ["Education"],
  },
  {
    id: "universe-land-trust",
    name: "Universe Land Trust",
    type: "organization",
    lat: 9.93,
    lng: -84.08,
    location: "Costa Rica",
    country: "Costa Rica",
    description: "International legal infrastructure for land acquisition and ownership. Permaculture, community building, and media.",
    url: "https://theuniverse.org",
    roles: ["Legal"],
  },
  {
    id: "gitcoin",
    name: "Gitcoin",
    type: "organization",
    lat: 40.71,
    lng: -74.01,
    location: "Global / New York, USA",
    country: "USA",
    description: "Open-source funding platform supporting communities through quadratic funding and grants.",
    url: "https://gitcoin.co",
    roles: ["Funding"],
    isGlobal: true,
  },
];

// Role badge component
function RoleBadge({ role }: { role: OrgRole }) {
  const colors = ROLE_COLORS[role] || ROLE_COLORS["Other"];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium whitespace-nowrap`}>
      {role}
    </span>
  );
}

// Entity Card Component - mobile-first with image, season tag, inactive tag, role tags
function EntityCard({
  entity,
  isSelected,
  onSelect,
  cardRef,
}: {
  entity: MapEntity;
  isSelected: boolean;
  onSelect: (entity: MapEntity) => void;
  cardRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const typeColors = {
    land_project: { bg: "bg-[#4a7c59]/20", border: "border-[#4a7c59]", text: "text-[#4a7c59]", label: "Land Project" },
    organization: { bg: "bg-[#d4a574]/20", border: "border-[#d4a574]", text: "text-[#d4a574]", label: "Alliance Org" },
    applicant: { bg: "bg-[#7dd87d]/20", border: "border-[#7dd87d]", text: "text-[#7dd87d]", label: "Applicant" },
  };
  const style = typeColors[entity.type];

  // Build the apply/connect URL
  const getApplyUrl = () => {
    if (entity.type === "land_project") {
      return `/connect?path=live&project=${encodeURIComponent(entity.id)}`;
    }
    if (entity.type === "organization") {
      return `/connect?path=create_with_regens&org=${encodeURIComponent(entity.name)}`;
    }
    return null;
  };

  const applyUrl = getApplyUrl();

  return (
    <button
      ref={cardRef}
      onClick={() => onSelect(entity)}
      className={`w-full text-left rounded-xl border transition-all duration-300 overflow-hidden ${
        isSelected
          ? `${style.bg} ${style.border} border-2 shadow-lg shadow-[#7dd87d]/10`
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      {/* Large image - always visible when available */}
      {entity.image && (
        <div className={`w-full overflow-hidden ${isSelected ? 'h-36' : 'h-24'} transition-all duration-300`}>
          <img
            src={entity.image}
            alt={entity.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const container = (e.target as HTMLImageElement).parentElement;
              if (container) container.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-3">
        {/* Tags row - below image like reference */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} font-medium`}>
            {style.label}
          </span>
          {entity.season && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#7dd87d]/15 text-[#7dd87d] font-medium">
              {entity.season}
            </span>
          )}
          {entity.inactive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Inactive
            </span>
          )}
          {entity.isGlobal && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" /> Global
            </span>
          )}
          {entity.type === "applicant" && entity.status && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
              {entity.status === "approved" ? "Approved" : entity.status === "under_review" ? "Under Review" : "Pending"}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-white text-sm mt-1.5" style={{ fontFamily: "var(--font-display)" }}>
          {entity.name}
        </h3>

        {/* Location */}
        <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{entity.location}</span>
        </p>

        {/* Description - always visible when selected */}
        {isSelected && (
          <p className="text-white/70 text-xs leading-relaxed mt-2">{entity.description}</p>
        )}

        {/* Size - always visible when available and selected */}
        {isSelected && entity.size && (
          <p className="text-[#7dd87d] text-xs font-semibold mt-1.5">Size: {entity.size}</p>
        )}

        {/* Meeting Frequency */}
        {isSelected && entity.meetingFrequency && (
          <p className="text-white/60 text-xs mt-1">
            <span className="text-white/60">Meets:</span>{" "}
            {({
              everyday: "Everyday",
              "2_3x_week": "2–3× per week",
              weekly: "Weekly",
              "2_3x_month": "2–3× per month",
              monthly: "Monthly",
              "2_3x_year": "2–3× per year",
              yearly_plus: "Yearly or less",
            } as Record<string, string>)[entity.meetingFrequency] ?? entity.meetingFrequency}
          </p>
        )}

        {/* Dietary Patterns */}
        {isSelected && entity.dietaryPatterns && entity.dietaryPatterns.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entity.dietaryPatterns.map((d) => (
              <span
                key={d}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4a7c59]/30 text-[#7dd87d] font-medium capitalize"
              >
                {d.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Role tags for organizations */}
        {entity.roles && entity.roles.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {entity.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        )}

        {/* Action buttons - always visible when selected */}
        {isSelected && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-2 border-t border-white/10">
            {entity.url && !entity.inactive && (
              <a
                href={entity.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-[#d4a574] hover:text-[#e8c49a] underline"
              >
                <ExternalLink className="w-3 h-3" /> Website
              </a>
            )}
            {entity.forumThreadUrl && (
              <a
                href={entity.forumThreadUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-[#7dd87d] hover:text-[#9fe89f] underline"
              >
                <MessageCircle className="w-3 h-3" /> Forum thread
              </a>
            )}
            {entity.url && entity.inactive && (
              <span className="inline-flex items-center gap-1 text-xs text-white/55 line-through cursor-not-allowed">
                <ExternalLink className="w-3 h-3" /> Website (offline)
              </span>
            )}
            {/* Only show Join button for ACTIVE projects/orgs */}
            {applyUrl && !entity.inactive && (
              <a
                href={applyUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs bg-[#7dd87d] text-[#1a472a] px-3 py-1.5 rounded-full font-semibold hover:bg-[#9de89d] transition-colors"
              >
                {entity.type === "organization" ? "Work with ReGens" : "Apply"}
              </a>
            )}
            {entity.type === "land_project" && !entity.inactive && !entity.forumThreadUrl && (
              <a
                href="/community"
                onClick={(e) => e.stopPropagation()}
                title="Forum space coming soon for this project"
                className="inline-flex items-center gap-1 text-xs border border-white/20 text-white/60 px-3 py-1.5 rounded-full font-medium cursor-default pointer-events-none"
              >
                <MessageCircle className="w-3 h-3" /> Forum (coming soon)
              </a>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// Filter Tab Component
function FilterTab({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? `${color} shadow-md`
          : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80"
      }`}
    >
      {label} ({count})
    </button>
  );
}

// Country filter dropdown
function CountryFilter({
  countries,
  selected,
  onSelect,
}: {
  countries: string[];
  selected: string;
  onSelect: (country: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white appearance-none cursor-pointer focus:outline-none focus:border-[#7dd87d]/50 focus:ring-1 focus:ring-[#7dd87d]/30"
        style={{ backgroundImage: "none" }}
      >
        <option value="" className="bg-[#1a472a] text-white">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c} className="bg-[#1a472a] text-white">{c}</option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <Filter className="w-3 h-3 text-white/60" />
      </div>
    </div>
  );
}

// Main GlobeMap Component
export default function GlobeMap({ fullPage = false }: { fullPage?: boolean }) {
  const globeRef = useRef<HTMLDivElement>(null);
  const mobileGlobeRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // WebGL support detection
  const [webglSupported, setWebglSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch { setWebglSupported(false); }
  }, []);

  const globeInstanceRef = useRef<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globeReady, setGlobeReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [meetingFreqFilter, setMeetingFreqFilter] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const orbitAngleRef = useRef(0);
  const orbitAnimRef = useRef<number | null>(null);

  // Fetch applicant data from the database
  const { data: applicantData } = trpc.applications.mapData.useQuery();
  const { data: activeProjectThreads } = trpc.forum.activeProjectThreads.useQuery(undefined, { staleTime: 300_000 });

  // Build a lowercase-name → post-id lookup for forum thread links
  const threadByName = useMemo(() => {
    if (!activeProjectThreads) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const t of activeProjectThreads) {
      // Thread title format: "Project Name - Location"
      const key = t.title.split(" - ")[0].toLowerCase().trim();
      m.set(key, t.id);
    }
    return m;
  }, [activeProjectThreads]);

  // Convert applicant data to MapEntity format
  const applicantEntities: MapEntity[] = useMemo(() => {
    if (!applicantData) return [];
    return applicantData
      .filter((app) => app.latitude != null && app.longitude != null)
      .map((app) => ({
        id: `applicant-${app.id}`,
        name: app.name,
        type: "applicant" as EntityType,
        lat: app.latitude as number,
        lng: app.longitude as number,
      location: app.location,
      country: app.country || "",
      description: app.vision || "A new regenerative land project applying to join the ReGen Civics alliance.",
      size: app.projectSizeHectares ? `${app.projectSizeHectares} hectares` : undefined,
      url: app.websiteUrl || undefined,
      status: app.status,
      season: "Season 2",
      meetingFrequency: app.meetingFrequency || undefined,
      dietaryPatterns: app.dietaryPatterns
        ? (() => { try { return JSON.parse(app.dietaryPatterns); } catch { return []; } })()
        : undefined,
      forumThreadUrl: (() => {
        const postId = threadByName.get(app.name.toLowerCase().trim());
        return postId ? `/community/post/${postId}` : undefined;
      })(),
    }));
  }, [applicantData, threadByName]);

  // Combine all entities
  const allEntities = useMemo(() => {
    return [...LAND_PROJECTS, ...APPLICANT_PROJECTS, ...ORGANIZATIONS, ...applicantEntities];
  }, [applicantEntities]);

  // Get unique countries for filter
  const countries = useMemo(() => {
    const set = new Set(allEntities.map((e) => e.country).filter(Boolean));
    return Array.from(set).sort();
  }, [allEntities]);

  // Track filter dependencies including showInactive
  // Filter entities by type, search query, and country
  const filteredEntities = useMemo(() => {
    let result = allEntities;
    if (!showInactive) {
      result = result.filter((e) => !e.inactive);
    }
    if (filter !== "all") {
      result = result.filter((e) => e.type === filter);
    }
    if (countryFilter) {
      result = result.filter((e) => e.country === countryFilter);
    }
    if (meetingFreqFilter) {
      result = result.filter((e) => e.meetingFrequency === meetingFreqFilter);
    }
    if (dietaryFilter) {
      result = result.filter((e) => e.dietaryPatterns?.includes(dietaryFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          (e.roles && e.roles.some((r) => r.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [allEntities, filter, showInactive, searchQuery, countryFilter, meetingFreqFilter, dietaryFilter]);

  // Separate pinned vs global/orbiting entities
  const pinnedEntities = useMemo(() => filteredEntities.filter((e) => !e.isGlobal), [filteredEntities]);
  const globalEntities = useMemo(() => filteredEntities.filter((e) => e.isGlobal), [filteredEntities]);

  // Counts for filter tabs
  const counts = useMemo(() => ({
    all: allEntities.length,
    land_project: allEntities.filter((e) => e.type === "land_project").length,
    organization: allEntities.filter((e) => e.type === "organization").length,
    applicant: allEntities.filter((e) => e.type === "applicant").length,
  }), [allEntities]);

  // Initialize globe - re-create when isMobile changes
  useEffect(() => {
    const targetEl = isMobile ? mobileGlobeRef.current : globeRef.current;
    if (!targetEl) return;

    // Clean up previous globe instance
    if (globeInstanceRef.current) {
      try {
        const oldEl = globeInstanceRef.current._destructor ? globeInstanceRef.current : null;
        // Remove the canvas from the old container
        const canvases = targetEl.querySelectorAll("canvas");
        canvases.forEach((c: Element) => c.remove());
      } catch {}
      globeInstanceRef.current = null;
      setGlobeReady(false);
    }

    let mounted = true;

    const initGlobe = async () => {
      try {
        const Globe = (await import("globe.gl")).default;
        if (!mounted || !targetEl) return;

        // Clear any existing children from previous renders
        while (targetEl.firstChild) {
          targetEl.removeChild(targetEl.firstChild);
        }

        const globe = new Globe(targetEl)
          .globeImageUrl("/globe/earth-blue-marble.jpg")
          .bumpImageUrl("/globe/earth-topology.png")
          .backgroundImageUrl("/globe/night-sky.png")
          .showAtmosphere(true)
          .atmosphereColor("#4a7c59")
          .atmosphereAltitude(0.25)
          .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

        // Set size - use fallback if container hasn't laid out yet
        const w = targetEl.clientWidth || targetEl.offsetWidth || 400;
        const h = targetEl.clientHeight || targetEl.offsetHeight || 300;
        globe.width(w);
        globe.height(h);

        globeInstanceRef.current = globe;
        setGlobeReady(true);

        // Re-measure after layout settles in case initial read was 0
        requestAnimationFrame(() => {
          if (targetEl && globeInstanceRef.current) {
            const realW = targetEl.clientWidth;
            const realH = targetEl.clientHeight;
            if (realW && realH && (realW !== w || realH !== h)) {
              globeInstanceRef.current.width(realW);
              globeInstanceRef.current.height(realH);
            }
          }
        });
      } catch (err) {
        console.error("Failed to initialize globe:", err);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initGlobe, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isMobile]);

  // Update globe points when data changes
  useEffect(() => {
    if (!globeInstanceRef.current || !globeReady) return;

    const globe = globeInstanceRef.current;

    const getColor = (type: EntityType, isGlobal?: boolean) => {
      if (isGlobal) return "#f0f7f0"; // sky blue for orbiting
      switch (type) {
        case "land_project":
          return "#7dd87d";
        case "organization":
          return "#d4a574";
        case "applicant":
          return "#f0f7f0";
      }
    };

    const getAltitude = (type: EntityType) => {
      switch (type) {
        case "land_project":
          return 0.06;
        case "organization":
          return 0.04;
        case "applicant":
          return 0.03;
      }
    };

    // Pinned entities as tree-shaped custom HTML markers on the globe
    // We use htmlElementsData for pinned entities (trees) and a second layer for satellites
    // Since globe.gl only has one htmlElementsData, we combine pinned + global into one array
    // and differentiate by a flag
    const allGlobeHtmlData = [
      ...pinnedEntities.map((e) => ({ ...e, _isTree: true, _isSatellite: false, satLat: 0, satLng: 0, altitude: 0.01 })),
      ...globalEntities.map((entity, i) => ({
        ...entity,
        _isTree: false,
        _isSatellite: true,
        satLat: 35 + i * 30,
        satLng: entity.lng + (i / Math.max(globalEntities.length, 1)) * 360 * 0.3,
        altitude: 0.55 + i * 0.2,
      })),
    ];

    globe
      .htmlElementsData(allGlobeHtmlData)
      .htmlLat((d: any) => d._isSatellite ? d.satLat : d.lat)
      .htmlLng((d: any) => d._isSatellite ? d.satLng : d.lng)
      .htmlAltitude((d: any) => d._isSatellite ? d.altitude : 0.01)
      .htmlElement((d: any) => {
        const el = document.createElement("div");
        // Position so the BASE of the tree (bottom-center) sits exactly at the coordinate point
        // We use a wrapper approach: the outer div is centered on the point, inner tree is positioned upward
        el.style.cssText = "cursor:pointer;pointer-events:auto;position:relative;width:0;height:0;overflow:visible;";

        if (d._isTree) {
          // Seasonal color variations: Season 1 = classic deep green, Season 2 = brighter lime green
          const isSeason2 = d.season === "Season 2";
          const baseColor = getColor(d.type, d.isGlobal);
          const color = (d.type === "land_project" || d.type === "applicant") && isSeason2 ? "#a3e635" : baseColor;
          const isLandProject = d.type === "land_project" || d.type === "applicant";

          // Unique animation delay per entity for staggered sprout effect
          const sproutDelay = Math.random() * 0.8;

          if (isLandProject) {
            // LAND PROJECT: Redwood / Conifer tree, sized by acreage
            let acres = 50;
            if (d.size) {
              const match = d.size.replace(/,/g, "").match(/(\d+)/);
              if (match) acres = parseInt(match[1], 10);
            }
            const logAcres = Math.log10(Math.max(acres, 1));
            const scale = 0.6 + (logAcres / 3.6) * 1.2;
            const clampedScale = Math.min(Math.max(scale, 0.6), 1.8);

            const baseW = 28;
            const baseH = 48;
            const w = Math.round(baseW * clampedScale);
            const h = Math.round(baseH * clampedScale);
            const cx = w / 2;
            const trunkW = Math.max(3, Math.round(3.5 * clampedScale));
            const trunkH = Math.round(h * 0.22);
            const canopyTop = 2;
            const canopyBot = h - trunkH;
            const canopyMid = (canopyTop + canopyBot) / 2;

            // Redwood conifer: triangular layered branches tapering to a point
            // 4 triangle layers stacked, widest at bottom, narrowest at top
            const layers = 4;
            let triangles = "";
            for (let i = 0; i < layers; i++) {
              const layerTop = canopyTop + (canopyBot - canopyTop) * (i / layers) * 0.7;
              const layerBot = canopyTop + (canopyBot - canopyTop) * ((i + 1.3) / layers) * 0.75;
              const widthFrac = 0.35 + (i / layers) * 0.65;
              const halfW = cx * widthFrac;
              const darkGreen = i % 2 === 0 ? color : (color === "#a3e635" ? "#84cc16" : color === "#7dd87d" ? "#5cb85c" : "#4a7c59");
              const opacity = 0.75 + (layers - i) * 0.06;
              triangles += `<polygon points="${cx},${layerTop} ${cx + halfW},${layerBot} ${cx - halfW},${layerBot}" fill="${darkGreen}" opacity="${opacity}" />`;
            }

            const sizeLabel = d.size ? d.size : "";
            const tooltipText = `${escapeHtml(d.name)} - ${escapeHtml(d.location)}${sizeLabel ? " (" + escapeHtml(sizeLabel) + ")" : ""}`;

            // Build hover popup HTML with mini photo
            const hoverPopup = d.image
              ? `<div class="globe-hover-popup" style="display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;background:#1a472a;border:1px solid #4a7c59;border-radius:8px;padding:4px;width:120px;box-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:100;pointer-events:none;"><img src="${escapeHtml(d.image)}" style="width:100%;height:60px;object-fit:cover;border-radius:4px;" alt="" loading="lazy" /><div style="color:white;font-size:9px;padding:3px 2px 1px;text-align:center;font-family:var(--font-display);line-height:1.2;">${escapeHtml(d.name)}</div></div>`
              : `<div class="globe-hover-popup" style="display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;background:#1a472a;border:1px solid #4a7c59;border-radius:6px;padding:4px 8px;box-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:100;pointer-events:none;"><div style="color:white;font-size:9px;text-align:center;font-family:var(--font-display);white-space:nowrap;">${escapeHtml(d.name)}</div></div>`;

            el.innerHTML = `<div class="globe-tree-sprout" style="position:absolute;bottom:0;left:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));animation:treeSprout 0.6s ease-out ${sproutDelay}s both;" title="${tooltipText}">`
              + hoverPopup
              + `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
              // Trunk - tapered
              + `<path d="M${cx - trunkW/2},${canopyBot - 1} L${cx - trunkW*0.35},${h} L${cx + trunkW*0.35},${h} L${cx + trunkW/2},${canopyBot - 1} Z" fill="#5d3a1a" />`
              + `<path d="M${cx - trunkW*0.2},${canopyBot} L${cx - trunkW*0.15},${h - 1} L${cx + trunkW*0.05},${h - 1} L${cx + trunkW*0.1},${canopyBot}" fill="#7a4f2b" opacity="0.5" />`
              // Conifer canopy layers
              + triangles
              // Snow/highlight on top
              + `<circle cx="${cx}" cy="${canopyTop + 3}" r="${Math.max(1.5, w * 0.04)}" fill="white" opacity="0.35" />`
              + `</svg></div>`;
          } else {
            // ORGANIZATION: Palm tree
            const palmW = 30;
            const palmH = 44;
            const cx = palmW / 2;
            const trunkBot = palmH;
            const trunkTop = palmH * 0.45;
            const frondCenter = trunkTop - 2;

            const tooltipText = `${escapeHtml(d.name)} - ${escapeHtml(d.location)}`;

            // Palm trunk: curved, tapered
            // Fronds: 5-6 arching leaf shapes radiating from top
            let fronds = "";
            const frondAngles = [-70, -35, 0, 35, 70];
            frondAngles.forEach((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const frondLen = 12 + Math.abs(angle) * 0.04;
              const tipX = cx + Math.sin(rad) * frondLen;
              const tipY = frondCenter - Math.cos(rad) * frondLen;
              const cp1x = cx + Math.sin(rad) * frondLen * 0.5 + (angle > 0 ? 3 : -3);
              const cp1y = frondCenter - Math.cos(rad) * frondLen * 0.6;
              const leafColor = i % 2 === 0 ? color : (color === "#d4a574" ? "#c49564" : "#b88a54");
              fronds += `<path d="M${cx},${frondCenter} Q${cp1x},${cp1y} ${tipX},${tipY}" stroke="${leafColor}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.9" />`;
              // Leaf blade on each frond
              const midX = (cx + tipX) / 2 + (angle > 0 ? 1.5 : -1.5);
              const midY = (frondCenter + tipY) / 2;
              fronds += `<path d="M${cx},${frondCenter} Q${midX + (angle > 0 ? 2 : -2)},${midY - 1} ${tipX},${tipY}" stroke="${leafColor}" stroke-width="1" fill="none" opacity="0.5" />`;
            });

            // Build hover popup for palm trees too
            const palmHoverPopup = d.image
              ? `<div class="globe-hover-popup" style="display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;background:#1a472a;border:1px solid #d4a574;border-radius:8px;padding:4px;width:120px;box-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:100;pointer-events:none;"><img src="${escapeHtml(d.image)}" style="width:100%;height:60px;object-fit:cover;border-radius:4px;" alt="" loading="lazy" /><div style="color:white;font-size:9px;padding:3px 2px 1px;text-align:center;font-family:var(--font-display);line-height:1.2;">${escapeHtml(d.name)}</div></div>`
              : `<div class="globe-hover-popup" style="display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;background:#1a472a;border:1px solid #d4a574;border-radius:6px;padding:4px 8px;box-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:100;pointer-events:none;"><div style="color:white;font-size:9px;text-align:center;font-family:var(--font-display);white-space:nowrap;">${escapeHtml(d.name)}</div></div>`;

            el.innerHTML = `<div class="globe-tree-sprout" style="position:absolute;bottom:0;left:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));animation:treeSprout 0.6s ease-out ${sproutDelay}s both;" title="${tooltipText}">`
              + palmHoverPopup
              + `<svg width="${palmW}" height="${palmH}" viewBox="0 0 ${palmW} ${palmH}">`
              // Trunk: slightly curved, tapered
              + `<path d="M${cx},${trunkBot} Q${cx + 2},${(trunkTop + trunkBot)/2} ${cx},${trunkTop}" stroke="#8b6914" stroke-width="4" fill="none" stroke-linecap="round" />`
              + `<path d="M${cx + 0.5},${trunkBot} Q${cx + 2.5},${(trunkTop + trunkBot)/2} ${cx + 0.5},${trunkTop}" stroke="#a07d2e" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4" />`
              // Trunk rings
              + `<line x1="${cx - 1.5}" y1="${trunkTop + 6}" x2="${cx + 2.5}" y2="${trunkTop + 5}" stroke="#6b4f1d" stroke-width="0.5" opacity="0.5" />`
              + `<line x1="${cx - 1.5}" y1="${trunkTop + 12}" x2="${cx + 2.5}" y2="${trunkTop + 11}" stroke="#6b4f1d" stroke-width="0.5" opacity="0.5" />`
              + `<line x1="${cx - 1.5}" y1="${trunkTop + 18}" x2="${cx + 2.5}" y2="${trunkTop + 17}" stroke="#6b4f1d" stroke-width="0.5" opacity="0.5" />`
              // Coconuts at crown
              + `<circle cx="${cx - 2}" cy="${frondCenter + 2}" r="1.8" fill="#8b6914" />`
              + `<circle cx="${cx + 2}" cy="${frondCenter + 2.5}" r="1.5" fill="#7a5c12" />`
              // Fronds
              + fronds
              + `</svg></div>`;
          }
          // Hover to show mini photo popup
          el.onmouseenter = () => {
            const popup = el.querySelector('.globe-hover-popup') as HTMLElement;
            if (popup) popup.style.display = 'block';
          };
          el.onmouseleave = () => {
            const popup = el.querySelector('.globe-hover-popup') as HTMLElement;
            if (popup) popup.style.display = 'none';
          };
          el.onclick = () => {
            setSelectedEntity(d);
            setSidebarOpen(true);
            if (globeInstanceRef.current) {
              globeInstanceRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.2 }, 1200);
            }
          };
        } else {
          // Satellite marker (50% smaller: 40px instead of 80px)
          el.style.cssText = "cursor:pointer;transform:translate(-50%,-50%);pointer-events:auto;";
          const shortName = d.name.length > 12 ? d.name.split(" ")[0] : d.name;
          el.innerHTML = '<div style="width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f0f7f0,#2563eb,#1e3a5f);box-shadow:0 0 15px rgba(135,206,235,0.6),0 0 30px rgba(135,206,235,0.3),inset 0 0 10px rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;position:relative;"><div style="position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(135,206,235,0.3);"></div><div style="color:white;font-size:7px;font-weight:700;text-align:center;line-height:1.1;text-shadow:0 1px 3px rgba(0,0,0,0.8);font-family:var(--font-display);padding:2px;">' + escapeHtml(shortName) + '</div></div><div style="text-align:center;margin-top:2px;color:#f0f7f0;font-size:8px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,0.9);white-space:nowrap;font-family:var(--font-display);">' + escapeHtml(d.name) + '</div>';
          el.onclick = () => {
            setSelectedEntity(d);
            setSidebarOpen(true);
          };
        }

        return el;
      });

    // Remove the old points layer since we now use HTML elements for everything
    globe.pointsData([]);

    // Add pulsing rings under ALL pinned entities (land projects + organizations)
    globe
      .ringsData(pinnedEntities)
      .ringLat((d: any) => d.lat)
      .ringLng((d: any) => d.lng)
      .ringColor((d: any) => () => d.type === "organization" ? "#d4a57440" : "#7dd87d40")
      .ringMaxRadius(3)
      .ringPropagationSpeed(1)
      .ringRepeatPeriod(2000);

    // No orbit arcs - clean globe
    globe.arcsData([]);

  }, [filteredEntities, pinnedEntities, globalEntities, globeReady]);

  // Handle resize
  useEffect(() => {
    const targetEl = isMobile ? mobileGlobeRef.current : globeRef.current;
    if (!globeInstanceRef.current || !targetEl) return;

    const handleResize = () => {
      if (targetEl && globeInstanceRef.current) {
        globeInstanceRef.current.width(targetEl.clientWidth);
        globeInstanceRef.current.height(targetEl.clientHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [globeReady, isMobile]);

  // Ref for the selected card to scroll into view
  const selectedCardRef = useRef<HTMLButtonElement | null>(null);

  // Sort entities: selected entity always first
  const sortedFilteredEntities = useMemo(() => {
    if (!selectedEntity) return filteredEntities;
    const selected = filteredEntities.find((e) => e.id === selectedEntity.id);
    if (!selected) return filteredEntities;
    return [selected, ...filteredEntities.filter((e) => e.id !== selectedEntity.id)];
  }, [filteredEntities, selectedEntity]);

  // Navigate to entity on select from sidebar
  const handleEntitySelect = useCallback((entity: MapEntity) => {
    setSelectedEntity((prev) => (prev?.id === entity.id ? null : entity));
    if (globeInstanceRef.current && entity.id !== selectedEntity?.id) {
      // Fly-to animation: zoom in closer then ease back
      globeInstanceRef.current.pointOfView(
        { lat: entity.lat, lng: entity.lng, altitude: 1.2 },
        1200
      );
    }
  }, [selectedEntity?.id]);

  // Scroll selected card to top when selection changes
  useEffect(() => {
    if (selectedEntity && selectedCardRef.current) {
      setTimeout(() => {
        selectedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedEntity?.id]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCountryFilter("");
    setFilter("all");
    setMeetingFreqFilter("");
    setDietaryFilter("");
  }, []);

  const hasActiveFilters = searchQuery || countryFilter || filter !== "all" || meetingFreqFilter || dietaryFilter;

  // Mobile-first: on small screens, globe and cards stack vertically
  // On desktop (md+), use the overlay sidebar layout
  // Subtract top Navigation (64px) AND SmartBottomNav (~80px incl. safe-area)
  // so pins near the bottom of the globe aren't hidden behind the command center.
  const globeHeight = fullPage ? "calc(100dvh - 144px)" : "500px";
  const mobileGlobeHeight = fullPage ? "50vh" : "300px";

  // WebGL fallback: render accessible table when WebGL is unavailable
  if (!webglSupported) {
    return (
      <div className={`${fullPage ? "min-h-screen" : ""} bg-[#0a1f14] p-6 rounded-2xl`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1a472a]/80 border border-[#4a7c59]/40 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Globe className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
            <p className="text-white/80 text-sm">
              Interactive map not available in this browser. Here's a list of all locations.
            </p>
          </div>
          {/* Inline search for fallback view */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              placeholder="Search name, country, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none focus:border-[#7dd87d]/50"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {(["all", "land_project", "organization", "applicant"] as const).map((f) => (
              <FilterTab
                key={f}
                label={f === "all" ? "All" : f === "land_project" ? "Land Projects" : f === "organization" ? "Organizations" : "Applicants"}
                count={f === "all" ? allEntities.length : allEntities.filter(e => e.type === f).length}
                active={filter === f}
                onClick={() => setFilter(f)}
                color={f === "all" ? "bg-white/20 text-white" : f === "land_project" ? "bg-[#4a7c59] text-white" : f === "organization" ? "bg-[#d4a574] text-[#1a472a]" : "bg-[#f0f7f0] text-[#1a472a]"}
              />
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-white/80" aria-label="Regenerative land projects and organizations">
              <caption className="sr-only">Map entities: {filteredEntities.length} total</caption>
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th scope="col" className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wider">Name</th>
                  <th scope="col" className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wider">Type</th>
                  <th scope="col" className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wider">Location</th>
                  <th scope="col" className="text-left px-4 py-3 text-white/60 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Website</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity, i) => (
                  <tr key={entity.id} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""} hover:bg-white/5 transition-colors`}>
                    <td className="px-4 py-3 font-medium text-white">{entity.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        entity.type === "land_project" ? "bg-[#4a7c59]/20 text-[#4a7c59]" :
                        entity.type === "organization" ? "bg-[#d4a574]/20 text-[#d4a574]" :
                        "bg-[#f0f7f0]/20 text-[#f0f7f0]"
                      }`}>
                        {entity.type === "land_project" ? "Land Project" : entity.type === "organization" ? "Alliance Org" : "Applicant"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{entity.location}{entity.country ? `, ${entity.country}` : ""}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {entity.url && !entity.inactive ? (
                        <a href={entity.url} target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] hover:underline text-xs inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Visit
                        </a>
                      ) : entity.inactive ? (
                        <span className="text-white/55 text-xs line-through">Offline</span>
                      ) : <span className="text-white/55 text-xs">-</span>}
                    </td>
                  </tr>
                ))}
                {filteredEntities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/60">No results match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={fullPage ? "min-h-screen bg-[#0a1f14]" : ""}>
      {/* Desktop layout: globe with overlay sidebar */}
      <div className="hidden md:block relative w-full" style={{ minHeight: fullPage ? "calc(100dvh - 144px)" : "600px" }}>
        {/* Globe Container */}
        <div
          ref={globeRef}
          className="w-full rounded-2xl overflow-hidden"
          style={{ height: globeHeight, background: "radial-gradient(ellipse at center, #0a1f14 0%, #050d09 100%)" }}
          role="img"
          aria-label={`Interactive 3D globe showing ${filteredEntities.length} regenerative land projects and alliance organizations worldwide`}
        />

        {/* Screen reader data table, visually hidden, content matches globe pins */}
        <table className="sr-only" aria-label="Regenerative land projects and organizations on the map">
          <caption>Map entities: {filteredEntities.length} total</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Location</th>
              <th scope="col">Website</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntities.map((entity) => (
              <tr key={entity.id}>
                <td>{entity.name}</td>
                <td>{entity.type === "land_project" ? "Land Project" : entity.type === "organization" ? "Alliance Organization" : "Applicant"}</td>
                <td>{entity.country || (entity.isGlobal ? "Global" : "Unknown")}</td>
                <td>{entity.url ? <a href={entity.url}>{entity.url}</a> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Loading overlay */}
        {!globeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a1f14] rounded-2xl">
            <div className="text-center">
              <Globe className="w-12 h-12 text-[#7dd87d] animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading interactive globe...</p>
            </div>
          </div>
        )}

        {/* Filter Tabs - bottom center of the (now shortened) globe */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1a472a]/90 backdrop-blur-md p-2 rounded-full border border-[#4a7c59]/30 z-10">
          <FilterTab label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} color="bg-white/20 text-white" />
          <FilterTab label="Land Projects" count={counts.land_project} active={filter === "land_project"} onClick={() => setFilter("land_project")} color="bg-[#4a7c59] text-white" />
          <FilterTab label="Organizations" count={counts.organization} active={filter === "organization"} onClick={() => setFilter("organization")} color="bg-[#d4a574] text-[#1a472a]" />
          {counts.applicant > 0 && (
            <FilterTab label="Applicants" count={counts.applicant} active={filter === "applicant"} onClick={() => setFilter("applicant")} color="bg-[#f0f7f0] text-[#1a472a]" />
          )}
          <button
            onClick={() => setShowInactive(s => !s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showInactive ? 'bg-white/20 text-white' : 'bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30'
            }`}
            title={showInactive ? 'Showing all projects' : 'Hiding inactive projects'}
          >
            {showInactive ? 'Show All' : 'Active Only'}
          </button>
        </div>

        {/* Sidebar - Entity List (desktop overlay) */}
        <div className={`absolute top-0 right-0 h-full transition-all duration-300 z-10 ${sidebarOpen ? "w-72 lg:w-80" : "w-10"}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 -left-10 w-8 h-8 bg-[#1a472a]/90 backdrop-blur-md border border-[#4a7c59]/30 rounded-l-lg flex items-center justify-center text-white/70 hover:text-white z-20"
          >
            {sidebarOpen ? <ChevronDown className="w-4 h-4 rotate-90" /> : <ChevronUp className="w-4 h-4 rotate-90" />}
          </button>

          {sidebarOpen && (
            <div className="h-full bg-[#1a472a]/90 backdrop-blur-md border-l border-[#4a7c59]/30 rounded-r-2xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#4a7c59]/20">
                <h3 className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>Global Network</h3>
                <p className="text-white/50 text-xs mt-0.5">{filteredEntities.length} {filter === "all" ? "projects & organizations" : filter === "land_project" ? "land projects" : filter === "organization" ? "organizations" : "applicants"}</p>
                {/* Search */}
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search name, country, role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/55 focus:outline-none focus:border-[#7dd87d]/50 focus:ring-1 focus:ring-[#7dd87d]/30"
                  />
                </div>
                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="mt-2 flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-3 py-1.5 transition-colors w-full justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                  </span>
                  {hasActiveFilters && !showFilters && (
                    <span className="bg-[#7dd87d] text-[#1a472a] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {[countryFilter, meetingFreqFilter, dietaryFilter].filter(Boolean).length}
                    </span>
                  )}
                </button>
                {showFilters && (
                  <div className="mt-2 p-3 bg-black/40 border border-white/10 rounded-xl space-y-3">
                    <div>
                      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Country</p>
                      <CountryFilter countries={countries} selected={countryFilter} onSelect={setCountryFilter} />
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Community Engagement</p>
                      <select
                        value={meetingFreqFilter}
                        onChange={(e) => setMeetingFreqFilter(e.target.value)}
                        className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full"
                      >
                        <option value="" className="bg-[#1a472a] text-white">All Community Engagement</option>
                        <option value="everyday" className="bg-[#1a472a] text-white">Everyday</option>
                        <option value="2_3x_week" className="bg-[#1a472a] text-white">2–3× / week</option>
                        <option value="weekly" className="bg-[#1a472a] text-white">Weekly</option>
                        <option value="2_3x_month" className="bg-[#1a472a] text-white">2–3× / month</option>
                        <option value="monthly" className="bg-[#1a472a] text-white">Monthly</option>
                        <option value="2_3x_year" className="bg-[#1a472a] text-white">2–3× / year</option>
                        <option value="yearly_plus" className="bg-[#1a472a] text-white">Yearly or less</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Diet</p>
                      <select
                        value={dietaryFilter}
                        onChange={(e) => setDietaryFilter(e.target.value)}
                        className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full"
                      >
                        <option value="" className="bg-[#1a472a] text-white">All Diets</option>
                        <option value="vegan" className="bg-[#1a472a] text-white">Vegan</option>
                        <option value="vegetarian" className="bg-[#1a472a] text-white">Vegetarian</option>
                        <option value="plant_based" className="bg-[#1a472a] text-white">Plant-Based</option>
                        <option value="pescatarian" className="bg-[#1a472a] text-white">Pescatarian</option>
                        <option value="omnivore" className="bg-[#1a472a] text-white">Omnivore</option>
                        <option value="animal_based" className="bg-[#1a472a] text-white">Animal-Based</option>
                        <option value="keto" className="bg-[#1a472a] text-white">Keto</option>
                        <option value="no_shared_diets" className="bg-[#1a472a] text-white">No Shared Diets</option>
                      </select>
                    </div>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-xs text-[#7dd87d] hover:text-white flex items-center gap-1">
                        <X className="w-3 h-3" /> Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 globe-sidebar-scroll">
                {sortedFilteredEntities.map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    isSelected={selectedEntity?.id === entity.id}
                    onSelect={handleEntitySelect}
                    cardRef={selectedEntity?.id === entity.id ? selectedCardRef : undefined}
                  />
                ))}
                {filteredEntities.length === 0 && (
                  <div className="text-center py-8">
                    <Globe className="w-8 h-8 text-white/60 mx-auto mb-2" />
                    <p className="text-white/60 text-xs">No results match your filters</p>
                    <button onClick={clearFilters} className="text-xs text-[#7dd87d] mt-2 hover:underline">Clear filters</button>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-[#4a7c59]/20">
                <a href="/apply" className="block w-full text-center text-xs bg-[#7dd87d] text-[#1a472a] py-2 rounded-full font-bold hover:bg-[#9de89d] transition-colors">Apply as a New Land Project</a>
              </div>
            </div>
          )}
        </div>

        {/* Left side info (desktop) */}
        <div className="absolute top-4 left-4 z-10 max-w-xs">
          <h2 className="text-xl lg:text-2xl font-bold text-white leading-tight drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
            <span className="text-[#7dd87d]">Global Network</span>
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <a href="/connect?path=alliance" className="inline-flex items-center gap-2 px-4 py-2 border border-[#d4a574] text-[#d4a574] rounded-full text-xs font-semibold hover:bg-[#d4a574]/10 transition-colors w-fit">
              <Building2 className="w-3 h-3" /> Join as Alliance Partner
            </a>
            <a href="/apply" className="inline-flex items-center gap-2 px-4 py-2 border border-[#7dd87d] text-[#7dd87d] rounded-full text-xs font-semibold hover:bg-[#7dd87d]/10 transition-colors w-fit">
              <Leaf className="w-3 h-3" /> Register a Land Project
            </a>
          </div>
          {/* Legend for global entities */}
          {globalEntities.length > 0 && (
            <div className="mt-4 bg-[#1a472a]/80 backdrop-blur-sm p-3 rounded-lg border border-[#4a7c59]/20">
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1.5">Legend</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg width="14" height="20" viewBox="0 0 14 20"><polygon points="7,1 12,8 2,8" fill="#7dd87d" opacity="0.9" /><polygon points="7,4 13,13 1,13" fill="#5cb85c" opacity="0.85" /><polygon points="7,7 14,17 0,17" fill="#7dd87d" opacity="0.8" /><rect x="5.5" y="16" width="3" height="4" rx="1" fill="#5d3a1a" /></svg>
                  <span className="text-white/70 text-[10px]">Season 1 Projects (sized by acreage)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="20" viewBox="0 0 14 20"><polygon points="7,1 12,8 2,8" fill="#a3e635" opacity="0.9" /><polygon points="7,4 13,13 1,13" fill="#84cc16" opacity="0.85" /><polygon points="7,7 14,17 0,17" fill="#a3e635" opacity="0.8" /><rect x="5.5" y="16" width="3" height="4" rx="1" fill="#5d3a1a" /></svg>
                  <span className="text-white/70 text-[10px]">Season 2 Projects (lime green)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="20" viewBox="0 0 14 20"><path d="M7,20 Q9,14 7,8" stroke="#8b6914" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M7,8 Q3,2 1,4" stroke="#d4a574" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M7,8 Q11,2 13,4" stroke="#d4a574" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M7,8 Q7,1 7,2" stroke="#d4a574" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                  <span className="text-white/70 text-[10px]">Alliance Organizations (palm tree)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#f0f7f0] to-[#2563eb]" style={{ boxShadow: '0 0 4px rgba(135,206,235,0.6)' }} />
                  <span className="text-white/70 text-[10px]">Global / Orbiting Satellites</span>
                </div>
                {/* Size scale */}
                <div className="mt-1 pt-1 border-t border-white/10">
                  <p className="text-white/60 text-[9px] mb-1">Tree size by acreage:</p>
                  <div className="flex items-end gap-3 pl-1">
                    <div className="flex flex-col items-center">
                      <svg width="8" height="14" viewBox="0 0 8 14"><polygon points="4,1 7,6 1,6" fill="#7dd87d" opacity="0.8" /><polygon points="4,3 8,10 0,10" fill="#5cb85c" opacity="0.7" /><rect x="3" y="9" width="2" height="4" fill="#5d3a1a" /></svg>
                      <span className="text-white/55 text-[8px]">1-10</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <svg width="12" height="20" viewBox="0 0 12 20"><polygon points="6,1 10,7 2,7" fill="#7dd87d" opacity="0.8" /><polygon points="6,4 11,13 1,13" fill="#5cb85c" opacity="0.7" /><rect x="4.5" y="12" width="3" height="6" fill="#5d3a1a" /></svg>
                      <span className="text-white/55 text-[8px]">100+</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <svg width="16" height="26" viewBox="0 0 16 26"><polygon points="8,1 13,8 3,8" fill="#7dd87d" opacity="0.9" /><polygon points="8,4 14,14 2,14" fill="#5cb85c" opacity="0.85" /><polygon points="8,8 16,20 0,20" fill="#7dd87d" opacity="0.8" /><rect x="6" y="19" width="4" height="7" fill="#5d3a1a" /></svg>
                      <span className="text-white/55 text-[8px]">1000+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile layout: globe on top, cards below */}
      <div className="md:hidden">
        {/* Globe Container - mobile */}
        <div className="relative w-full" style={{ height: mobileGlobeHeight }}>
          <div
            ref={mobileGlobeRef}
            className="w-full h-full overflow-hidden rounded-b-2xl"
            style={{ background: "radial-gradient(ellipse at center, #0a1f14 0%, #050d09 100%)" }}
          />
          {/* Loading overlay - mobile */}
          {!globeReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a1f14] rounded-b-2xl">
              <div className="text-center">
                <Globe className="w-10 h-10 text-[#7dd87d] animate-spin mx-auto mb-2" />
                <p className="text-white/60 text-xs">Loading globe...</p>
              </div>
            </div>
          )}
          {/* Mobile title overlay */}
          <div className="absolute top-3 left-3 z-10">
            <h2 className="text-lg font-bold text-white leading-tight drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
              <span className="text-[#7dd87d]">Global Network</span>
            </h2>
          </div>
        </div>

        {/* Filter tabs - mobile (horizontal scroll) */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto bg-[#0a1f14] no-scrollbar">
          <FilterTab label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} color="bg-white/20 text-white" />
          <FilterTab label="Projects" count={counts.land_project} active={filter === "land_project"} onClick={() => setFilter("land_project")} color="bg-[#4a7c59] text-white" />
          <FilterTab label="Orgs" count={counts.organization} active={filter === "organization"} onClick={() => setFilter("organization")} color="bg-[#d4a574] text-[#1a472a]" />
          {counts.applicant > 0 && (
            <FilterTab label="Applicants" count={counts.applicant} active={filter === "applicant"} onClick={() => setFilter("applicant")} color="bg-[#f0f7f0] text-[#1a472a]" />
          )}
        </div>

        {/* Search + Country filter - mobile */}
        <div className="bg-[#0a1f14] px-4 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              placeholder="Search name, country, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:outline-none focus:border-[#7dd87d]/50 focus:ring-1 focus:ring-[#7dd87d]/30"
            />
          </div>
          {/* Filters toggle, mobile */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-3 py-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && !showFilters && (
              <span className="bg-[#7dd87d] text-[#1a472a] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {[countryFilter, meetingFreqFilter, dietaryFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          {showFilters && (
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-3">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Country</p>
                <CountryFilter countries={countries} selected={countryFilter} onSelect={setCountryFilter} />
              </div>
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Community Engagement</p>
                <select
                  value={meetingFreqFilter}
                  onChange={(e) => setMeetingFreqFilter(e.target.value)}
                  className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full"
                >
                  <option value="" className="bg-[#1a472a] text-white">All Community Engagement</option>
                  <option value="everyday" className="bg-[#1a472a] text-white">Everyday</option>
                  <option value="2_3x_week" className="bg-[#1a472a] text-white">2–3× / week</option>
                  <option value="weekly" className="bg-[#1a472a] text-white">Weekly</option>
                  <option value="2_3x_month" className="bg-[#1a472a] text-white">2–3× / month</option>
                  <option value="monthly" className="bg-[#1a472a] text-white">Monthly</option>
                  <option value="2_3x_year" className="bg-[#1a472a] text-white">2–3× / year</option>
                  <option value="yearly_plus" className="bg-[#1a472a] text-white">Yearly or less</option>
                </select>
              </div>
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Diet</p>
                <select
                  value={dietaryFilter}
                  onChange={(e) => setDietaryFilter(e.target.value)}
                  className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full"
                >
                  <option value="" className="bg-[#1a472a] text-white">All Diets</option>
                  <option value="vegan" className="bg-[#1a472a] text-white">Vegan</option>
                  <option value="vegetarian" className="bg-[#1a472a] text-white">Vegetarian</option>
                  <option value="plant_based" className="bg-[#1a472a] text-white">Plant-Based</option>
                  <option value="pescatarian" className="bg-[#1a472a] text-white">Pescatarian</option>
                  <option value="omnivore" className="bg-[#1a472a] text-white">Omnivore</option>
                  <option value="animal_based" className="bg-[#1a472a] text-white">Animal-Based</option>
                  <option value="keto" className="bg-[#1a472a] text-white">Keto</option>
                  <option value="no_shared_diets" className="bg-[#1a472a] text-white">No Shared Diets</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-[#7dd87d] hover:text-white flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Entity cards - mobile (scrollable list) */}
        <div className="bg-[#0a1f14] px-4 pb-4 space-y-2">
          <p className="text-white/50 text-xs pb-1">
            {filteredEntities.length} {filter === "all" ? "projects & organizations" : filter === "land_project" ? "land projects" : filter === "organization" ? "organizations" : "applicants"}
          </p>
          {sortedFilteredEntities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              isSelected={selectedEntity?.id === entity.id}
              onSelect={handleEntitySelect}
              cardRef={selectedEntity?.id === entity.id ? selectedCardRef : undefined}
            />
          ))}
          {filteredEntities.length === 0 && (
            <div className="text-center py-8">
              <Globe className="w-8 h-8 text-white/60 mx-auto mb-2" />
              <p className="text-white/60 text-sm">No results match your filters</p>
              <button onClick={clearFilters} className="text-sm text-[#7dd87d] mt-2 hover:underline">Clear filters</button>
            </div>
          )}
        </div>

        {/* Mobile CTAs */}
        <div className="bg-[#0a1f14] px-4 pb-6 flex flex-col gap-2">
          <a href="/apply" className="block w-full text-center text-sm bg-[#7dd87d] text-[#1a472a] py-3 rounded-full font-bold hover:bg-[#9de89d] transition-colors">Apply as a New Land Project</a>
          <a href="/connect?path=alliance" className="block w-full text-center text-s