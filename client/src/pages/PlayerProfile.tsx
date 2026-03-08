/**
 * Player Profile Page
 * Connect Game elements to database with Base blockchain account linking
 * Players can create profiles and link their Hypha/Base accounts
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { TaoSpinner } from '@/components/TaoSpinner';
import {
  User,
  Wallet,
  Link2,
  Shield,
  Trophy,
  Star,
  Coins,
  ExternalLink,
  Edit,
  Save,
  ArrowRight,
  Home as HomeIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
  Info,
  Share2,
  X,
  LayoutGrid,
  BookOpen,
  Leaf,
  Settings,
  Plus,
  Trash2,
  BadgeCheck,
  DollarSign,
  Users as UsersIcon,
  Palette,
  Sprout,
  Lightbulb,
  Zap,
  Hammer,
  Heart,
  FolderOpen,
  MapPin,
  Layers,
  Calculator as CalculatorIcon,
  TrendingUp,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnimatedSection } from '@/components/AnimatedSection';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { ProfileEditForm } from '@/components/ProfileEditForm';
import { SEO } from '@/components/SEO';
import { SeedOfLifeIcon } from '@/components/SeedOfLifeIcon';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { toast } from 'sonner';
import { BackButton } from "@/components/BackButton";
import { DigestPreferences } from "@/components/DigestPreferences";

// Badge definitions
const badgeDefinitions: Record<string, { name: string; icon: string; description: string; color: string }> = {
  'season1_participant': { name: 'Season 1 Pioneer', icon: '🌱', description: 'Participated in ReGen Civics Season 1', color: 'bg-emerald-500' },
  'season2_participant': { name: 'Season 2 Player', icon: '🎮', description: 'Active participant in Season 2', color: 'bg-blue-500' },
  'land_steward': { name: 'Land Steward', icon: '🌍', description: 'Connected to a land project', color: 'bg-amber-500' },
  'investor': { name: 'Impact Investor', icon: '💰', description: 'Committed investment to the alliance', color: 'bg-purple-500' },
  'builder': { name: 'Builder', icon: '🔨', description: 'Contributed to building the infrastructure', color: 'bg-orange-500' },
  'connector': { name: 'Connector', icon: '🔗', description: 'Brought new members to the community', color: 'bg-pink-500' },
  'verified': { name: 'Verified Player', icon: '✓', description: 'Identity verified on-chain', color: 'bg-green-500' },
};

// Profile Creation Form
function CreateProfileForm({ onSuccess }: { onSuccess: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [baseAccountName, setBaseAccountName] = useState('');
  const [hyphaProfileUrl, setHyphaProfileUrl] = useState('');
  
  const createMutation = trpc.playerProfiles.create.useMutation({
    onSuccess: () => {
      toast.success('Profile created successfully!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create profile');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    createMutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      baseAccountName: baseAccountName.trim() || undefined,
      hyphaProfileUrl: hyphaProfileUrl.trim() || undefined,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-medium text-[#1a472a] mb-2 block">Display Name *</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your player name"
          className="border-[#1a472a]/20"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-[#1a472a] mb-2 block">Bio</label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself and your regenerative journey..."
          className="border-[#1a472a]/20 min-h-[100px]"
        />
      </div>
      
      <div className="bg-[#f0ebe3] p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2 text-[#1a472a]">
          <Wallet className="w-5 h-5 text-[#7dd87d]" />
          <span className="font-medium">Link Your Base Blockchain Account</span>
          <Badge variant="outline" className="text-xs">Optional</Badge>
        </div>
        <p className="text-sm text-[#1a472a]/70">
          Connect your Base blockchain account to verify your on-chain identity and track your RVOICE/RGEN tokens.
        </p>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm text-[#1a472a]/70">Base Blockchain Account</label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-[#7dd87d] hover:text-[#4a7c59] transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b border-[#7dd87d]/20">
                  <h4 className="font-semibold text-[#1a472a] text-sm">Where do I find this?</h4>
                </div>
                <div className="p-3">
                  <img 
                    src="https://assets.regencivics.earth/KAyoJaDXiKUFGzWz.png" 
                    alt="Hypha profile showing account address with copy icon"
                    className="w-full rounded-lg border border-[#1a472a]/10 mb-3"
                  loading="lazy" />
                  <ol className="text-sm text-[#1a472a]/70 space-y-2 list-decimal list-inside">
                    <li>Go to <a href="https://app.hypha.earth/en/dho/regen-games/" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] underline">app.hypha.earth/en/dho/regen-games/</a></li>
                    <li>Look at the top right of the page</li>
                    <li>Find your account address (e.g., 0xaAaF...354e)</li>
                    <li>Click the <strong>copy icon</strong> next to your address</li>
                    <li>Paste it here!</li>
                  </ol>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            value={baseAccountName}
            onChange={(e) => setBaseAccountName(e.target.value)}
            placeholder="e.g., 0xaAaF...354e"
            className="border-[#1a472a]/20 font-mono"
          />
        </div>
        
        <div>
          <label className="text-sm text-[#1a472a]/70 mb-1 block">Hypha Profile URL</label>
          <Input
            value={hyphaProfileUrl}
            onChange={(e) => setHyphaProfileUrl(e.target.value)}
            placeholder="https://hypha.earth/profile/yourname"
            className="border-[#1a472a]/20"
          />
        </div>
        
        <a 
          href="https://app.hypha.earth/en/network"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[#7dd87d] hover:underline"
        >
          Create a Hypha account <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Profile...
          </>
        ) : (
          <>
            <User className="w-4 h-4 mr-2" />
            Create Player Profile
          </>
        )}
      </Button>
    </form>
  );
}

// Link Base Account Dialog
function LinkBaseAccountDialog({ onSuccess }: { onSuccess: () => void }) {
  const [baseAccountName, setBaseAccountName] = useState('');
  const [hyphaProfileUrl, setHyphaProfileUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const linkMutation = trpc.playerProfiles.linkBaseAccount.useMutation({
    onSuccess: () => {
      toast.success('Base account linked successfully!');
      setIsOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to link account');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseAccountName.trim()) {
      toast.error('Please enter your Base account name');
      return;
    }
    linkMutation.mutate({
      baseAccountName: baseAccountName.trim(),
      hyphaProfileUrl: hyphaProfileUrl.trim() || undefined,
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d]/10">
          <Link2 className="w-4 h-4 mr-2" />
          Link Base Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#7dd87d]" />
            Link Your Base Blockchain Account
          </DialogTitle>
          <DialogDescription>
            Connect your Base blockchain account to verify your identity and track your tokens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">Base Blockchain Account *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-[#7dd87d] hover:text-[#4a7c59] transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b border-[#7dd87d]/20">
                    <h4 className="font-semibold text-[#1a472a] text-sm">Where do I find this?</h4>
                  </div>
                  <div className="p-3">
                    <img 
                      src="https://assets.regencivics.earth/KAyoJaDXiKUFGzWz.png" 
                      alt="Hypha profile showing account address with copy icon"
                      className="w-full rounded-lg border border-[#1a472a]/10 mb-3"
                    loading="lazy" />
                    <ol className="text-sm text-[#1a472a]/70 space-y-2 list-decimal list-inside">
                      <li>Go to <a href="https://app.hypha.earth/en/dho/regen-games/" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] underline">app.hypha.earth</a></li>
                      <li>Look at the top right corner</li>
                      <li>Click the <strong>copy icon</strong> next to your address</li>
                    </ol>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              value={baseAccountName}
              onChange={(e) => setBaseAccountName(e.target.value)}
              placeholder="e.g., 0xaAaF...354e"
              className="font-mono"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Hypha Profile URL</label>
            <Input
              value={hyphaProfileUrl}
              onChange={(e) => setHyphaProfileUrl(e.target.value)}
              placeholder="https://hypha.earth/profile/yourname"
            />
          </div>
          
          <div className="bg-[#f0ebe3] border border-[#7dd87d]/30 rounded-lg p-3">
            <img 
              src="https://assets.regencivics.earth/KAyoJaDXiKUFGzWz.png" 
              alt="Hypha profile showing account address"
              className="w-full rounded-lg border border-[#1a472a]/10 mb-3"
            loading="lazy" />
            <p className="text-sm text-[#1a472a]/70">
              <strong>Find your account:</strong> Visit <a href="https://app.hypha.earth/en/dho/regen-games/" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] underline">app.hypha.earth</a>, look at the top right, and click the copy icon next to your address.
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
            disabled={linkMutation.isPending}
          >
            {linkMutation.isPending ? 'Linking...' : 'Link Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Profile Display Card
function ProfileCard({ profile, isOwner, onUpdate, onSyncTokens, syncIsPending }: {
  profile: any;
  isOwner: boolean;
  onUpdate: () => void;
  onSyncTokens?: () => void;
  syncIsPending?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const badges: string[] = profile.badges ? JSON.parse(profile.badges) : [];
  
  const copyWalletAddress = () => {
    if (profile.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10 overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#7dd87d] flex items-center justify-center border-4 border-white/20">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full rounded-full object-cover" loading="lazy" />
              ) : (
                <User className="w-10 h-10 text-[#1a472a]" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {profile.displayName}
              </h2>
              {profile.isVerified ? (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mt-1">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified Player
                </Badge>
              ) : (
                <Badge variant="outline" className="text-white/60 border-white/30 mt-1">
                  Unverified
                </Badge>
              )}
            </div>
          </div>
          {isOwner && (
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <CardContent className="p-6 space-y-6">
        {/* Bio */}
        {profile.bio && (
          <div>
            <h3 className="text-sm font-medium text-[#1a472a]/60 mb-2">About</h3>
            <p className="text-[#1a472a]">{profile.bio}</p>
          </div>
        )}
        
        {/* Token Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#f0ebe3] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#7dd87d]">{profile.rvoiceBalance || 0}</p>
            <p className="text-sm text-[#1a472a]/60">RGVoice Tokens</p>
          </div>
          <div className="bg-[#f0ebe3] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#7dd87d]">{profile.rgenBalance || 0}</p>
            <p className="text-sm text-[#1a472a]/60">ReGen Tokens</p>
          </div>
        </div>
        {isOwner && onSyncTokens && (
          profile.walletAddress ? (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={onSyncTokens}
                disabled={syncIsPending}
                className="flex items-center gap-1.5 text-[#4a7c59]/70 hover:text-[#4a7c59] text-xs transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${syncIsPending ? "animate-spin" : ""}`} />
                {syncIsPending ? "Syncing..." : "Refresh balances"}
              </button>
              {profile.lastTokenSync && (
                <span className="text-[#1a472a]/30 text-xs">
                  Updated {new Date(profile.lastTokenSync).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[#1a472a]/40 text-xs mt-1">
              Add your wallet address in Settings to sync balances.
            </p>
          )
        )}
        
        {/* Contribution Value */}
        <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a9f4a]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-[#1a472a] font-medium">Total Contribution Value</span>
            </div>
            <span className="text-2xl font-bold text-[#1a472a]">
              ${(profile.totalContributionValue || 0).toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Badges */}
        {badges.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#1a472a]/60 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Badges Earned
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badgeId) => {
                const badge = badgeDefinitions[badgeId];
                if (!badge) return null;
                return (
                  <Badge 
                    key={badgeId} 
                    className={`${badge.color} text-white`}
                    title={badge.description}
                  >
                    <span className="mr-1">{badge.icon}</span>
                    {badge.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Blockchain Connection */}
        <div className="border-t border-[#1a472a]/10 pt-4">
          <h3 className="text-sm font-medium text-[#1a472a]/60 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Blockchain Connection
          </h3>
          
          {profile.baseAccountName ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#f0ebe3] rounded-lg p-3">
                <div>
                  <p className="text-xs text-[#1a472a]/60">Base Blockchain Account</p>
                  <p className="font-mono text-[#1a472a]">{profile.baseAccountName}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              
              {profile.hyphaProfileUrl && (
                <a 
                  href={profile.hyphaProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#7dd87d] hover:underline text-sm"
                >
                  View Hypha Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
              
              {profile.walletAddress && (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[#f0ebe3] px-2 py-1 rounded flex-1 truncate">
                    {profile.walletAddress}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyWalletAddress}
                    className="text-[#1a472a]/60"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-[#1a472a]/60 text-sm mb-3">No blockchain account linked</p>
              {isOwner && <LinkBaseAccountDialog onSuccess={onUpdate} />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Org Claim + Steward Dashboard ─────────────────────────────────────────
const LAND_PROJECTS = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica" },
  { id: "starseed", name: "StarSeed Village", location: "Guatemala" },
  { id: "nyx", name: "The Nyx", location: "Bali, Indonesia" },
  { id: "neighbourgood", name: "Our NeighbourGood", location: "New Zealand" },
  { id: "highland_lake", name: "Highland Lake CampUS", location: "NC, USA" },
  { id: "liminal", name: "Liminal Village", location: "Italy" },
  { id: "heartland", name: "Heartland Retreat", location: "California, USA" },
  { id: "tdf", name: "Traditional Dream Factory", location: "Portugal" },
  { id: "ubuntu", name: "Ubuntu", location: "Various" },
  { id: "finca_sagrada", name: "Finca Sagrada", location: "Latin America" },
  { id: "tabi", name: "Tabi", location: "Various" },
  { id: "tioga", name: "Tioga", location: "Various" },
  { id: "lala_gardens", name: "LaLa Gardens Cooperative", location: "Various" },
];
const ALLIANCE_ORGS = [
  { id: "hypha", name: "Hypha DAO" },
  { id: "seeds", name: "SEEDS" },
  { id: "nestr", name: "Nestr.io" },
  { id: "kinship_earth", name: "Kinship Earth" },
  { id: "open_future", name: "Open Future Coalition" },
  { id: "united_planet", name: "UP.Game (United Planet)" },
  { id: "gaia_biolab", name: "Gaia Union BioLab" },
  { id: "closer", name: "Closer.earth" },
  { id: "oasa", name: "OASA.earth" },
  { id: "planetary_party", name: "Planetary Party" },
  { id: "dao_universe", name: "DAO Universe Club" },
  { id: "desa", name: "DESA" },
  { id: "permatours", name: "Permatours" },
  { id: "maptio", name: "Maptio" },
  { id: "local_scale", name: "LocalScale" },
];

function OrgClaimSection({ userId }: { userId: number }) {
  const [claimType, setClaimType] = useState<"land_project" | "alliance_org">("land_project");
  const [claimOrgId, setClaimOrgId] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);

  const { data: claims, refetch: refetchClaims } = trpc.orgClaims.mine.useQuery();
  const { data: joinRequests, refetch: refetchJoinRequests } = trpc.projectJoinRequests.myRequests.useQuery();
  const claimMutation = trpc.orgClaims.claim.useMutation({
    onSuccess: () => { refetchClaims(); setShowClaimForm(false); setClaimOrgId(""); },
  });
  const updateRequestMutation = trpc.projectJoinRequests.updateStatus.useMutation({
    onSuccess: () => refetchJoinRequests(),
  });

  const approvedClaims = claims?.filter(c => c.status === 'approved') ?? [];
  const pendingClaims = claims?.filter(c => c.status === 'pending') ?? [];
  const orgOptions = claimType === "land_project" ? LAND_PROJECTS : ALLIANCE_ORGS;
  const selectedOrg = orgOptions.find(o => o.id === claimOrgId);

  const stewardUpdateMutation = trpc.applications.stewardUpdate.useMutation({
    onSuccess: () => toast.success("Listing updated"),
    onError: (e) => toast.error("Failed to update listing", { description: e.message }),
  });

  const hasStewardRole = approvedClaims.length > 0;

  return (
    <div className="glass-panel p-6 rounded-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HomeIcon className="w-5 h-5 text-[#7dd87d]" />
            Steward Dashboard
          </h2>
          <p className="text-white/60 text-sm mt-0.5">Claim stewardship of a land project or alliance org</p>
        </div>
        <button
          onClick={() => setShowClaimForm(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/30 transition-colors"
        >
          + Claim Org
        </button>
      </div>

      {/* Claim form */}
      {showClaimForm && (
        <div className="bg-white/10 rounded-xl p-4 space-y-3 border border-white/20">
          <p className="text-white/80 text-sm font-medium">Claim stewardship of an existing project or org</p>
          <div className="flex gap-2">
            <button
              onClick={() => setClaimType("land_project")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${claimType === "land_project" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            >
              Land Project
            </button>
            <button
              onClick={() => setClaimType("alliance_org")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${claimType === "alliance_org" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            >
              Alliance Org
            </button>
          </div>
          <select
            value={claimOrgId}
            onChange={e => setClaimOrgId(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select {claimType === "land_project" ? "a land project" : "an alliance org"}…</option>
            {orgOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button
            disabled={!claimOrgId || claimMutation.isPending}
            onClick={() => {
              if (!selectedOrg) return;
              claimMutation.mutate({ orgType: claimType, orgId: selectedOrg.id, orgName: selectedOrg.name });
            }}
            className="w-full py-2 rounded-lg bg-[#7dd87d] text-[#1a472a] font-semibold text-sm disabled:opacity-50 hover:bg-[#6bc86b] transition-colors"
          >
            {claimMutation.isPending ? "Submitting…" : "Submit Claim (pending admin approval)"}
          </button>
        </div>
      )}

      {/* Pending claims */}
      {pendingClaims.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Pending Approval</p>
          {pendingClaims.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              <div>
                <p className="text-white text-sm font-medium">{c.orgName}</p>
                <p className="text-white/50 text-xs">{c.orgType === "land_project" ? "Land Project" : "Alliance Org"}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">Pending</span>
            </div>
          ))}
        </div>
      )}

      {/* Approved claims + join requests */}
      {hasStewardRole && (
        <div className="space-y-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Your Projects / Orgs</p>
          {approvedClaims.map(claim => {
            const requests = joinRequests?.filter(r => r.targetId === claim.orgId) ?? [];
            const pending = requests.filter(r => r.status === 'pending');
            const isDbListing = /^\d+$/.test(claim.orgId);
            return (
              <div key={claim.id} className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{claim.orgName}</p>
                    <p className="text-[#7dd87d] text-xs">{claim.orgType === "land_project" ? "Land Project" : "Alliance Org"} · Verified Steward</p>
                  </div>
                  {pending.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] font-medium">
                      {pending.length} new
                    </span>
                  )}
                </div>

                {/* Edit listing (only for DB-backed applications, i.e. numeric orgId) */}
                {isDbListing && (
                  <StewardListingEditor
                    applicationId={parseInt(claim.orgId)}
                    onSave={(data) => stewardUpdateMutation.mutate({ applicationId: parseInt(claim.orgId), ...data })}
                    saving={stewardUpdateMutation.isPending}
                  />
                )}

                {requests.length === 0 ? (
                  <p className="text-white/40 text-sm">No join requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.map(req => (
                      <div key={req.id} className="bg-white/5 rounded-lg px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{req.submitterName}</p>
                            <p className="text-white/50 text-xs">{req.submitterEmail}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            req.status === 'pending' ? 'bg-blue-500/20 text-blue-300' :
                            req.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                            req.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>{req.status}</span>
                        </div>
                        {req.submitterMessage && (
                          <p className="text-white/60 text-xs italic">"{req.submitterMessage}"</p>
                        )}
                        {req.status === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'accepted' })}
                              className="flex-1 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'reviewed' })}
                              className="flex-1 py-1 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'rejected' })}
                              className="flex-1 py-1 text-xs rounded-lg bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hasStewardRole && pendingClaims.length === 0 && !showClaimForm && (
        <p className="text-white/40 text-sm text-center py-2">
          Steward a land project or alliance org to see join requests here.
        </p>
      )}
    </div>
  );
}

// Inline editor for approved stewards to update their DB-backed listing
function StewardListingEditor({ applicationId, onSave, saving }: {
  applicationId: number;
  onSave: (data: { websiteUrl?: string; videoUrl?: string; additionalNotes?: string }) => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#7dd87d]/60 hover:text-[#7dd87d] transition-colors flex items-center gap-1"
      >
        <Edit className="w-3 h-3" /> Edit listing details
      </button>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
      <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Edit Public Listing</p>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-white/50 text-xs mb-0.5 block">Website URL</label>
          <input
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://yourproject.earth"
            className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7dd87d]"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-0.5 block">Video URL (optional)</label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7dd87d]"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-0.5 block">Public notes / update (max 2000 chars)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share an update about your project..."
            className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7dd87d] resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={() => { onSave({ websiteUrl, videoUrl, additionalNotes: notes }); setOpen(false); }}
          className="flex-1 py-1.5 text-xs rounded-lg bg-[#7dd87d] text-[#1a472a] font-semibold disabled:opacity-50 hover:bg-[#6bc86b] transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── 8 Forms of Capital ─────────────────────────────────────────────────────
const CAPITAL_TYPES = [
  { value: "financial",     label: "Financial",     icon: DollarSign, color: "#d4a574", desc: "Money, investments, grants, loans" },
  { value: "social",        label: "Social",        icon: UsersIcon,  color: "#7dd87d", desc: "Networks, relationships, trust" },
  { value: "cultural",      label: "Cultural",      icon: Palette,    color: "#f97316", desc: "Art, stories, rituals, values" },
  { value: "living",        label: "Living",        icon: Sprout,     color: "#22c55e", desc: "Land, ecosystems, biodiversity" },
  { value: "intellectual",  label: "Intellectual",  icon: Lightbulb,  color: "#a78bfa", desc: "Knowledge, skills, IP, research" },
  { value: "experiential",  label: "Experiential",  icon: Zap,        color: "#fbbf24", desc: "Skills gained through doing" },
  { value: "material",      label: "Material",      icon: Hammer,     color: "#94a3b8", desc: "Tools, equipment, infrastructure" },
  { value: "spiritual",     label: "Spiritual",     icon: Heart,      color: "#f43f5e", desc: "Vision, meaning, purpose" },
] as const;

type CapitalType = typeof CAPITAL_TYPES[number]["value"];

// ─── Contributions Tab ───────────────────────────────────────────────────────
function ContributionsTab() {
  const { data: contributions, isLoading, refetch } = trpc.playerContributions.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [capitalType, setCapitalType] = useState<CapitalType>("financial");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [projectName, setProjectName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const createMutation = trpc.playerContributions.create.useMutation({
    onSuccess: () => {
      toast.success("Contribution logged");
      refetch();
      setShowForm(false);
      setTitle(""); setDescription(""); setEstimatedValue(""); setProjectName(""); setEvidenceUrl("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.playerContributions.delete.useMutation({
    onSuccess: () => { toast.success("Contribution removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    createMutation.mutate({
      capitalType,
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedValue: estimatedValue ? parseInt(estimatedValue) : undefined,
      projectName: projectName.trim() || undefined,
      evidenceUrl: evidenceUrl.trim() || undefined,
    });
  }

  const totalValue = contributions?.reduce((s, c) => s + (c.estimatedValue ?? 0), 0) ?? 0;

  // Group by capital type for display
  const byType = CAPITAL_TYPES.map(ct => ({
    ...ct,
    items: contributions?.filter(c => c.capitalType === ct.value) ?? [],
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      {contributions && contributions.length > 0 && (
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/50 text-xs mb-0.5">Total Logged Value</p>
            <p className="text-2xl font-bold text-[#7dd87d]">${totalValue.toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{contributions.length}</p>
              <p className="text-white/50 text-xs">Entries</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{byType.length}</p>
              <p className="text-white/50 text-xs">Capital types</p>
            </div>
            <div className="text-center">
              <p className="text-[#7dd87d] font-bold text-lg">
                {contributions.filter(c => c.status === "verified").length}
              </p>
              <p className="text-white/50 text-xs">Verified</p>
            </div>
          </div>
        </div>
      )}

      {/* Add contribution button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#7dd87d]/30 text-[#7dd87d]/70 hover:border-[#7dd87d]/60 hover:text-[#7dd87d] hover:bg-[#7dd87d]/5 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Log a Contribution
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold">Log a Contribution</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Capital type picker */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Form of Capital *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAPITAL_TYPES.map(ct => {
                const Icon = ct.icon;
                const selected = capitalType === ct.value;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setCapitalType(ct.value)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${
                      selected
                        ? "border-[#7dd87d] bg-[#7dd87d]/10 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <Icon className="w-4 h-4" style={{ color: selected ? ct.color : undefined }} />
                    {ct.label}
                  </button>
                );
              })}
            </div>
            <p className="text-white/40 text-xs mt-1.5">
              {CAPITAL_TYPES.find(c => c.value === capitalType)?.desc}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">What did you contribute? *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Designed brand identity for La Tierra"
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7dd87d] placeholder-white/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Details (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="More context about this contribution..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7dd87d] placeholder-white/30 resize-none"
            />
          </div>

          {/* Value + project row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Est. Value USD (optional)</label>
              <input
                type="number"
                min="0"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                placeholder="0"
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7dd87d] placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1.5 block">Project / Org (optional)</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. La Tierra"
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7dd87d] placeholder-white/30"
              />
            </div>
          </div>

          {/* Evidence URL */}
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Evidence link (optional)</label>
            <input
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7dd87d] placeholder-white/30"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#7dd87d] text-[#1a472a] font-semibold text-sm disabled:opacity-50 hover:bg-[#6bc86b] transition-colors"
            >
              {createMutation.isPending ? "Logging…" : "Log Contribution"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contribution log grouped by capital type */}
      {isLoading ? (
        <div className="text-center py-8"><TaoSpinner size={40} /></div>
      ) : byType.length === 0 ? (
        <div className="text-center py-12">
          <Leaf className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No contributions logged yet.</p>
          <p className="text-white/30 text-xs mt-1">Use the button above to record your first contribution.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byType.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: group.color }} />
                  <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">{group.label} Capital</span>
                  <span className="text-white/30 text-xs ml-auto">
                    {group.items.filter(i => i.estimatedValue).reduce((s, i) => s + (i.estimatedValue ?? 0), 0) > 0
                      ? `$${group.items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0).toLocaleString()}`
                      : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3 group/row"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-medium">{item.title}</p>
                          {item.status === "verified" && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#7dd87d] bg-[#7dd87d]/10 border border-[#7dd87d]/20 px-1.5 py-0.5 rounded-full">
                              <BadgeCheck className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {item.projectName && (
                            <span className="text-white/40 text-xs">{item.projectName}</span>
                          )}
                          {item.estimatedValue && item.estimatedValue > 0 && (
                            <span className="text-[#d4a574] text-xs font-medium">${item.estimatedValue.toLocaleString()}</span>
                          )}
                          {item.evidenceUrl && (
                            <a
                              href={item.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/40 hover:text-[#7dd87d] text-xs flex items-center gap-0.5 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> evidence
                            </a>
                          )}
                          <span className="text-white/25 text-xs ml-auto">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover/row:opacity-100 text-white/30 hover:text-red-400 transition-all p-1 shrink-0"
                        aria-label="Delete contribution"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Quests Tab ───────────────────────────────────────────────────────────────
const QUEST_NAMES: Record<string, string> = {
  "quest-0": "Regenerative Foundations",
  "quest-1": "Mycelial Network Builder",
  "quest-2": "Land Stewardship Basics",
  "quest-3": "Community Governance 101",
  "quest-4": "Regenerative Finance",
  "quest-5": "Ecosystem Mapping",
  "quest-6": "Alliance Builder",
  "quest-7": "Token Economics",
  "quest-8": "Season Keeper",
  "quest-9": "Game Master",
  "quest-10": "Sovereignty Quest",
  "quest-11": "Bioregional Connector",
  "quest-12": "Legacy Builder",
  "food-foresting": "Food Foresting",
};

function QuestsTab({ profile }: { profile: any }) {
  const completed: string[] = (() => {
    try { return JSON.parse(profile.questsCompleted || "[]"); } catch { return []; }
  })();

  if (completed.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">No quests completed yet.</p>
        <a href="/quest" className="inline-flex items-center gap-1 mt-3 text-[#7dd87d] text-sm hover:underline">
          Browse quests <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs">{completed.length} quest{completed.length !== 1 ? "s" : ""} completed</p>
        <a href="/quest" className="text-[#7dd87d] text-xs hover:underline flex items-center gap-1">
          Find more <ArrowRight className="w-3 h-3" />
        </a>
      </div>
      <div className="space-y-2">
        {completed.map((questId) => (
          <div
            key={questId}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#7dd87d]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {(QUEST_NAMES[questId] ?? questId.replace(/[-_]/g, " ").replace(/\bquest\b/gi, "").trim()) || questId}
              </p>
              <p className="text-white/40 text-xs">Completed</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#7dd87d] ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SOCIAL_QUEST_DISMISSED_KEY = 'regen_social_quest_dismissed';

function SocialShareQuestCard() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(SOCIAL_QUEST_DISMISSED_KEY) === '1'
  );

  function dismiss() {
    localStorage.setItem(SOCIAL_QUEST_DISMISSED_KEY, '1');
    setDismissed(true);
  }

  const shareText = `I'm playing the Infinite Game with @ReGenCivics  -  building regenerative civilizations through quests, land projects, and collective governance. Join me! 🌱 regencivics.earth`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  if (dismissed) return null;

  return (
    <AnimatedSection animation="slide-up">
      <div className="relative glass-panel p-5 rounded-xl border border-[#d4a574]/30 bg-gradient-to-r from-[#d4a574]/10 to-[#ffd700]/5">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5 text-[#d4a574]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold text-sm">Share Your ReGen Civics Story</h3>
              <span className="text-[10px] bg-[#d4a574]/20 text-[#d4a574] px-2 py-0.5 rounded-full font-medium border border-[#d4a574]/30">
                Quest
              </span>
            </div>
            <p className="text-white/60 text-xs mb-3">
              Tell your network you're part of the Regenerative Renaissance. Earn{' '}
              <span className="text-[#7dd87d] font-medium">1 RVoice</span> +{' '}
              <span className="text-[#ffd700] font-medium">33 ReGen tokens</span> when you share.
            </p>
            <div className="flex items-center gap-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#d4a574] hover:bg-[#c4955f] text-[#1a472a] text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share on X / Twitter
              </a>
              <button
                onClick={dismiss}
                className="text-white/40 hover:text-white/60 text-xs transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── Submissions Tab helpers ──────────────────────────────────────────────────

function applicationStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    draft: "gray", submitted: "blue", under_review: "blue",
    approved: "green", rejected: "red", changes_requested: "amber",
  };
  return map[status] ?? "gray";
}

function campaignStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    draft: "gray", pending_review: "blue", active: "green",
    funded: "green", completed: "green", cancelled: "red", rejected: "red",
  };
  return map[status] ?? "gray";
}

function investorStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    new: "blue", contacted: "amber", in_discussion: "amber",
    committed: "green", declined: "red", archived: "gray",
  };
  return map[status] ?? "gray";
}

function SubmissionCard({
  title, subtitle, status, statusColor, updatedAt, primaryAction, secondaryAction
}: {
  title: string;
  subtitle?: string;
  status: string;
  statusColor: "green" | "amber" | "red" | "blue" | "gray";
  updatedAt: string | Date;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  const colorMap = {
    green: "bg-green-500/20 text-green-300",
    amber: "bg-amber-500/20 text-amber-300",
    red: "bg-red-500/20 text-red-300",
    blue: "bg-blue-500/20 text-blue-300",
    gray: "bg-white/10 text-white/50",
  };
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{title}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[statusColor]}`}>
            {status.replace(/_/g, " ")}
          </span>
        </div>
        {subtitle && <p className="text-white/40 text-xs mt-0.5 truncate">{subtitle}</p>}
        <p className="text-white/30 text-xs mt-0.5">Updated {new Date(updatedAt).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {secondaryAction && (
          <a href={secondaryAction.href} className="text-white/50 hover:text-white text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-colors">
            {secondaryAction.label}
          </a>
        )}
        {primaryAction && (
          <a href={primaryAction.href} className="text-[#1a472a] bg-[#7dd87d] hover:bg-[#6bc86b] text-xs px-3 py-1.5 rounded font-medium transition-colors">
            {primaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}

function SubmissionsSection<T>({
  title, icon: Icon, items, renderItem, emptyMessage, emptyAction
}: {
  title: string;
  icon: React.ElementType;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
  emptyAction?: { label: string; href: string };
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h3>
        <span className="text-white/40 text-xs">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="bg-white/5 rounded-lg px-4 py-5 text-center">
          <p className="text-white/40 text-sm">{emptyMessage}</p>
          {emptyAction && (
            <a href={emptyAction.href} className="mt-2 inline-block text-[#7dd87d] text-sm font-medium hover:underline">
              {emptyAction.label}
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function OrgClaimsSection({ orgClaims }: { orgClaims: any[] }) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string; type: "land_project" | "alliance_org" } | null>(null);
  const claimMutation = trpc.orgClaims.claim.useMutation();

  const { data: searchResults } = trpc.applications.search.useQuery(
    { q: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const handleClaim = async () => {
    if (!selectedOrg) return;
    await claimMutation.mutateAsync({
      orgType: selectedOrg.type,
      orgId: selectedOrg.id,
      orgName: selectedOrg.name,
    });
    setShowClaimForm(false);
    setSelectedOrg(null);
    setSearchQuery("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#7dd87d]" />
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Organisation & Land Project Claims</h3>
        </div>
        {!showClaimForm && (
          <button onClick={() => setShowClaimForm(true)} className="text-[#7dd87d] text-xs font-medium hover:underline">
            + Claim a listing
          </button>
        )}
      </div>
      {orgClaims.length > 0 && (
        <div className="space-y-2 mb-4">
          {orgClaims.map((claim) => (
            <SubmissionCard
              key={claim.id}
              title={claim.orgName}
              subtitle={claim.orgType === "land_project" ? "Land Project" : "Alliance Organisation"}
              status={claim.status}
              statusColor={claim.status === "approved" ? "green" : claim.status === "rejected" ? "red" : "amber"}
              updatedAt={claim.createdAt}
            />
          ))}
        </div>
      )}
      {showClaimForm && (
        <div className="bg-white/5 border border-[#7dd87d]/20 rounded-lg p-4 space-y-3">
          <p className="text-white/70 text-sm">
            Search for a land project or organisation listed on ReGen Civics that you steward or represent.
            After submission, an admin will verify and approve your claim.
          </p>
          <input
            type="text"
            placeholder="Search by project or organisation name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#7dd87d]/60"
          />
          {searchResults && searchResults.length > 0 && !selectedOrg && (
            <div className="bg-[#0d2b1a] border border-white/10 rounded-lg divide-y divide-white/10 max-h-48 overflow-y-auto">
              {searchResults.map((result: any) => (
                <button
                  key={result.id}
                  onClick={() => { setSelectedOrg({ id: String(result.id), name: result.projectName, type: "land_project" }); setSearchQuery(result.projectName); }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <p className="text-white text-sm font-medium">{result.projectName}</p>
                  <p className="text-white/40 text-xs">{result.location} · Land Project</p>
                </button>
              ))}
            </div>
          )}
          {selectedOrg && (
            <div className="flex items-center justify-between bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">{selectedOrg.name}</p>
                <p className="text-white/50 text-xs">{selectedOrg.type === "land_project" ? "Land Project" : "Alliance Org"}</p>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="text-white/40 hover:text-white/70 text-xs">x Change</button>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setShowClaimForm(false); setSelectedOrg(null); setSearchQuery(""); }} className="text-white/50 text-sm px-3 py-1.5 rounded hover:text-white transition-colors">
              Cancel
            </button>
            <button
              disabled={!selectedOrg || claimMutation.isPending}
              onClick={handleClaim}
              className="bg-[#7dd87d] text-[#1a472a] text-sm font-medium px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#6bc86b] transition-colors"
            >
              {claimMutation.isPending ? "Submitting..." : "Submit Claim"}
            </button>
          </div>
        </div>
      )}
      {orgClaims.length === 0 && !showClaimForm && (
        <p className="text-white/30 text-xs text-center py-2">No claims yet. If you steward a listed project or organisation, you can claim it above.</p>
      )}
    </div>
  );
}

function SubmissionsTab() {
  const { data: applications = [] } = trpc.applications.myApplications.useQuery();
  const { data: campaigns = [] } = trpc.campaigns.myCampaigns.useQuery();
  const { data: savedCalcs = [] } = trpc.savedContributions.list.useQuery();
  const { data: investorInquiry } = trpc.investorInquiries.mine.useQuery();
  const { data: orgClaims = [] } = trpc.orgClaims.mine.useQuery();

  return (
    <div className="space-y-8 py-2">
      <SubmissionsSection
        title="Land Project Applications"
        icon={MapPin}
        items={applications}
        renderItem={(app: any) => (
          <SubmissionCard
            key={app.id}
            title={app.projectName}
            subtitle={app.location}
            status={app.status}
            statusColor={applicationStatusColor(app.status)}
            updatedAt={app.updatedAt}
            primaryAction={
              app.status === "draft" || app.status === "changes_requested"
                ? { label: app.status === "draft" ? "Continue Editing" : "Review & Resubmit", href: `/apply?id=${app.id}` }
                : { label: "View Application", href: `/my-applications` }
            }
          />
        )}
        emptyMessage="No applications yet."
        emptyAction={{ label: "Apply Now", href: "/apply" }}
      />
      <SubmissionsSection
        title="Crowd-Pooling Campaigns"
        icon={Layers}
        items={campaigns}
        renderItem={(campaign: any) => (
          <SubmissionCard
            key={campaign.id}
            title={campaign.title}
            subtitle={campaign.location ?? campaign.projectName}
            status={campaign.status}
            statusColor={campaignStatusColor(campaign.status)}
            updatedAt={campaign.updatedAt}
            primaryAction={{ label: "Manage", href: `/campaign/${campaign.id}/manage` }}
            secondaryAction={{ label: "Analytics", href: `/campaign/${campaign.id}/analytics` }}
          />
        )}
        emptyMessage="No campaigns yet."
        emptyAction={{ label: "Create Campaign", href: "/create-campaign" }}
      />
      <SubmissionsSection
        title="Saved Contribution Profiles"
        icon={CalculatorIcon}
        items={savedCalcs}
        renderItem={(sc: any) => (
          <SubmissionCard
            key={sc.id}
            title={sc.name}
            subtitle={sc.projectName ?? "Generic profile"}
            status={sc.isDefault ? "default" : "saved"}
            statusColor="green"
            updatedAt={sc.updatedAt}
            primaryAction={{ label: "Edit", href: `/calculator?savedId=${sc.id}` }}
          />
        )}
        emptyMessage="No saved contribution profiles."
        emptyAction={{ label: "Open Calculator", href: "/calculator" }}
      />
      {investorInquiry && (
        <SubmissionsSection title="Investor Inquiry" icon={TrendingUp} items={[investorInquiry]} renderItem={(inv: any) => (
          <SubmissionCard
            key={inv.id}
            title={inv.fullName}
            subtitle={`${inv.organization ?? ""} · ${inv.investmentRange ?? "Range not set"}`}
            status={inv.status}
            statusColor={investorStatusColor(inv.status)}
            updatedAt={inv.updatedAt}
            primaryAction={{ label: "View Opportunity", href: "/opportunity" }}
          />
        )} emptyMessage="" />
      )}
      <OrgClaimsSection orgClaims={orgClaims} />
    </div>
  );
}

type ProfileTab = "overview" | "submissions" | "quests" | "contributions" | "settings";

const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",       label: "Overview",       icon: LayoutGrid },
  { id: "submissions",    label: "My Submissions",  icon: FolderOpen },
  { id: "quests",         label: "Quests",         icon: BookOpen },
  { id: "contributions",  label: "Contributions",  icon: Leaf },
  { id: "settings",       label: "Settings",       icon: Settings },
];

export default function PlayerProfile() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: profile, isLoading: profileLoading, refetch } = trpc.playerProfiles.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const syncTokensMutation = trpc.playerProfiles.syncTokens.useMutation({
    onSuccess: () => {
      utils.playerProfiles.me.invalidate();
    },
  });

  useEffect(() => {
    if (!profile) return;
    if (!(profile as any).walletAddress) return;
    const tenMinutes = 10 * 60 * 1000;
    const lastSync = (profile as any).lastTokenSync;
    const isStale = !lastSync ||
      Date.now() - new Date(lastSync).getTime() > tenMinutes;
    if (isStale && !syncTokensMutation.isPending) {
      syncTokensMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.walletAddress, (profile as any)?.lastTokenSync]);

  const isLoading = authLoading || profileLoading;

  if (isLoading) return <TaoSpinner fullPage size={72} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <BackButton />
      <SEO 
        title="Player Profile | ReGen Civics"
        description="Create your player profile and connect your Base blockchain account to track your contributions and badges."
        url="https://regencivics.earth/profile"
      />
      
      {/* Hero Section */}
      <section className="relative py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
                <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" />
                <span className="text-[#7dd87d] font-medium">Game Profile</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Your <span className="text-[#7dd87d]">Player</span> Profile
              </h1>
              
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Track your contributions, earn badges, and connect your Base blockchain account to verify your on-chain identity.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          {!isAuthenticated ? (
            // Not logged in
            <AnimatedSection animation="slide-up">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-[#7dd87d]/30">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a472a] flex items-center justify-center">
                    <User className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                  <CardTitle className="text-2xl text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                    Sign In to Create Your Profile
                  </CardTitle>
                  <CardDescription>
                    Join the ReGen Civics game and start tracking your contributions
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <a href={getLoginUrl()}>
                    <Button className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]">
                      Sign In to Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </AnimatedSection>
          ) : !profile ? (
            // Logged in but no profile
            <AnimatedSection animation="slide-up">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-[#7dd87d]/30">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Star className="w-6 h-6 text-[#7dd87d]" />
                    Create Your Player Profile
                  </CardTitle>
                  <CardDescription>
                    Set up your profile to start earning badges and tracking contributions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateProfileForm onSuccess={() => refetch()} />
                </CardContent>
              </Card>
            </AnimatedSection>
          ) : (
            // Has profile  -  tabbed layout
            <div className="space-y-0">
              {/* Tab nav */}
              <AnimatedSection animation="slide-up">
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6 overflow-x-auto scrollbar-none">
                  {PROFILE_TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                          active
                            ? "bg-[#1a472a] text-white shadow-sm border border-[#7dd87d]/20"
                            : "text-white/50 hover:text-white/80"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? "text-[#7dd87d]" : ""}`} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </AnimatedSection>

              {/* Overview tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <AnimatedSection animation="slide-up">
                    <ProfileCard
                      profile={profile}
                      isOwner={true}
                      onUpdate={() => refetch()}
                      onSyncTokens={() => syncTokensMutation.mutate()}
                      syncIsPending={syncTokensMutation.isPending}
                    />
                  </AnimatedSection>
                  <SocialShareQuestCard />
                </div>
              )}

              {/* Submissions tab */}
              {activeTab === "submissions" && (
                <div className="mt-6">
                  <SubmissionsTab />
                </div>
              )}

              {/* Quests tab */}
              {activeTab === "quests" && (
                <AnimatedSection animation="slide-up">
                  <div className="glass-panel p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#7dd87d]" /> Quest Log
                    </h2>
                    <QuestsTab profile={profile} />
                  </div>
                </AnimatedSection>
              )}

              {/* Contributions tab */}
              {activeTab === "contributions" && (
                <AnimatedSection animation="slide-up">
                  <div className="glass-panel p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-[#7dd87d]" /> Contribution Log
                    </h2>
                    <p className="text-white/50 text-sm mb-5">
                      Record contributions across the 8 forms of capital. Self-reported values can be verified by admins.
                    </p>
                    <ContributionsTab />
                  </div>
                </AnimatedSection>
              )}

              {/* Settings tab */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <AnimatedSection animation="slide-up">
                    <div className="glass-panel p-6 rounded-xl">
                      <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#7dd87d]" /> Edit Profile
                      </h2>
                      <ProfileEditForm />
                    </div>
                  </AnimatedSection>
                  <AnimatedSection animation="slide-up">
                    <DigestPreferences currentFrequency={(profile as any).emailDigestFrequency || 'monthly'} />
                  </AnimatedSection>
                  <AnimatedSection animation="slide-up">
                    <OrgClaimSection userId={user!.id} />
                  </AnimatedSection>
                  {user?.role === 'admin' && (
                    <AnimatedSection animation="slide-up">
                      <NotificationPreferences />
                    </AnimatedSection>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="slide-up">
            <h2 className="text-2xl font-bold text-white text-center mb-8" style={{ fontFamily: 'var(--font-display)' }}>
              How the <span className="text-[#7dd87d]">Game</span> Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-[#7dd87d]/20">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-[#7dd87d] rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-6 h-6 text-[#1a472a]" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">1. Create Profile</h3>
                  <p className="text-white/60 text-sm">
                    Sign up and create your player profile to join the ReGen Civics game
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-[#7dd87d]/20">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-[#7dd87d] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-6 h-6 text-[#1a472a]" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">2. Link Base Account</h3>
                  <p className="text-white/60 text-sm">
                    Connect your Hypha/Base account to verify your identity and track tokens
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-[#7dd87d]/20">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-[#7dd87d] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-[#1a472a]" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">3. Earn Tokens</h3>
                  <p className="text-white/60 text-sm">
                    Complete quests, contribute to projects, and earn tokens for your contributions
                  </p>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
              <HomeIcon className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
