/**
 * Connect Form - Catch-all Routing Form with 7 Pathways
 * Writes to Railway MySQL via trpc.generalInquiries.submit and trpc.newsletter.subscribe
 */

import { useState, useEffect } from "react";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Leaf, Users, Building2, TrendingUp, Home, Briefcase, Sparkles,
  ArrowRight, ArrowLeft, Check, Loader2, Mail, Globe, Heart,
  TreePine, Handshake, Rocket, Star, MapPin
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { PageWrapper } from "@/components/PageWrapper";
import { markNewsletterSubscribed } from "@/utils/newsletter";
import { cdnImg } from "@/lib/utils";

// Path types matching the database enum
type PathType = "land_partner" | "create_with_regens" | "alliance" | "finance" | "live" | "role" | "something_else";

// Path configuration with icons and descriptions
const paths = [
  {
    id: "land_partner" as PathType,
    title: "Land Partner",
    subtitle: "APPLY For Next Season",
    description: "I (co)steward/own land and would like to explore joining the Alliance",
    icon: Leaf,
    color: "from-[#4a7c59] to-[#7dd87d]",
    iconBg: "bg-[#7dd87d]",
    iconColor: "text-[#1a472a]",
  },
  {
    id: "create_with_regens" as PathType,
    title: "Create with ReGens",
    subtitle: "Collaborate",
    description: "I want to co-create with one/some of the Alliance Organizations",
    icon: Users,
    color: "from-[#2d5a3d] to-[#4a7c59]",
    iconBg: "bg-[#a8e6a8]",
    iconColor: "text-[#1a472a]",
  },
  {
    id: "alliance" as PathType,
    title: "Alliance Partner",
    subtitle: "Join as Organization",
    description: "I represent an organization and I want to explore joining the Alliance!",
    icon: Building2,
    color: "from-[#1a472a] to-[#2d5a3d]",
    iconBg: "bg-[#ffd700]",
    iconColor: "text-[#1a472a]",
  },
  {
    id: "finance" as PathType,
    title: "Finance the Renaissance",
    subtitle: "Invest",
    description: "I represent a Fund/Institution interested in Systemic ReGeneration",
    icon: TrendingUp,
    color: "from-[#d4a574] to-[#ffd700]",
    iconBg: "bg-[#ffd700]",
    iconColor: "text-[#1a472a]",
  },
  {
    id: "live" as PathType,
    title: "Live",
    subtitle: "Join a Community",
    description: "I want to co-create with one/some of the ReGen Land Projects",
    icon: Home,
    color: "from-[#4a7c59] to-[#a8e6a8]",
    iconBg: "bg-[#7dd87d]",
    iconColor: "text-[#1a472a]",
  },
  {
    id: "role" as PathType,
    title: "Role in ReGen Civics",
    subtitle: "Apply for a Role",
    description: "Apply for a role in ReGen Civics directly",
    icon: Briefcase,
    color: "from-[#7dd87d] to-[#a78bfa]",
    iconBg: "bg-[#a78bfa]",
    iconColor: "text-white",
  },
  {
    id: "something_else" as PathType,
    title: "Something Else?",
    subtitle: "Other",
    description: "I have a unique way I would like to contribute",
    icon: Sparkles,
    color: "from-[#d4a574] to-[#ffd700]",
    iconBg: "bg-[#f0ebe3]",
    iconColor: "text-[#1a472a]",
  },
];

// Alliance organizations list - Core Alliance Partners from /opportunity page
const allianceOrganizations = [
  { id: "all", name: "ALL - Send my details to all Alliance Organizations!", url: "", description: "Connect with the entire network" },
  { id: "hypha", name: "Hypha DAO", url: "hypha.earth", description: "Decentralized governance & treasury management" },
  { id: "seeds", name: "SEEDS", url: "joinseeds.earth", description: "Regenerative cryptocurrency ecosystem" },
  { id: "nestr", name: "Nestr.io", url: "nestr.io", description: "Decentralized collaboration platform" },
  { id: "kinship_earth", name: "Kinship Earth", url: "kinshipearth.org", description: "Flow Funding for grassroots leaders" },
  { id: "open_future", name: "Open Future Coalition", url: "openfuturecoalition.org", description: "Technical, social, and financial tools" },
  { id: "united_planet", name: "UP.Game (United Planet)", url: "up.game", description: "Immersive redesign game for regenerative solutions" },
  { id: "gaia_biolab", name: "Gaia Union BioLab", url: "gaia-union.com/biolab", description: "Bio-integral regenerative initiatives" },
  { id: "closer", name: "Closer.earth", url: "closer.earth", description: "Operating system for regenerative communities" },
  { id: "oasa", name: "OASA.earth", url: "oasa.earth", description: "Operating system for regenerative civilization" },
  { id: "planetary_party", name: "Planetary Party", url: "planetaryparty.co", description: "Bioregional gatherings" },
  { id: "dao_universe", name: "DAO Universe Club", url: "daouniverse.club", description: "Community for visionary DAO founders" },
  { id: "desa", name: "DESA", url: "desa.earth", description: "Land discovery, acquisition & legal support" },
  { id: "permatours", name: "Permatours", url: "permatours.org", description: "Festivals, events & project activation" },
  { id: "maptio", name: "Maptio", url: "maptio.com", description: "Organization mapping & coordination" },
  { id: "local_scale", name: "LocalScale", url: "localscale.org", description: "Bioregional economic tools" },
  { id: "other", name: "OTHER - Specify below", url: "", description: "" },
];

// Land projects list - Season 1 Projects from /opportunity page
const landProjects = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica", size: "432 acres", focus: "Blue Zone regenerative village" },
  { id: "starseed", name: "StarSeed Village", location: "Guatemala", size: "385 acres", focus: "Regenerative community" },
  { id: "nyx", name: "The Nyx", location: "Bali, Indonesia", size: "5 acres", focus: "Co-living & creative residency" },
  { id: "neighbourgood", name: "Our NeighbourGood", location: "New Zealand", size: "100+ acres", focus: "Ecovillage" },
  { id: "liminal", name: "Liminal Village", location: "Italy", size: "Various", focus: "Regenerative eco-village" },
  { id: "heartland", name: "Heartland Retreat", location: "California, USA", size: "Various", focus: "Eco-healing sanctuary" },
  { id: "tdf", name: "Traditional Dream Factory", location: "Portugal", size: "Various", focus: "Web3 regenerative village" },
  { id: "finca_sagrada", name: "Finca Sagrada", location: "Ecuador", size: "Various", focus: "Biodynamic community farm" },
  { id: "other", name: "OTHER - Specify below", location: "", size: "", focus: "" },
];

// Project progress checkboxes
const projectProgressOptions = [
  "Team of 3+ committed core members",
  "Land under a structure with team having 100% authority",
  "Vision, Mission, Purpose, Values, etc clearly defined",
  "Governance, legal and economic system designed",
  "3+ Families living on the land",
  "Producing 50%+ of own food",
  "Producing 50%+ own utilities",
  "Masterplan completed",
  "$1M+ USD invested",
];

// Role archetypes
const roleArchetypes = [
  { id: "builder", name: "Builder", icon: "🔨", description: "Creates tools, systems, and infrastructure" },
  { id: "connector", name: "Connector", icon: "🔗", description: "Bridges people, ideas, and resources" },
  { id: "researcher", name: "Researcher", icon: "🔬", description: "Explores, analyzes, and documents" },
  { id: "storyteller", name: "Storyteller", icon: "📖", description: "Shares narratives and communicates vision" },
  { id: "facilitator", name: "Facilitator", icon: "🎯", description: "Guides processes and enables collaboration" },
  { id: "healer", name: "Healer", icon: "💚", description: "Supports wellbeing and restoration" },
  { id: "guardian", name: "Guardian", icon: "🛡️", description: "Protects and maintains integrity" },
  { id: "visionary", name: "Visionary", icon: "🔮", description: "Sees possibilities and charts direction" },
  { id: "other", name: "Other", icon: "✨", description: "A unique archetype" },
];

// 9 Forms of Capital (based on regenerative economics)
const formsOfCapital = [
  { id: "financial", name: "Financial Capital", icon: "💰", description: "Money, investments, savings" },
  { id: "material", name: "Material Capital", icon: "🏗️", description: "Physical resources, tools, equipment" },
  { id: "living", name: "Living Capital", icon: "🌱", description: "Land, ecosystems, biodiversity" },
  { id: "intellectual", name: "Intellectual Capital", icon: "🧠", description: "Knowledge, ideas, expertise" },
  { id: "experiential", name: "Experiential Capital", icon: "🎓", description: "Skills, wisdom from experience" },
  { id: "social", name: "Social Capital", icon: "🤝", description: "Relationships, networks, trust" },
  { id: "cultural", name: "Cultural Capital", icon: "🎭", description: "Traditions, art, shared practices" },
  { id: "spiritual", name: "Spiritual Capital", icon: "✨", description: "Purpose, meaning, connection" },
  { id: "time", name: "Time Capital", icon: "⏰", description: "Hours, availability, dedication" },
];

// Combined Organisation Role and Support options (merged, no duplicates)
const orgRoleAndSupportOptions = [
  { id: "Coordination", name: "Coordination", icon: "🔗", description: "Coordinating networks, governance, and collaboration" },
  { id: "Bioregional Econ", name: "Bioregional Econ", icon: "🌿", description: "Local economies, marketplaces, ecosystem tokens" },
  { id: "Infrastructure", name: "Infrastructure", icon: "🏗️", description: "Physical systems, buildings, utilities" },
  { id: "Nourishment", name: "Nourishment", icon: "🍎", description: "Food systems, agriculture, nutrition" },
  { id: "Legal", name: "Legal", icon: "⚖️", description: "Legal structures, land trusts, compliance" },
  { id: "Funding", name: "Funding", icon: "💰", description: "Grants, flow funding, investment" },
  { id: "Growth/Media", name: "Growth/Media", icon: "📢", description: "Marketing, communications, storytelling" },
  { id: "Events", name: "Events", icon: "🎪", description: "Festivals, gatherings, retreats" },
  { id: "Education", name: "Education", icon: "📚", description: "Training, learning, knowledge sharing" },
  { id: "Technology", name: "Technology", icon: "💻", description: "Software, platforms, digital tools" },
  { id: "Wellness", name: "Wellness", icon: "❤️", description: "Health, wellbeing, healing practices" },
  { id: "Community Building", name: "Community Building", icon: "👥", description: "Social architecture, conflict resolution" },
  { id: "Land Services", name: "Land Services", icon: "🗺️", description: "Land discovery, acquisition, stewardship" },
  { id: "Spiritual", name: "Spiritual", icon: "🙏", description: "Ceremonies, practices, meaning-making" },
  { id: "Housing", name: "Housing", icon: "🏠", description: "Shelter, living spaces, construction" },
  { id: "Water Systems", name: "Water Systems", icon: "💧", description: "Collection, treatment, distribution" },
  { id: "Economics", name: "Economics", icon: "💱", description: "Financial systems, currencies, exchange" },
  { id: "Other", name: "Other", icon: "✨", description: "Something unique" },
];

// Organizational capital types (for Create with ReGens)
const organizationalCapitalTypes = [
  { id: "strategic", name: "Strategic Planning", icon: "🎯" },
  { id: "operations", name: "Operations & Logistics", icon: "⚙️" },
  { id: "marketing", name: "Marketing & Communications", icon: "📢" },
  { id: "fundraising", name: "Fundraising & Grants", icon: "💰" },
  { id: "legal", name: "Legal & Compliance", icon: "⚖️" },
  { id: "hr", name: "Human Resources", icon: "👥" },
  { id: "tech", name: "Technology & Systems", icon: "💻" },
  { id: "design", name: "Design & Creative", icon: "🎨" },
  { id: "research", name: "Research & Development", icon: "🔬" },
  { id: "community", name: "Community Engagement", icon: "🤝" },
];

export default function Connect() {
  const [step, setStep] = useState<"select" | "form" | "success">("select");
  const [selectedPath, setSelectedPath] = useState<PathType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Form data
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectInspiration, setProjectInspiration] = useState("");
  const [projectProgress, setProjectProgress] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [otherOrganization, setOtherOrganization] = useState("");
  const [organizationUrl, setOrganizationUrl] = useState("");
  const [partnershipDescription, setPartnershipDescription] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [otherProject, setOtherProject] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleInterest, setRoleInterest] = useState("");
  const [whyIdeal, setWhyIdeal] = useState("");
  const [seasonDeliverables, setSeasonDeliverables] = useState("");
  const [videoPitchUrl, setVideoPitchUrl] = useState("");
  const [cvWebsite, setCvWebsite] = useState("");
  const [uniqueContribution, setUniqueContribution] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  
  // New form fields for enhanced questions
  const [selectedCapitalTypes, setSelectedCapitalTypes] = useState<string[]>([]);
  const [allianceSupportCategories, setAllianceSupportCategories] = useState<string[]>([]);
  const [otherAllianceSupport, setOtherAllianceSupport] = useState("");
  const [allianceSupportDescription, setAllianceSupportDescription] = useState("");
  const [valueContribution, setValueContribution] = useState("");
  const [whyIdealFit, setWhyIdealFit] = useState("");
  const [organizationalCapital, setOrganizationalCapital] = useState<string[]>([]);
  
  // Alliance role/type/location fields
  const [selectedOrgRoles, setSelectedOrgRoles] = useState<string[]>([]);
  const [orgScope, setOrgScope] = useState<"local" | "global">("local");
  const [orgLatitude, setOrgLatitude] = useState<number | null>(null);
  const [orgLongitude, setOrgLongitude] = useState<number | null>(null);
  const [orgCountry, setOrgCountry] = useState("");
  
  // Pre-filled role data from Team page
  const [prefilledRole, setPrefilledRole] = useState<{ title: string; circle: string; purpose: string } | null>(null);
  
  // Handle path parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParam = urlParams.get('path');
    
    // Handle role pre-fill from Team page
    const roleParam = urlParams.get('role');
    const circleParam = urlParams.get('circle');
    const purposeParam = urlParams.get('purpose');
    
    if (roleParam) {
      setPrefilledRole({
        title: decodeURIComponent(roleParam),
        circle: circleParam ? decodeURIComponent(circleParam) : '',
        purpose: purposeParam ? decodeURIComponent(purposeParam) : ''
      });
      // Pre-fill the role interest with the role info
      setRoleInterest(`I'm interested in the ${decodeURIComponent(roleParam)} role in the ${circleParam ? decodeURIComponent(circleParam) : 'team'}.`);
    }
    
    // Handle project pre-selection from map
    const projectParam = urlParams.get('project');
    if (projectParam) {
      const projectId = decodeURIComponent(projectParam);
      // Find matching project by id or name
      const matchedProject = landProjects.find(
        (p) => p.id === projectId || p.name.toLowerCase() === projectId.toLowerCase()
      );
      if (matchedProject) {
        setSelectedProjects([matchedProject.id]);
      }
    }

    if (pathParam) {
      const validPaths: PathType[] = ['land_partner', 'create_with_regens', 'alliance', 'finance', 'live', 'role', 'something_else'];
      if (validPaths.includes(pathParam as PathType)) {
        handlePathSelect(pathParam as PathType);
      }
    }
  }, []);
  
  const newsletterMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => markNewsletterSubscribed(),
    onError: (error) => console.error("Newsletter subscription failed:", error.message),
  });
  
  const joinRequestMutation = trpc.projectJoinRequests.create.useMutation();

  const submitMutation = trpc.generalInquiries.submit.useMutation({
    onSuccess: () => {
      // Create project join requests for "live" (land project) and "alliance"/"create_with_regens" (org) paths
      if (selectedPath === "live" && selectedProjects.length > 0) {
        selectedProjects.forEach(projectId => {
          const project = landProjects.find(p => p.id === projectId);
          if (project && project.id !== "other") {
            joinRequestMutation.mutate({
              submitterName: fullName || email,
              submitterEmail: email,
              submitterMessage: additionalNotes || undefined,
              targetType: "land_project",
              targetId: project.id,
              targetName: project.name,
            });
          }
        });
      } else if ((selectedPath === "alliance" || selectedPath === "create_with_regens") && selectedOrganizations.length > 0) {
        selectedOrganizations.forEach(orgId => {
          const org = allianceOrganizations.find(o => o.id === orgId);
          if (org && org.id !== "all" && org.id !== "other") {
            joinRequestMutation.mutate({
              submitterName: fullName || email,
              submitterEmail: email,
              submitterMessage: partnershipDescription || additionalNotes || undefined,
              targetType: "alliance_org",
              targetId: org.id,
              targetName: org.name,
            });
          }
        });
      }
      setStep("success");
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Submission error:", error);
      setIsSubmitting(false);
      setSubmitError(error?.message || "Submission failed. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  
  const handlePathSelect = (pathId: PathType) => {
    setSelectedPath(pathId);
    // For finance path, redirect to investor form
    if (pathId === "finance") {
      window.location.href = "/investor";
      return;
    }
    // For land_partner, redirect to full application
    if (pathId === "land_partner") {
      window.location.href = "/apply";
      return;
    }
    setStep("form");
  };
  
  const handleSubmit = async () => {
    if (!selectedPath || !email) return;
    setSubmitError(null);
    setIsSubmitting(true);
    
    submitMutation.mutate({
      pathType: selectedPath,
      email,
      fullName: fullName || undefined,
      projectUrl: projectUrl || undefined,
      projectInspiration: projectInspiration || undefined,
      projectProgress: projectProgress.length > 0 ? JSON.stringify(projectProgress) : undefined,
      allianceOrganizations: selectedOrganizations.length > 0 ? JSON.stringify(selectedOrganizations) : undefined,
      otherOrganization: otherOrganization || undefined,
      organizationUrl: organizationUrl || undefined,
      organizationRole: selectedOrgRoles.length > 0 ? JSON.stringify(selectedOrgRoles) : undefined,
      organizationScope: orgScope || undefined,
      organizationLatitude: orgLatitude || undefined,
      organizationLongitude: orgLongitude || undefined,
      organizationCountry: orgCountry || undefined,
      partnershipDescription: partnershipDescription || undefined,
      landProjects: selectedProjects.length > 0 ? JSON.stringify(selectedProjects) : undefined,
      otherProject: otherProject || undefined,
      roleArchetypes: selectedRoles.length > 0 ? JSON.stringify(selectedRoles) : undefined,
      roleInterest: roleInterest || undefined,
      whyIdeal: whyIdeal || undefined,
      seasonDeliverables: seasonDeliverables || undefined,
      videoPitchUrl: videoPitchUrl || undefined,
      cvWebsite: cvWebsite || undefined,
      uniqueContribution: uniqueContribution || undefined,
      additionalNotes: additionalNotes || undefined,
      newsletterOptIn,
      // New fields
      capitalTypes: selectedCapitalTypes.length > 0 ? JSON.stringify(selectedCapitalTypes) : undefined,
      allianceSupportCategories: allianceSupportCategories.length > 0 ? JSON.stringify(allianceSupportCategories) : undefined,
      otherAllianceSupport: otherAllianceSupport || undefined,
      allianceSupportDescription: allianceSupportDescription || undefined,
      valueContribution: valueContribution || undefined,
      whyIdealFit: whyIdealFit || undefined,
      organizationalCapital: organizationalCapital.length > 0 ? JSON.stringify(organizationalCapital) : undefined,
    });
    
    // Auto-subscribe to newsletter if opted in
    if (newsletterOptIn && email) {
      newsletterMutation.mutate({
        email,
        name: fullName || undefined,
        source: "connect_form" as const,
      });
    }
  };
  
  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };
  
  const selectedPathConfig = paths.find(p => p.id === selectedPath);
  
  // Render path-specific form fields
  const renderPathFields = () => {
    switch (selectedPath) {
      case "create_with_regens":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                Which Alliance Organization(s) do you want to connect with?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select one or more organizations from our Alliance network. We will share your details with them.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allianceOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedOrganizations.includes(org.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20 shadow-md"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    } ${org.id === "all" ? "md:col-span-2" : ""}`}
                    onClick={() => toggleArrayItem(selectedOrganizations, setSelectedOrganizations, org.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedOrganizations.includes(org.id)}
                        onCheckedChange={() => toggleArrayItem(selectedOrganizations, setSelectedOrganizations, org.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white">{org.name}</p>
                          {selectedOrganizations.includes(org.id) && (
                            <Check className="w-5 h-5 text-[#7dd87d]" />
                          )}
                        </div>
                        {org.description && (
                          <p className="text-sm text-white/70 mt-1">{org.description}</p>
                        )}
                        {org.url && (
                          <p className="text-xs text-[#7dd87d]/80 mt-1 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {org.url}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedOrganizations.includes("other") && (
              <div>
                <Label htmlFor="otherOrg" className="text-white/90">Which other organization would you like to connect with?</Label>
                <Input
                  id="otherOrg"
                  value={otherOrganization}
                  onChange={(e) => setOtherOrganization(e.target.value)}
                  placeholder="Enter organization name"
                  className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                />
              </div>
            )}
            
            {/* Role Archetypes Question */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                Which role archetype(s) describe you best?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select all that resonate with how you naturally contribute.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roleArchetypes.map((role) => (
                  <div
                    key={role.id}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRoles.includes(role.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedRoles, setSelectedRoles, role.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{role.icon}</span>
                      <span className="font-medium text-white text-sm">{role.name}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Organizational Capital Question */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                What types of organizational capital can you contribute?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select all areas where you can add value to our alliance organizations.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {organizationalCapitalTypes.map((capital) => (
                  <div
                    key={capital.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      organizationalCapital.includes(capital.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(organizationalCapital, setOrganizationalCapital, capital.id)}
                  >
                    <span className="text-lg">{capital.icon}</span>
                    <span className="font-medium text-white text-xs">{capital.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Value Contribution Question */}
            <div>
              <Label htmlFor="valueContribution" className="text-lg font-semibold text-white/90">
                What types of value do you see yourself adding to the organization?
              </Label>
              <p className="text-sm text-white/60 mb-2">Share your skills, experience, and what you can contribute.</p>
              <Textarea
                id="valueContribution"
                value={valueContribution}
                onChange={(e) => setValueContribution(e.target.value)}
                placeholder="E.g., I have experience in project management and can help coordinate initiatives..."
                className="mt-2 min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>

            {/* Why Ideal Fit Question */}
            <div>
              <Label htmlFor="whyIdealFit" className="text-lg font-semibold text-white/90">
                Why would you be an ideal fit for working with our alliance organizations?
              </Label>
              <p className="text-sm text-white/60 mb-2">Tell us about your alignment with regenerative values and collaborative work.</p>
              <Textarea
                id="whyIdealFit"
                value={whyIdealFit}
                onChange={(e) => setWhyIdealFit(e.target.value)}
                placeholder="Share what draws you to this work and how you see yourself contributing..."
                className="mt-2 min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
          </div>
        );
        
      case "alliance":
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="orgUrl" className="text-white/90">Best link to explore your organization?</Label>
              <Input
                id="orgUrl"
                type="url"
                value={organizationUrl}
                onChange={(e) => setOrganizationUrl(e.target.value)}
                placeholder="https://your-organization.com"
                className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>

            {/* Organisation Role and Support - Single Combined Section */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-2 block">
                Organisation Role and Support
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select all roles and support areas that describe your organization. These will appear as tags on the global map.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {orgRoleAndSupportOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOrgRoles.includes(option.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedOrgRoles, setSelectedOrgRoles, option.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-medium text-white text-xs">{option.name}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Organization Scope: Local vs Global */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-2 block">
                Is your organization location-based or global?
              </Label>
              <p className="text-sm text-white/60 mb-3">
                Location-based organizations appear pinned on the map. Global organizations orbit the globe as satellites.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrgScope("local")}
                  className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                    orgScope === "local"
                      ? "border-[#7dd87d] bg-[#7dd87d]/20"
                      : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                  }`}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-1 text-[#7dd87d]" />
                  <span className="font-semibold text-white text-sm block">Location-Based</span>
                  <span className="text-xs text-white/70">We have a physical HQ or base</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrgScope("global")}
                  className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                    orgScope === "global"
                      ? "border-[#7dd87d] bg-[#7dd87d]/20"
                      : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                  }`}
                >
                  <Globe className="w-6 h-6 mx-auto mb-1 text-[#7dd87d]" />
                  <span className="font-semibold text-white text-sm block">Global</span>
                  <span className="text-xs text-white/70">We operate everywhere</span>
                </button>
              </div>
            </div>

            {/* Location fields (only for local scope) */}
            {orgScope === "local" && (
              <div className="bg-white/5 p-4 rounded-lg border border-white/20">
                <Label className="text-white/90 font-semibold flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#7dd87d]" />
                  Pin Your Organization on the Map
                </Label>
                <p className="text-sm text-white/60 mb-3">
                  Your organization will appear on our interactive globe map.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label htmlFor="orgLat" className="text-xs text-white/70">Latitude</Label>
                    <Input
                      id="orgLat"
                      type="number"
                      step="any"
                      value={orgLatitude ?? ""}
                      onChange={(e) => setOrgLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 48.8566"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgLng" className="text-xs text-white/70">Longitude</Label>
                    <Input
                      id="orgLng"
                      type="number"
                      step="any"
                      value={orgLongitude ?? ""}
                      onChange={(e) => setOrgLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 2.3522"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label htmlFor="orgCountry" className="text-xs text-white/70">Country</Label>
                  <Input
                    id="orgCountry"
                    value={orgCountry}
                    onChange={(e) => setOrgCountry(e.target.value)}
                    placeholder="e.g. France"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setOrgLatitude(Math.round(pos.coords.latitude * 10000) / 10000);
                          setOrgLongitude(Math.round(pos.coords.longitude * 10000) / 10000);
                        },
                        () => alert("Could not get your location. Please enter coordinates manually.")
                      );
                    }
                  }}
                  className="text-sm text-[#7dd87d] hover:text-white underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> Use my current location
                </button>
                <p className="text-xs text-white/60 mt-2">
                  Tip: Right-click your location on Google Maps to copy coordinates.
                </p>
              </div>
            )}
            
            {/* Alliance Support Categories - moved into combined section above */}
            
            {selectedOrgRoles.includes("Other") && (
              <div>
                <Label htmlFor="otherAllianceSupport" className="text-white/90">Please describe your other support category:</Label>
                <Input
                  id="otherAllianceSupport"
                  value={otherAllianceSupport}
                  onChange={(e) => setOtherAllianceSupport(e.target.value)}
                  placeholder="Enter your support category"
                  className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                />
              </div>
            )}
            
            {/* Alliance Support Description */}
            <div>
              <Label htmlFor="allianceSupportDescription" className="text-lg font-semibold text-white/90">
                Please describe how your alliance supports land projects:
              </Label>
              <p className="text-sm text-white/60 mb-2">Share specific services, resources, or expertise you offer.</p>
              <Textarea
                id="allianceSupportDescription"
                value={allianceSupportDescription}
                onChange={(e) => setAllianceSupportDescription(e.target.value)}
                placeholder="E.g., We provide governance consulting and help land projects establish democratic decision-making structures..."
                className="mt-2 min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
            
            <div>
              <Label htmlFor="partnership" className="text-white/90">
                Tell us more about how our partnership will help create a diversity of Regenerative Cultures!
              </Label>
              <Textarea
                id="partnership"
                value={partnershipDescription}
                onChange={(e) => setPartnershipDescription(e.target.value)}
                placeholder="Share your vision for partnership..."
                className="mt-2 min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
          </div>
        );
        
      case "live":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                Which Land Project(s) would you like to live with or visit?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select one or more projects. We will send your details to the project coordinator(s).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {landProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedProjects.includes(project.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20 shadow-md"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedProjects, setSelectedProjects, project.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleArrayItem(selectedProjects, setSelectedProjects, project.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white">{project.name}</p>
                          {selectedProjects.includes(project.id) && (
                            <Check className="w-5 h-5 text-[#7dd87d]" />
                          )}
                        </div>
                        {project.location && (
                          <p className="text-sm text-white/70 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {project.location}
                          </p>
                        )}
                        {project.size && project.id !== "other" && (
                          <p className="text-xs text-white/60 mt-1">{project.size}</p>
                        )}
                        {project.focus && project.id !== "other" && (
                          <p className="text-xs text-[#7dd87d] font-medium mt-1 bg-[#7dd87d]/20 px-2 py-0.5 rounded-full inline-block">
                            {project.focus}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedProjects.includes("other") && (
              <div>
                <Label htmlFor="otherProject" className="text-white/90">Which other project are you interested in?</Label>
                <Input
                  id="otherProject"
                  value={otherProject}
                  onChange={(e) => setOtherProject(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                />
              </div>
            )}
            
            {/* Role Archetypes Question */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                Which role archetype(s) describe you best?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select all that resonate with how you naturally contribute.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roleArchetypes.map((role) => (
                  <div
                    key={role.id}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRoles.includes(role.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedRoles, setSelectedRoles, role.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{role.icon}</span>
                      <span className="font-medium text-white text-sm">{role.name}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 9 Forms of Capital Question */}
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                What types of capital would you like to bring to the project?
              </Label>
              <p className="text-sm text-white/60 mb-4">
                Select all forms of capital you can contribute.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formsOfCapital.map((capital) => (
                  <div
                    key={capital.id}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
                      selectedCapitalTypes.includes(capital.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedCapitalTypes, setSelectedCapitalTypes, capital.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{capital.icon}</span>
                      <span className="font-medium text-white text-sm">{capital.name}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 break-words">{capital.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Value Contribution Question */}
            <div>
              <Label htmlFor="valueContribution" className="text-lg font-semibold text-white/90">
                What types of value do you see yourself adding to the land project?
              </Label>
              <p className="text-sm text-white/60 mb-2">Share your skills, experience, and what you can contribute.</p>
              <Textarea
                id="valueContribution"
                value={valueContribution}
                onChange={(e) => setValueContribution(e.target.value)}
                placeholder="E.g., I have 5 years of permaculture experience and can help design food forests..."
                className="mt-2 min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>

            {/* Why Ideal Fit Question */}
            <div>
              <Label htmlFor="whyIdealFit" className="text-lg font-semibold text-white/90">
                Why would you be an ideal fit for this community?
              </Label>
              <p className="text-sm text-white/60 mb-2">Tell us about your alignment with regenerative living and community values.</p>
              <Textarea
                id="whyIdealFit"
                value={whyIdealFit}
                onChange={(e) => setWhyIdealFit(e.target.value)}
                placeholder="Share what draws you to community living and how you see yourself contributing..."
                className="mt-2 min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
          </div>
        );
        
      case "role":
        return (
          <div className="space-y-6">
            {/* Pre-filled role card from Team page */}
            {prefilledRole && (
              <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/10 border-2 border-[#7dd87d] rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#7dd87d] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#7dd87d] font-medium uppercase tracking-wide mb-1">Applying for Role</p>
                    <h3 className="text-lg font-bold text-white">{prefilledRole.title}</h3>
                    <p className="text-sm text-[#7dd87d] mt-1">{prefilledRole.circle}</p>
                    {prefilledRole.purpose && (
                      <p className="text-sm text-white/70 mt-2">{prefilledRole.purpose}</p>
                    )}
                  </div>
                  <Check className="w-6 h-6 text-[#7dd87d]" />
                </div>
              </div>
            )}
            
            <div>
              <Label className="text-lg font-semibold text-white/90 mb-4 block">
                Which role archetype(s) describe you best?
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roleArchetypes.map((role) => (
                  <div
                    key={role.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRoles.includes(role.id)
                        ? "border-[#7dd87d] bg-[#7dd87d]/20"
                        : "border-white/20 bg-white/10 hover:border-[#7dd87d]/50"
                    }`}
                    onClick={() => toggleArrayItem(selectedRoles, setSelectedRoles, role.id)}
                  >
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-medium text-white">{role.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="roleInterest" className="text-white/90">
                What role(s) are you expressing interest in? If they do not exist on the site, you can make one up here.
              </Label>
              <Textarea
                id="roleInterest"
                value={roleInterest}
                onChange={(e) => setRoleInterest(e.target.value)}
                placeholder="Describe the role(s) you are interested in..."
                className="mt-2 min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
            
            <div>
              <Label htmlFor="whyIdeal" className="text-lg font-semibold text-white/90">
                Why would you be ideal for this role?
              </Label>
              <p className="text-sm text-white/60 mb-2">Share your relevant experience, skills, and what makes you a great fit.</p>
              <Textarea
                id="whyIdeal"
                value={whyIdeal}
                onChange={(e) => setWhyIdeal(e.target.value)}
                placeholder="Tell us about your background, relevant experience, and why you're passionate about this role..."
                className="mt-2 min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
            
            <div>
              <Label htmlFor="seasonDeliverables" className="text-lg font-semibold text-white/90">
                What do you intend to deliver over the next season?
              </Label>
              <p className="text-sm text-white/60 mb-2">Describe specific outcomes, projects, or contributions you plan to make.</p>
              <Textarea
                id="seasonDeliverables"
                value={seasonDeliverables}
                onChange={(e) => setSeasonDeliverables(e.target.value)}
                placeholder="E.g., Complete 3 community workshops, develop a permaculture curriculum, coordinate 2 volunteer events..."
                className="mt-2 min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
            
            <div>
              <Label htmlFor="videoPitchUrl" className="text-lg font-semibold text-white/90">
                3-Minute Video Pitch
              </Label>
              <p className="text-sm text-white/60 mb-2">Record a short video introducing yourself and your pitch for this role. Upload it to YouTube, Loom, Google Drive, or any hosting service and paste the link here.</p>
              <Input
                id="videoPitchUrl"
                type="url"
                value={videoPitchUrl}
                onChange={(e) => setVideoPitchUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
                className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>

            <div>
              <Label htmlFor="cvWebsite" className="text-lg font-semibold text-white/90">
                CV, Portfolio, or Website (Optional)
              </Label>
              <p className="text-sm text-white/60 mb-2">Share a link to your CV, portfolio, LinkedIn, or personal website.</p>
              <Input
                id="cvWebsite"
                type="url"
                value={cvWebsite}
                onChange={(e) => setCvWebsite(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile or your website URL"
                className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
          </div>
        );
        
      case "something_else":
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="uniqueContribution" className="text-lg font-semibold text-white/90">
                Tell us more! What unique way would you like to contribute?
              </Label>
              <Textarea
                id="uniqueContribution"
                value={uniqueContribution}
                onChange={(e) => setUniqueContribution(e.target.value)}
                placeholder="Share your unique ideas and how you would like to contribute..."
                className="mt-2 min-h-[150px] bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Path selection screen
  if (step === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
        {/* Hero Section - Enchanted Forest Style */}
        <div className="relative overflow-hidden py-16 md:py-24">
          {/* Ambient glow effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-64 h-64 bg-[#7dd87d]/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#ffd700]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4a7c59]/20 rounded-full blur-3xl" />
          </div>
          
          <div className="container relative z-10 text-center">
            <div data-reveal>
              {/* Logo */}
              <div className="mb-6">
                <img
                  src={cdnImg("https://assets.regencivics.earth/qtPtaaJfgElzmVAI.png")}
                  alt="ReGen Civics"
                  className="w-20 h-20 md:w-24 md:h-24 mx-auto object-contain drop-shadow-lg"
                  width="96"
                  height="96"
                  loading="lazy"
                />
              </div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-[#7dd87d]/30">
                <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" />
                <span className="text-[#7dd87d] font-medium" style={{ fontFamily: 'var(--font-accent)' }}>Welcome to the ReGenerative Renaissance</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                Hi Friend! <span className="text-[#7dd87d]">Which Path Calls to You?</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed safe-prose">
                This short form helps us know what types of opportunities to connect with you about,
                so all our communications are relevant to you.
              </p>
              
              <p className="text-sm text-[#7dd87d]/60 mt-4" style={{ fontFamily: 'var(--font-accent)' }}>
                If more than one applies, feel free to fill out this form multiple times.
              </p>
            </div>
          </div>
        </div>
        
        {/* Path Selection Grid - Forest-themed cards */}
        <div className="container py-8 md:py-12 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {paths.map((path, index) => {
              const Icon = path.icon;
              return (
                <div
                  key={path.id}
                  data-reveal
                  className="cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-[#7dd87d]/30 bg-white/10 backdrop-blur-sm hover:bg-white/15 hover:border-[#7dd87d]/60 hover:shadow-2xl hover:shadow-[#7dd87d]/20 hover:-translate-y-1 transition-all duration-300 p-6"
                  onClick={() => handlePathSelect(path.id)}
                >
                    {/* Subtle gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${path.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
                    
                    <div className="relative z-10">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl ${path.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
                          <Icon className={`w-7 h-7 ${path.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-[#7dd87d]/70 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-accent)' }}>
                            {path.subtitle}
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                            {path.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed mt-3">
                        {path.description}
                      </p>
                      <div className="mt-4 flex items-center text-[#7dd87d] font-medium text-sm group-hover:text-[#9de89d] transition-colors" style={{ fontFamily: 'var(--font-accent)' }}>
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer Note */}
          <div className="text-center mt-12">
            <p className="text-white/70 text-sm">
              Already have an account?{" "}
              <Link href="/apply" className="text-[#7dd87d] font-medium hover:underline">
                Continue your application
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Success screen
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center p-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#7dd87d]/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ffd700]/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-lg w-full relative z-10">
          <div className="rounded-2xl border-2 border-[#7dd87d]/40 bg-white/10 backdrop-blur-sm p-8 md:p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Thank You, Friend!
              </h2>
              
              <p className="text-white/70 mb-6">
                Your inquiry has been received. We will be in touch soon with relevant opportunities 
                based on your interests.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline" className="border-2 border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10">
                    Return Home
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setStep("select");
                    setSelectedPath(null);
                    setEmail("");
                    setFullName("");
                  }}
                  className="bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffed4e] hover:to-[#9de89d] text-[#1a472a] font-semibold"
                >
                  Submit Another Inquiry
                </Button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <PageWrapper>
    <SEO {...pageSEO.connect} />
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      {/* Header */}
      <div className="py-8">
        <div className="container">
          <button
            onClick={() => setStep("select")}
            className="flex items-center gap-2 text-[#7dd87d] hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Path Selection</span>
          </button>
          
          {selectedPathConfig && (
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${selectedPathConfig.iconBg} flex items-center justify-center shadow-lg`}>
                <selectedPathConfig.icon className={`w-6 h-6 ${selectedPathConfig.iconColor}`} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {selectedPathConfig.title}
                </h1>
                <p className="text-white/70 text-sm">{selectedPathConfig.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Form Content */}
      <div className="container py-4 md:py-8 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border-2 border-[#7dd87d]/30 bg-[#1a472a]/90 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 overflow-x-hidden min-w-0 safe-prose">
              {/* Path-specific fields */}
              {renderPathFields()}
              
              {/* Common fields */}
              <div className="border-t border-white/20 pt-8 space-y-6">
                <h3 className="text-lg font-semibold text-white/90">Contact Information</h3>

                <div>
                  <Label htmlFor="fullName" className="text-white/90">Your Name (Optional)</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white/90">Best Email to Reach You *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-white/90">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Anything else you would like to share..."
                    className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="newsletter"
                    checked={newsletterOptIn}
                    onCheckedChange={(checked) => setNewsletterOptIn(checked as boolean)}
                  />
                  <Label htmlFor="newsletter" className="text-sm text-white/70 cursor-pointer">
                    Subscribe to our newsletter for updates on the ReGenerative Renaissance
                  </Label>
                </div>
              </div>
              
              {/* Submit error summary */}
              {submitError && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-400">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!email || isSubmitting}
                  className="w-full bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffed4e] hover:to-[#9de89d] text-[#1a472a] py-6 text-lg font-semibold shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Submit Inquiry
                    </>
                  )}
                </Button>
              </div>
              <DataProtectionBadge compact className="mt-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageWrapper>
  );
}
