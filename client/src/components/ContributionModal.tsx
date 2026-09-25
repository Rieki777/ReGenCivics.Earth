import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CRYPTO_PAYMENT_CONTEXT, type CapitalType, type NeedKind } from "@shared/crowdpoolingTaxonomy";
import { MAX_OFFER_HOURS, isHoursNeed, roleFillState, scaleRoleValue } from "@shared/roleCapacity";
import { useAuth } from "@/_core/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";
import {
  Leaf,
  Wrench,
  UserCheck,
  Package,
  Coins,
  BookOpen,
  Loader2,
  CheckCircle2,
  CalendarPlus,
  Truck,
  Gift,
  UserPlus
} from "lucide-react";

/** A campaign need passed in when the contributor clicks Claim on a slot card. */
export interface ContributionNeed {
  id: number;
  kind: NeedKind | string;
  capitalType?: CapitalType | string | null;
  title: string;
  quantityWanted: number;
  quantityClaimed: number;
  quantityDelivered: number;
  estimatedValue: number;
  /**
   * 'hours_per_week' on a role measured in hours a week: quantityWanted,
   * quantityClaimed and quantityDelivered are then hours needed, accepted
   * and delivered. Missing or 'count' means slots, as before.
   */
  capacityUnit?: string | null;
  hoursPerWeek?: number | null;
  shiftStartsAt?: string | Date | null;
  shiftEndsAt?: string | Date | null;
  loanWindowStart?: string | Date | null;
  loanWindowEnd?: string | Date | null;
}

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  campaignTitle: string;
  currency?: string;
  /**
   * Called once the server takes the sheet. `practice` is true on an example
   * campaign: nothing was written, so callers should not refetch or thank.
   */
  onSuccess?: (result: { practice: boolean }) => void;
  /** When set, the type picker is skipped and the form is preloaded from this need. */
  need?: ContributionNeed;
}

type ContributionType = 'land' | 'equipment' | 'role' | 'resource' | 'financial' | 'knowledge';

const contributionTypes = [
  { value: 'land', label: 'Land', icon: Leaf, color: 'text-green-600' },
  { value: 'equipment', label: 'Equipment', icon: Wrench, color: 'text-orange-600' },
  { value: 'role', label: 'Role/Skills', icon: UserCheck, color: 'text-blue-600' },
  { value: 'resource', label: 'Resources', icon: Package, color: 'text-purple-600' },
  { value: 'knowledge', label: 'Knowledge Session', icon: BookOpen, color: 'text-indigo-600' },
  { value: 'financial', label: 'Crypto', icon: Coins, color: 'text-emerald-600' },
];

const KIND_LABELS: Record<string, string> = {
  item: 'Item',
  role: 'Role',
  shift: 'Shift',
  loan: 'Loan',
  knowledge: 'Knowledge',
  crypto: 'Crypto',
  financial_link: 'Partner',
};

/** Maps a need kind to the contribution type the server records. */
const TYPE_FOR_KIND: Record<string, ContributionType> = {
  item: 'resource',
  role: 'role',
  shift: 'role',
  loan: 'equipment',
  knowledge: 'knowledge',
  crypto: 'financial',
};

/** Per-slot value of a need, so quantity claims scale proportionally. */
function perUnitValue(need: ContributionNeed): number {
  if (need.quantityWanted > 1 && need.estimatedValue > 0) {
    return Math.round(need.estimatedValue / need.quantityWanted);
  }
  return need.estimatedValue;
}

/** A whole number of hours from 1 to 168, or null. */
export function parseOfferHours(raw: string): number | null {
  const t = raw.trim();
  if (!/^[0-9]+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_OFFER_HOURS) return null;
  return n;
}

function fillForNeed(need: ContributionNeed) {
  return roleFillState({
    kind: String(need.kind),
    capacityUnit: need.capacityUnit ?? null,
    quantityWanted: need.quantityWanted || 0,
    quantityClaimed: need.quantityClaimed || 0,
    quantityDelivered: need.quantityDelivered || 0,
    estimatedValue: need.estimatedValue || 0,
  });
}

/** The server's price for an offer of `hours` on an hours need. */
export function offerValue(need: ContributionNeed, hours: number): number {
  const needed = need.quantityWanted || 0;
  return scaleRoleValue(need.estimatedValue || 0, needed, Math.min(hours, needed));
}

function toIcsDate(d: string | Date): string {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function ContributionModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle,
  currency = 'USD',
  onSuccess,
  need
}: ContributionModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [contributionType, setContributionType] = useState<ContributionType | null>(null);
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [authOpen, setAuthOpen] = useState(false);
  // The email the offer went out under, kept for the success screen after
  // the form resets.
  const [sentEmail, setSentEmail] = useState('');
  // True when the server answered with a practice run (an example campaign):
  // the success screen is then a practice receipt.
  const [practice, setPractice] = useState(false);
  // The practice receipt's "hear when real campaigns open" form.
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const joinWaitlist = trpc.campaigns.joinWaitlist.useMutation({
    onSuccess: () => setWaitlistJoined(true),
    onError: () => { toast.error('Could not save your email. Try again in a moment.'); },
  });

  // A role measured in hours a week. Legacy roles still on 'count' take the
  // slot path below, exactly as before.
  const hoursNeed = !!need && isHoursNeed({ kind: String(need.kind), capacityUnit: need.capacityUnit ?? null });
  const fill = need ? fillForNeed(need) : null;

  // Form state
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorPhone, setContributorPhone] = useState('');
  const [contributorBio, setContributorBio] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [contributorNotes, setContributorNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [quantityPledged, setQuantityPledged] = useState('1');

  // Type-specific fields
  const [landHectares, setLandHectares] = useState('');
  const [landRegion, setLandRegion] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentQuantity, setEquipmentQuantity] = useState('1');
  const [equipmentCondition, setEquipmentCondition] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [resourceQuantity, setResourceQuantity] = useState('1');
  const [resourceUnit, setResourceUnit] = useState('');
  const [financialAmount, setFinancialAmount] = useState('');
  const [sessionLength, setSessionLength] = useState('');

  const remainingSlots = need
    ? Math.max(1, (need.quantityWanted || 1) - (need.quantityClaimed || 0))
    : 1;

  // Preload from the need: skip the type picker and prefill the form.
  useEffect(() => {
    if (isOpen && need) {
      const mapped = TYPE_FOR_KIND[need.kind] ?? 'resource';
      setStep('details');
      setContributionType(mapped);
      setTitle(need.title);
      setQuantityPledged('1');
      const unit = perUnitValue(need);
      setEstimatedValue(unit > 0 ? String(unit) : '');
      if (mapped === 'financial') {
        setFinancialAmount(unit > 0 ? String(unit) : '');
      }
      if (mapped === 'resource') {
        setResourceName(need.title);
      }
      if (mapped === 'role') {
        setRoleTitle(need.title);
      }
      if (isHoursNeed({ kind: String(need.kind), capacityUnit: need.capacityUnit ?? null })) {
        // Prefill the open hours, kept inside what one person can offer.
        // People can offer more or less; the steward decides at accept.
        const open = fillForNeed(need).open;
        const start = Math.min(Math.max(open, 1), MAX_OFFER_HOURS);
        setHoursPerWeek(String(start));
        setEstimatedValue(String(offerValue(need, start)));
      }
      if (mapped === 'equipment') {
        setEquipmentName(need.title);
      }
    }
  }, [isOpen, need]);

  // Signed in: start the form from the account, so the offer carries the
  // email the account signs in with.
  useEffect(() => {
    if (!isOpen || !user) return;
    const u = user as { name?: string | null; email?: string | null };
    setContributorName((v) => v || u.name || '');
    setContributorEmail((v) => v || u.email || '');
  }, [isOpen, user]);

  // Signed out with the sheet open: someone may finish signing in by email
  // link in another tab. Check again when they come back to this one.
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;
    const recheck = () => { void utils.auth.me.invalidate(); };
    window.addEventListener('focus', recheck);
    return () => window.removeEventListener('focus', recheck);
  }, [isOpen, isAuthenticated, utils]);

  // Once signed in (here or in another tab), the sign-in dialog has done its job.
  useEffect(() => {
    if (isAuthenticated) setAuthOpen(false);
  }, [isAuthenticated]);

  const submitMutation = trpc.campaigns.submitContribution.useMutation({
    onSuccess: (result) => {
      const isPractice = result?.practice === true;
      setPractice(isPractice);
      setSentEmail(contributorEmail.trim());
      setWaitlistEmail(contributorEmail.trim());
      setWaitlistJoined(false);
      setStep('success');
      onSuccess?.({ practice: isPractice });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit contribution');
    }
  });

  const resetForm = () => {
    setStep('type');
    setContributionType(null);
    setContributorName('');
    setContributorEmail('');
    setContributorPhone('');
    setContributorBio('');
    setTitle('');
    setDescription('');
    setEstimatedValue('');
    setContributorNotes('');
    setIsAnonymous(false);
    setQuantityPledged('1');
    setLandHectares('');
    setLandRegion('');
    setEquipmentName('');
    setEquipmentQuantity('1');
    setEquipmentCondition('');
    setRoleTitle('');
    setHoursPerWeek('');
    setDurationMonths('');
    setResourceName('');
    setResourceQuantity('1');
    setResourceUnit('');
    setFinancialAmount('');
    setSessionLength('');
  };

  /** True once the person has typed anything worth losing. */
  const isDirty = step === 'details' && Boolean(
    contributorName || contributorEmail || contributorPhone || contributorBio ||
    description || contributorNotes || estimatedValue
  );

  const handleClose = () => {
    resetForm();
    setSentEmail('');
    setPractice(false);
    setWaitlistEmail('');
    setWaitlistJoined(false);
    onClose();
  };

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim();
    if (!email) return;
    joinWaitlist.mutate({ email, name: contributorName.trim() || undefined });
  };

  /**
   * A tap on the backdrop used to wipe a fully filled form with no confirmation
   * and no undo, which on a phone is easy to do by accident while scrolling a
   * sheet that fills the screen. The X and Escape still close it, because a
   * deliberate close should stay one action.
   */
  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (isDirty && !window.confirm('Discard what you have filled in?')) return;
    handleClose();
  };

  // Quantity changes rescale the prefilled value proportionally.
  const handleQuantityChange = (raw: string) => {
    // Allow the field to be empty WHILE TYPING. Clamping on every keystroke meant
    // deleting the last digit instantly refilled "1", so getting from 1 to 12 on a
    // phone required selecting the digit rather than backspacing over it. It is
    // normalized on blur instead.
    if (raw === '') {
      setQuantityPledged('');
      return;
    }
    const qty = Math.min(remainingSlots, Math.max(1, parseInt(raw) || 1));
    setQuantityPledged(String(qty));
    if (need) {
      const unit = perUnitValue(need);
      if (unit > 0) {
        setEstimatedValue(String(unit * qty));
        if (contributionType === 'financial') {
          setFinancialAmount(String(unit * qty));
        }
      }
    }
  };

  // Hours offered on an hours need: never capped by the open hours. The
  // value preview follows the server's own pricing.
  const handleOfferHoursChange = (raw: string) => {
    setHoursPerWeek(raw);
    if (!need) return;
    const h = parseOfferHours(raw);
    if (h !== null) setEstimatedValue(String(offerValue(need, h)));
  };

  const handleSubmit = () => {
    if (!contributionType) return;

    // Validate required fields
    if (!contributorName.trim() || !contributorEmail.trim() || !title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    let offerHours: number | undefined;
    if (hoursNeed || (contributionType === 'role' && hoursPerWeek.trim() !== '')) {
      const h = parseOfferHours(hoursPerWeek);
      if (h === null) {
        toast.error(`Hours a week need to be a whole number from 1 to ${MAX_OFFER_HOURS}.`);
        return;
      }
      offerHours = h;
    }

    // The server prices an offer on an hours need itself, so the value sent
    // here is only a preview (a role with no value set still takes offers).
    const value = hoursNeed && need && offerHours !== undefined
      ? Math.round(offerValue(need, offerHours))
      : (parseInt(estimatedValue) || 0);
    if (!hoursNeed && value <= 0) {
      toast.error('Please enter a valid estimated value');
      return;
    }

    const refParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ref')
      : null;

    submitMutation.mutate({
      campaignId,
      campaignItemId: need?.id,
      // On an hours need the server sets quantityPledged from hoursPerWeek.
      quantityPledged: need && !hoursNeed ? (parseInt(quantityPledged) || 1) : 1,
      isAnonymous,
      referredBy: refParam ? refParam.slice(0, 16) : undefined,
      contributorName: contributorName.trim(),
      contributorEmail: contributorEmail.trim(),
      contributorPhone: contributorPhone.trim() || undefined,
      contributorBio: contributorBio.trim() || undefined,
      contributionType,
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedValue: value,
      contributorNotes: contributorNotes.trim() || undefined,
      // Type-specific fields
      landHectares: landHectares ? parseInt(landHectares) : undefined,
      landRegion: landRegion.trim() || undefined,
      equipmentName: equipmentName.trim() || undefined,
      equipmentQuantity: equipmentQuantity ? parseInt(equipmentQuantity) : undefined,
      equipmentCondition: equipmentCondition || undefined,
      roleTitle: roleTitle.trim() || undefined,
      // Knowledge sessions record their length in hours on hoursPerWeek.
      hoursPerWeek: contributionType === 'knowledge'
        ? (parseOfferHours(sessionLength) ?? undefined)
        : offerHours,
      durationMonths: durationMonths ? parseInt(durationMonths) : undefined,
      resourceName: resourceName.trim() || undefined,
      resourceQuantity: resourceQuantity ? parseInt(resourceQuantity) : undefined,
      resourceUnit: resourceUnit.trim() || undefined,
      financialAmount: financialAmount ? parseInt(financialAmount) : undefined,
      paymentMethod: contributionType === 'financial' ? 'crypto' : undefined,
    });
  };

  // Client-side .ics download for shift claims.
  const handleDownloadIcs = () => {
    if (!need?.shiftStartsAt || !need?.shiftEndsAt) return;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ReGen Civics//Crowdpooling//EN',
      'BEGIN:VEVENT',
      `UID:need-${need.id}-${Date.now()}@regencivics.earth`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(need.shiftStartsAt)}`,
      `DTEND:${toIcsDate(need.shiftEndsAt)}`,
      `SUMMARY:${campaignTitle}: ${need.title}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-${need.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* No max-h here on purpose. DialogContent already caps at 100dvh on mobile
          and 90vh from md up. Re-adding max-h-[90vh] put a static vh cap back over
          the dynamic one, so with the iOS URL bar showing, the sheet was taller
          than the visible area and its header sat off the top of the screen. */}
      <DialogContent className="max-w-lg bg-white text-[#1a472a] apply-form-dark light-form-island">
        <DialogHeader>
          {/* pr-12 keeps a wrapped title clear of the 44px close button. Without
              it a long need title wrapped under the X, so tapping what looked like
              the heading closed the modal and discarded the form. */}
          <DialogTitle className="text-[#1a472a] text-left leading-tight pr-12 sm:pr-0">
            {step === 'success' ? (practice ? 'Practice run complete' : hoursNeed ? 'Offer sent' : 'Contribution Submitted!') :
              hoursNeed && need ? `Offer your time: ${need.title}` :
              need ? `Claim: ${need.title}` : 'Contribute to Campaign'}
          </DialogTitle>
          <DialogDescription className="text-[#1a472a]/85">
            {step === 'type' && 'Select what type of contribution you want to make'}
            {step === 'details' && (hoursNeed
              ? `Offering hours to a role on ${campaignTitle}`
              : need
              ? `Claiming ${need.kind === 'item' ? 'an' : 'a'} ${(KIND_LABELS[need.kind] || 'need').toLowerCase()} need on ${campaignTitle}`
              : `Contributing to: ${campaignTitle}`)}
            {step === 'success' && (practice ? `A practice run on ${campaignTitle}` : 'Thank you for your contribution!')}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Type (skipped when a need is preloaded) */}
        {step === 'type' && (
          <div className="space-y-3 py-4">
            {contributionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    setContributionType(type.value as ContributionType);
                    setStep('details');
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:border-[#7dd87d] hover:bg-[#f0f7f0] ${
                    contributionType === type.value ? 'border-[#7dd87d] bg-[#f0f7f0]' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center ${type.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-[#1a472a]">{type.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'details' && contributionType && (
          <div className="space-y-4 py-4">
            {!isAuthenticated && (
              <p className="text-sm text-[#1a472a]/85">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center min-h-11 py-2 font-semibold text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
                >
                  Have an account? Sign in first
                </button>
              </p>
            )}

            {/* Need summary when claiming a slot */}
            {need && (
              <div className="bg-[#f0f7f0] rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide">
                    {KIND_LABELS[need.kind] || 'Need'}
                  </span>
                  <p className="text-sm font-medium text-[#1a472a]">{need.title}</p>
                </div>
                <span className="text-xs text-[#1a472a]/80 text-right">
                  {hoursNeed && fill
                    ? `${fill.accepted} of ${fill.needed} hours a week filled`
                    : `${need.quantityClaimed || 0} of ${need.quantityWanted} filled`}
                </span>
              </div>
            )}

            {/* Contributor Info */}
            <div className="space-y-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-[#1a472a]">Your Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  {!isAuthenticated && (
                    <p className="text-xs text-[#1a472a]/85">
                      Use the email you'd sign in with. If you make an account with it later, this offer links to your account.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={contributorPhone}
                  onChange={(e) => setContributorPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio (optional)</Label>
                <Textarea
                  id="bio"
                  value={contributorBio}
                  onChange={(e) => setContributorBio(e.target.value)}
                  placeholder="Tell the project about yourself..."
                  rows={2}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(v) => setIsAnonymous(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="anonymous" className="text-sm font-normal leading-snug text-[#1a472a]/80">
                  List me as "A contributor" publicly; the steward still sees your details
                </Label>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1a472a]">Contribution Details</h3>

              <div className="space-y-2">
                <Label htmlFor="title">{contributionType === 'knowledge' ? 'Topic *' : 'Title *'}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    contributionType === 'land' ? 'e.g., 5 hectares in Costa Rica' :
                    contributionType === 'equipment' ? 'e.g., Solar Panel System' :
                    contributionType === 'role' ? 'e.g., Full-stack Developer' :
                    contributionType === 'resource' ? 'e.g., Organic Seeds' :
                    contributionType === 'knowledge' ? 'e.g., Permaculture Design Session' :
                    'e.g., USDC Pledge'
                  }
                />
              </div>

              {/* Quantity when the need has multiple slots */}
              {need && !hoursNeed && need.quantityWanted > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="qty">How many slots? (up to {remainingSlots})</Label>
                  <Input
                    id="qty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={remainingSlots}
                    value={quantityPledged}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    // The field may be empty while typing; settle it on blur so
                    // nobody is left looking at a blank slot count. Submit already
                    // falls back to 1, so this is about what the person sees.
                    onBlur={() => { if (quantityPledged === '') handleQuantityChange('1'); }}
                  />
                </div>
              )}

              {/* Type-specific fields */}
              {contributionType === 'land' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hectares">Hectares</Label>
                    <Input
                      id="hectares"
                      type="number"
                      value={landHectares}
                      onChange={(e) => setLandHectares(e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region/Location</Label>
                    <Input
                      id="region"
                      value={landRegion}
                      onChange={(e) => setLandRegion(e.target.value)}
                      placeholder="e.g., Costa Rica"
                    />
                  </div>
                </div>
              )}

              {contributionType === 'equipment' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eqName">Equipment Name</Label>
                    <Input
                      id="eqName"
                      value={equipmentName}
                      onChange={(e) => setEquipmentName(e.target.value)}
                      placeholder="e.g., Tractor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eqQty">Quantity</Label>
                    <Input
                      id="eqQty"
                      type="number"
                      value={equipmentQuantity}
                      onChange={(e) => setEquipmentQuantity(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={equipmentCondition} onValueChange={setEquipmentCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used - Good</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {hoursNeed && fill && (
                <div className="space-y-2">
                  <Label htmlFor="offerHours">Hours a week you can offer *</Label>
                  <Input
                    id="offerHours"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_OFFER_HOURS}
                    step={1}
                    value={hoursPerWeek}
                    onChange={(e) => handleOfferHoursChange(e.target.value)}
                  />
                  <p className="text-xs text-[#1a472a]/85">
                    {fill.open} of {fill.needed} hours a week are still open. You can offer more or less.
                  </p>
                </div>
              )}

              {contributionType === 'role' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="roleTitle">Role Title</Label>
                    <Input
                      id="roleTitle"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g., Project Manager"
                    />
                  </div>
                  {!hoursNeed && (
                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours/Week</Label>
                      <Input
                        id="hours"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_OFFER_HOURS}
                        step={1}
                        value={hoursPerWeek}
                        onChange={(e) => setHoursPerWeek(e.target.value)}
                        placeholder="e.g., 20"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (months)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      placeholder="e.g., 6"
                    />
                  </div>
                </div>
              )}

              {contributionType === 'resource' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <Label htmlFor="resName">Resource Name</Label>
                    <Input
                      id="resName"
                      value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      placeholder="e.g., Seeds"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resQty">Quantity</Label>
                    <Input
                      id="resQty"
                      type="number"
                      value={resourceQuantity}
                      onChange={(e) => setResourceQuantity(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resUnit">Unit</Label>
                    <Input
                      id="resUnit"
                      value={resourceUnit}
                      onChange={(e) => setResourceUnit(e.target.value)}
                      placeholder="e.g., kg"
                    />
                  </div>
                </div>
              )}

              {contributionType === 'knowledge' && (
                <div className="space-y-2">
                  <Label htmlFor="sessionLength">Session Length (hours)</Label>
                  <Input
                    id="sessionLength"
                    type="number"
                    value={sessionLength}
                    onChange={(e) => setSessionLength(e.target.value)}
                    placeholder="e.g., 2"
                  />
                  <p className="text-xs text-[#1a472a]/85">
                    How long a session are you offering?
                  </p>
                </div>
              )}

              {contributionType === 'financial' && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Crypto Amount ({currency} value)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={financialAmount}
                    onChange={(e) => {
                      setFinancialAmount(e.target.value);
                      setEstimatedValue(e.target.value);
                    }}
                    placeholder="e.g., 10000"
                  />
                  <p className="text-xs text-[#1a472a]/85">
                    {CRYPTO_PAYMENT_CONTEXT.helperText} National currency goes through recommended funders: Ma Earth for donations, GoSteward for loans.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    contributionType === 'knowledge'
                      ? 'What will the session cover, and who is it for?'
                      : 'Provide more details about your contribution...'
                  }
                  rows={3}
                />
              </div>

              {hoursNeed && (
                <div className="rounded-xl bg-[#f0f7f0] p-3">
                  <p className="text-sm text-[#1a472a]">
                    Value of your offer:{' '}
                    <span className="font-semibold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(estimatedValue) || 0)}
                    </span>
                  </p>
                  <p className="text-xs text-[#1a472a]/85 mt-1">
                    Your share of this role's value, by the hours you offer.
                  </p>
                </div>
              )}

              {contributionType !== 'financial' && !hoursNeed && (
                <div className="space-y-2">
                  <Label htmlFor="value">Estimated Value ({currency}) *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="e.g., 5000"
                  />
                  <p className="text-xs text-[#1a472a]/85">
                    {need ? 'Prefilled from the need. Adjust if your figure is better.' : 'Estimate the monetary value of your contribution'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={contributorNotes}
                  onChange={(e) => setContributorNotes(e.target.value)}
                  placeholder="Any additional information for the project team..."
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => need ? handleClose() : setStep('type')}
                className="flex-1"
              >
                {need ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a]"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  hoursNeed ? 'Send my offer' : need ? 'Submit Claim' : 'Submit Contribution'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3, on an example campaign: a practice receipt. The server
            wrote nothing (campaigns.submitContribution returns practice:true),
            so there is no steward to hear back from, no account nudge and no
            thank-you to wait for. Rye, 2026-09-24 (decision B12c). */}
        {step === 'success' && practice && (
          <div className="py-8 text-center" data-testid="practice-receipt">
            <div className="w-16 h-16 rounded-full bg-[#f0f7f0] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#4a7c59]" />
            </div>
            <h3 className="text-xl font-bold text-[#1a472a] mb-2">Practice run complete</h3>
            <p className="text-sm text-[#1a472a]/85 max-w-sm mx-auto mb-5">
              This was an example campaign, so nothing reached a real project. The first real campaigns open soon.
            </p>
            <div className="text-left max-w-sm mx-auto mb-5 rounded-xl border border-[#4a7c59]/30 bg-[#f0f7f0] p-4">
              {waitlistJoined ? (
                <p className="flex items-start gap-2 text-sm text-[#1a472a]">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#4a7c59]" />
                  You're on the list. We'll write when the first real campaigns open.
                </p>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="space-y-2">
                  <Label htmlFor="practice-waitlist-email" className="text-sm text-[#1a472a]">
                    Want to hear when they open?
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="practice-waitlist-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-white"
                    />
                    <Button
                      type="submit"
                      disabled={joinWaitlist.isPending}
                      className="bg-[#4a7c59] hover:bg-[#1a472a] text-white whitespace-nowrap"
                    >
                      {joinWaitlist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tell me'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="outline" className="border-[#4a7c59] text-[#4a7c59]">
                <Link href="/campaigns" onClick={handleClose}>Browse campaigns</Link>
              </Button>
              <Button onClick={handleClose} className="bg-[#4a7c59] hover:bg-[#1a472a]">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && !practice && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#1a472a] mb-2">
              {hoursNeed ? 'Offer sent' : need ? 'Claim Submitted!' : 'Contribution Submitted!'}
            </h3>
            {!isAuthenticated && sentEmail && (
              <div className="text-left max-w-sm mx-auto mb-5 space-y-3">
                <p className="text-sm text-[#1a472a]/85">
                  Your offer is with the stewards. We'll email <strong className="break-all">{sentEmail}</strong> when they answer.
                </p>
                <div className="rounded-xl border border-[#4a7c59]/30 bg-[#f0f7f0] p-4">
                  <p className="text-sm text-[#1a472a]">
                    Make a free account with <strong className="break-all">{sentEmail}</strong> and you'll see every answer, delivery and thank-you in your notifications. This offer and any you made before with this email link to your account when you sign in, and show on each project's page.
                  </p>
                  <Button
                    onClick={() => setAuthOpen(true)}
                    className="mt-3 w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Make my account
                  </Button>
                </div>
              </div>
            )}
            <div className="text-left max-w-sm mx-auto space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#1a472a]/85">The steward reviews your pledge and confirms the details with you.</p>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#1a472a]/85">Delivery is when it counts. Progress and recognition land when your contribution arrives.</p>
              </div>
              {/* Thanks reach account holders in their notifications only; the
                  signed-out card above says so. */}
              {isAuthenticated && (
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#1a472a]/85">You'll get a thank-you from the project once it's in.</p>
                </div>
              )}
            </div>
            {need?.kind === 'shift' && need.shiftStartsAt && need.shiftEndsAt && (
              <Button
                variant="outline"
                onClick={handleDownloadIcs}
                className="mb-4 border-[#4a7c59] text-[#4a7c59]"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add shift to calendar (.ics)
              </Button>
            )}
            <div>
              <Button onClick={handleClose} className="bg-[#4a7c59] hover:bg-[#1a472a]">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <AuthDialog
      open={authOpen}
      onOpenChange={setAuthOpen}
      onLogin={() => setAuthOpen(false)}
      defaultEmail={step === 'success' ? sentEmail : (contributorEmail.trim() || undefined)}
    />
    </>
  );
}
