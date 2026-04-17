import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Leaf, 
  Wrench, 
  UserCheck, 
  Package, 
  DollarSign,
  Loader2,
  CheckCircle2
} from "lucide-react";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  campaignTitle: string;
  currency?: string;
  onSuccess?: () => void;
}

type ContributionType = 'land' | 'equipment' | 'role' | 'resource' | 'financial';

const contributionTypes = [
  { value: 'land', label: 'Land', icon: Leaf, color: 'text-green-600' },
  { value: 'equipment', label: 'Equipment', icon: Wrench, color: 'text-orange-600' },
  { value: 'role', label: 'Role/Skills', icon: UserCheck, color: 'text-blue-600' },
  { value: 'resource', label: 'Resources', icon: Package, color: 'text-purple-600' },
  { value: 'financial', label: 'Financial (Cash, Crypto, etc.)', icon: DollarSign, color: 'text-emerald-600' },
];

export function ContributionModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  campaignTitle,
  currency = 'USD',
  onSuccess 
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
  const [paymentMethod, setPaymentMethod] = useState('');
  
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
    setPaymentMethod('');
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
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
    
    submitMutation.mutate({
      campaignId,
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
      hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : undefined,
      durationMonths: durationMonths ? parseInt(durationMonths) : undefined,
      resourceName: resourceName.trim() || undefined,
      resourceQuantity: resourceQuantity ? parseInt(resourceQuantity) : undefined,
      resourceUnit: resourceUnit.trim() || undefined,
      financialAmount: financialAmount ? parseInt(financialAmount) : undefined,
      paymentMethod: paymentMethod || undefined,
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a]">
            {step === 'success' ? 'Contribution Submitted!' : 'Contribute to Campaign'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Select what type of contribution you want to make'}
            {step === 'details' && `Contributing to: ${campaignTitle}`}
            {step === 'success' && 'Thank you for your contribution!'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step 1: Select Type */}
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
            {/* Contributor Info */}
            <div className="space-y-4 pb-4 border-b">
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
            </div>
            
            {/* Contribution Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1a472a]">Contribution Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    contributionType === 'land' ? 'e.g., 5 hectares in Costa Rica' :
                    contributionType === 'equipment' ? 'e.g., Solar Panel System' :
                    contributionType === 'role' ? 'e.g., Full-stack Developer' :
                    contributionType === 'resource' ? 'e.g., Organic Seeds' :
                    'e.g., Seed Investment'
                  }
                />
              </div>
              
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
              
              {contributionType === 'financial' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ({currency})</Label>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details about your contribution..."
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
                    Estimate the monetary value of your contribution
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
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Back
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
                  'Submit Contribution'
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
              Contribution Submitted!
            </h3>
            <p className="text-gray-600 mb-6">
              The project team will review your contribution and get back to you soon.
            </p>
            <Button onClick={handleClose} className="bg-[#4a7c59] hover:bg-[#1a472a]">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
