/**
 * Player Profile Page
 * Connect Game elements to database with Base blockchain account linking
 * Players can create profiles and link their Hypha/Base accounts
 */

import React, { useState } from 'react';
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
  Info
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
          href="https://hypha.earth" 
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
function ProfileCard({ profile, isOwner, onUpdate }: { profile: any; isOwner: boolean; onUpdate: () => void }) {
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

export default function PlayerProfile() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch } = trpc.playerProfiles.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
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
            // Has profile
            <div className="space-y-6">
              <AnimatedSection animation="slide-up">
                <ProfileCard profile={profile} isOwner={true} onUpdate={() => refetch()} />
              </AnimatedSection>
              <AnimatedSection animation="slide-up">
                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-lg font-bold text-white mb-5">Edit Profile</h2>
                  <ProfileEditForm />
                </div>
              </AnimatedSection>
              {/* Steward: Org Claim + Join Request Dashboard */}
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
                  <h3 className="text-white font-semibold mb-2">3. Earn Badges</h3>
                  <p className="text-white/60 text-sm">
                    Complete quests, contribute to projects, and earn badges for your achievements
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
