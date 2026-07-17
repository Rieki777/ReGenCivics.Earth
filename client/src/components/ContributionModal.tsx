import { useState, useEffect } from "react";
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
  Gift
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
  onSuccess?: () => void;
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
      if (mapped === 'equipment') {
        setEquipmentName(need.title);
      }
    }
  }, [isOpen, need]);

  const submitMutation = trpc.campaigns.submitContribution.useMutation({
    onSuccess: () => {
      setStep('success');
      onSuccess?.();
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Quantity changes rescale the prefilled value proportionally.
  const handleQuantityChange = (raw: string) => {
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

  const handleSubmit = () => {
    if (!contributionType) return;

    // Validate required fields
    if (!contributorName.trim() || !contributorEmail.trim() || !title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const value = parseInt(estimatedValue) || 0;
    if (value <= 0) {
      toast.error('Please enter a valid estimated value');
      return;
    }

    const refParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ref')
      : null;

    submitMutation.mutate({
      campaignId,
      campaignItemId: need?.id,
      quantityPledged: need ? (parseInt(quantityPledged) || 1) : 1,
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
        ? (sessionLength ? parseInt(sessionLength) : undefined)
        : (hoursPerWeek ? parseInt(hoursPerWeek) : undefined),
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-[#1a472a]">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a]">
            {step === 'success' ? 'Contribution Submitted!' :
              need ? `Claim: ${need.title}` : 'Contribute to Campaign'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Select what type of contribution you want to make'}
            {step === 'details' && (need
              ? `Claiming a ${(KIND_LABELS[need.kind] || 'need').toLowerCase()} need on ${campaignTitle}`
              : `Contributing to: ${campaignTitle}`)}
            {step === 'success' && 'Thank you for your contribution!'}
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
            {/* Need summary when claiming a slot */}
            {need && (
              <div className="bg-[#f0f7f0] rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide">
                    {KIND_LABELS[need.kind] || 'Need'}
                  </span>
                  <p className="text-sm font-medium text-[#1a472a]">{need.title}</p>
                </div>
                <span className="text-xs text-[#1a472a]/80 whitespace-nowrap">
                  {need.quantityDelivered} of {need.quantityWanted} filled
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
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
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
              {need && need.quantityWanted > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="qty">How many slots? (up to {remainingSlots})</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    max={remainingSlots}
                    value={quantityPledged}
                    onChange={(e) => handleQuantityChange(e.target.value)}
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
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours/Week</Label>
                    <Input
                      id="hours"
                      type="number"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      placeholder="e.g., 20"
                    />
                  </div>
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
                  <p className="text-xs text-gray-500">
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
                  <p className="text-xs text-gray-600">
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

              {contributionType !== 'financial' && (
                <div className="space-y-2">
                  <Label htmlFor="value">Estimated Value ({currency}) *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="e.g., 5000"
                  />
                  <p className="text-xs text-gray-500">
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
                  need ? 'Submit Claim' : 'Submit Contribution'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#1a472a] mb-2">
              {need ? 'Claim Submitted!' : 'Contribution Submitted!'}
            </h3>
            <div className="text-left max-w-sm mx-auto space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">The steward reviews your pledge and confirms the details with you.</p>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">Delivery is when it counts. Progress and recognition land when your contribution arrives.</p>
              </div>
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">You'll get a thank-you from the project once it's in.</p>
              </div>
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
  );
}
