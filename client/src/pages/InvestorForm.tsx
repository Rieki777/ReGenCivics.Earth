/**
 * Investor Journey Form
 * Multi-step professional form for investor inquiries
 * Design: Enchanted Forest theme with professional polish
 */

import { useState, useEffect, useRef } from "react";
import { SEO, pageSEO } from "@/components/SEO";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  User, 
  Building2, 
  TrendingUp, 
  Heart, 
  Send,
  Sparkles,
  Leaf,
  Globe,
  DollarSign,
  Clock,
  Mail,
  Phone,
  Video,
  Shield,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { BackButton } from "@/components/BackButton";
import { markNewsletterSubscribed } from "@/utils/newsletter";
import { analytics } from "@/lib/analytics";

// Form data type
interface InvestorFormData {
  // Step 1: Contact Information
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  location: string;
  
  // Step 2: Investment Profile
  investorType: string;
  investmentRange: string;
  investmentTimeline: string;
  
  // Step 3: Investment Interests
  primaryInterest: string;
  geographicPreference: string;
  sectorInterests: string[];
  
  // Step 4: Background & Motivation
  investmentExperience: string;
  motivations: string;
  impactGoals: string;
  questionsForTeam: string;
  
  // Step 5: Final Details
  referralSource: string;
  additionalNotes: string;
  preferredContact: string;
  newsletterOptIn: boolean;
  
  // Mandatory Investor Verification
  isAccreditedInvestor: boolean;
  understandsRisks: boolean;
  hasReadDisclosures: boolean;
}

const initialFormData: InvestorFormData = {
  fullName: "",
  email: "",
  phone: "",
  organization: "",
  role: "",
  location: "",
  investorType: "",
  investmentRange: "",
  investmentTimeline: "",
  primaryInterest: "",
  geographicPreference: "",
  sectorInterests: [],
  investmentExperience: "",
  motivations: "",
  impactGoals: "",
  questionsForTeam: "",
  referralSource: "",
  additionalNotes: "",
  preferredContact: "email",
  newsletterOptIn: true,
  isAccreditedInvestor: false,
  understandsRisks: false,
  hasReadDisclosures: false,
};

const steps = [
  { id: 1, title: "Contact Info", icon: User },
  { id: 2, title: "Investment Profile", icon: TrendingUp },
  { id: 3, title: "Interests", icon: Globe },
  { id: 4, title: "Motivation", icon: Heart },
  { id: 5, title: "Submit", icon: Send },
];

const investorTypes = [
  { value: "individual", label: "Individual Investor", icon: User },
  { value: "family_office", label: "Family Office", icon: Building2 },
  { value: "foundation", label: "Foundation", icon: Heart },
  { value: "impact_fund", label: "Impact Fund", icon: TrendingUp },
  { value: "institutional", label: "Institutional", icon: Building2 },
  { value: "other", label: "Other", icon: Sparkles },
];

const investmentRanges = [
  { value: "250k_1m", label: "$250,000 - $1,000,000" },
  { value: "1m_5m", label: "$1,000,000 - $5,000,000" },
  { value: "5m_10m", label: "$5,000,000 - $10,000,000" },
  { value: "over_10m", label: "Over $10,000,000" },
];

const investmentTimelines = [
  { value: "immediate", label: "Ready to invest now" },
  { value: "3_months", label: "Within 3 months" },
  { value: "6_months", label: "Within 6 months" },
  { value: "1_year", label: "Within 1 year" },
  { value: "exploring", label: "Just exploring" },
];

const sectorOptions = [
  "Regenerative Agriculture",
  "Eco-Villages & Intentional Communities",
  "Renewable Energy",
  "Sustainable Housing",
  "Food Systems",
  "Water & Land Restoration",
  "Education & Training",
  "Community Finance",
];

const INVESTOR_LS_KEY = 'investor_form_draft';

function loadInvestorDraft(): Partial<InvestorFormData> | null {
  try {
    const raw = localStorage.getItem(INVESTOR_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function InvestorForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Pull `returnTo` off the URL so flows like /loi -> /investor?returnTo=/loi
  // can deliver the user back to where they started after submission. Falls
  // back to /opportunity for the default investor onboarding flow.
  const returnTo = (() => {
    if (typeof window === "undefined") return "/opportunity";
    const param = new URLSearchParams(window.location.search).get("returnTo");
    if (!param) return "/opportunity";
    // Only allow same-origin path returns (no protocol-relative or external).
    if (!param.startsWith("/") || param.startsWith("//")) return "/opportunity";
    return param;
  })();

  // Already verified - skip the form and go to wherever the user was headed
  useEffect(() => {
    const alreadyVerified =
      localStorage.getItem('investor_verified') === 'true' ||
      sessionStorage.getItem('investor_verified') === 'true';
    if (alreadyVerified) setLocation(returnTo);
  }, [setLocation, returnTo]);

  const [step, setStep] = useState(1);
  const savedEmail = localStorage.getItem('investor_email') ?? '';
  const savedName = localStorage.getItem('investor_name') ?? '';
  const [formData, setFormData] = useState<InvestorFormData>(() => {
    const draft = loadInvestorDraft();
    return {
      ...initialFormData,
      email: savedEmail,
      fullName: savedName,
      ...(draft ?? {}),
    };
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Autosave to localStorage (debounced 1 second)
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(INVESTOR_LS_KEY, JSON.stringify(formData));
      } catch { /* storage quota exceeded - ignore */ }
    }, 1000);
    return () => { if (lsTimerRef.current) clearTimeout(lsTimerRef.current); };
  }, [formData]);

  // Auto-redirect after submission to the original destination (or /opportunity)
  useEffect(() => {
    if (isSubmitted && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSubmitted && redirectCountdown === 0) {
      setLocation(returnTo);
    }
  }, [isSubmitted, redirectCountdown, setLocation, returnTo]);

  const newsletterMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => markNewsletterSubscribed(),
    onError: (error) => console.error("Newsletter subscription failed:", error.message),
  });
  
  const submitMutation = trpc.investorInquiries.submit.useMutation({
    onSuccess: () => {
      analytics.investorFormSubmitted();
      // Set verification flag so /opportunity page knows the form was completed
      sessionStorage.setItem('investor_verified', 'true');
      // Persist across sessions so returning investors skip the form
      localStorage.setItem('investor_verified', 'true');
      localStorage.setItem('investor_email', formData.email);
      localStorage.setItem('investor_name', formData.fullName);
      // Invalidate server-side hasSubmitted check for logged-in users
      if (user) {
        utils.investorInquiries.hasSubmitted.invalidate();
      }
      try { localStorage.removeItem(INVESTOR_LS_KEY); } catch { /* ignore */ }
      setIsSubmitted(true);
    },
    onError: (err) => {
      setSubmitError(err?.message || "Submission failed. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const updateField = <K extends keyof InvestorFormData>(field: K, value: InvestorFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSectorInterest = (sector: string) => {
    setFormData(prev => ({
      ...prev,
      sectorInterests: prev.sectorInterests.includes(sector)
        ? prev.sectorInterests.filter(s => s !== sector)
        : [...prev.sectorInterests, sector],
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName && formData.email && formData.isAccreditedInvestor && formData.understandsRisks && formData.hasReadDisclosures;
      case 2:
        return true; // All investment profile fields are now optional
      case 3:
        return true; // All interest fields are now optional
      case 4:
        return true; // Optional step
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    submitMutation.mutate({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone || undefined,
      organization: formData.organization || undefined,
      role: formData.role || undefined,
      location: formData.location || undefined,
      investorType: formData.investorType ? formData.investorType as any : undefined,
      investmentRange: formData.investmentRange ? formData.investmentRange as any : undefined,
      investmentTimeline: formData.investmentTimeline ? formData.investmentTimeline as any : undefined,
      primaryInterest: formData.primaryInterest ? formData.primaryInterest as any : undefined,
      geographicPreference: formData.geographicPreference || undefined,
      sectorInterests: formData.sectorInterests.length > 0 ? JSON.stringify(formData.sectorInterests) : undefined,
      investmentExperience: formData.investmentExperience || undefined,
      motivations: formData.motivations || undefined,
      impactGoals: formData.impactGoals || undefined,
      questionsForTeam: formData.questionsForTeam || undefined,
      referralSource: formData.referralSource || undefined,
      additionalNotes: formData.additionalNotes || undefined,
      preferredContact: formData.preferredContact as any,
      newsletterOptIn: formData.newsletterOptIn,
    });
    
    // Auto-subscribe to newsletter if opted in
    if (formData.newsletterOptIn && formData.email) {
      newsletterMutation.mutate({
        email: formData.email,
        name: formData.fullName || undefined,
        source: "investor_form" as const,
      });
    }
  };

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center p-4">
      <SEO {...pageSEO.investorForm} />
      <BackButton fallbackPath="/fund" />
        <div className="max-w-lg w-full">
          <Card className="bg-white/95 backdrop-blur-sm border-4 border-[#7dd87d] shadow-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-[#1a472a] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Thank You, {formData.fullName.split(' ')[0]}!
              </h2>
              
              <p className="text-[#1a472a]/80 text-lg mb-4">
                Your inquiry has been received. We'll get back to you.
              </p>
              
              <div className="bg-[#f0ebe3] rounded-xl p-4 mb-6">
                <p className="text-[#1a472a]/85 text-sm mb-2">
                  You'll receive our <strong>Investment Memo</strong> shortly.
                </p>
                <p className="text-[#7dd87d] font-semibold text-sm">
                  Redirecting to Investment Memo in {redirectCountdown}...
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button
                    className="rounded-xl bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffd700] hover:to-[#9de89d] text-[#1a472a]"
                    style={{ fontFamily: 'var(--font-accent)' }}
                  >
                    Return Home
                  </Button>
                </Link>
                <Link href="/opportunity">
                  <Button
                    variant="outline"
                    className="rounded-xl border-2 border-[#1a472a] text-[#1a472a] hover:bg-[#1a472a]/10"
                    style={{ fontFamily: 'var(--font-accent)' }}
                  >
                    Explore Investment Memo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <SeedOfLifeIcon className="w-12 h-12 text-[#7dd87d] mx-auto" />
          </Link>
          <h1 
            className="text-3xl md:text-4xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Investor Journey
          </h1>
          <p className="text-white/80 mb-3">
            Join us in financing the ReGenerative Renaissance
          </p>
          <div className="inline-flex items-center gap-2 text-[#7dd87d] text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Learn about the $1 Trillion Opportunity in Regenerative Land Projects
          </div>
        </div>

        {/* Welcome back banner for returning investors */}
        {(savedEmail || savedName) && (
          <div className="mb-6 bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-xl px-4 py-3 text-sm text-[#7dd87d]">
            Welcome back{savedName ? `, ${savedName}` : ""}. Your information has been pre-filled from your last visit. You can update it before resubmitting.
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isComplete = s.id < step;
              
              return (
                <div key={s.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? "bg-[#7dd87d] text-[#1a472a]"
                        : isActive
                        ? "bg-white text-[#1a472a] ring-4 ring-[#7dd87d]/50"
                        : "bg-white/20 text-white/60"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 hidden sm:block ${isActive ? "text-white" : "text-white/60"}`}>
                    {s.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="absolute hidden" /> // Connector handled by progress bar
                  )}
                </div>
              );
            })}
          </div>
          {/* Step progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Step {step} of {steps.length}</span>
              <span className="text-sm font-medium text-white">{steps[step - 1]?.title}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-[#7dd87d] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
          <div key={step}>
              {/* Step 1: Contact Information */}
              {step === 1 && (
                <>
                  <CardHeader className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
                    <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <User className="w-6 h-6" />
                      Contact Information
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Let us know how to reach you. After submitting, you'll get access to our Investment Thesis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[#1a472a] font-medium">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => updateField("fullName", e.target.value)}
                          placeholder="Your full name"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[#1a472a] font-medium">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="your@email.com"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[#1a472a] font-medium">
                          Phone (Optional)
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-[#1a472a] font-medium">
                          Location (Optional)
                        </Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => updateField("location", e.target.value)}
                          placeholder="City, Country"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-[#1a472a] font-medium">
                          Organization (Optional)
                        </Label>
                        <Input
                          id="organization"
                          value={formData.organization}
                          onChange={(e) => updateField("organization", e.target.value)}
                          placeholder="Company or fund name"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-[#1a472a] font-medium">
                          Role (Optional)
                        </Label>
                        <Input
                          id="role"
                          value={formData.role}
                          onChange={(e) => updateField("role", e.target.value)}
                          placeholder="Your title or role"
                          className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                        />
                      </div>
                    </div>

                    {/* Mandatory Investor Verification */}
                    <div className="mt-6 pt-6 border-t-2 border-[#1a472a]/10">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-[#ffd700]" />
                        <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                          Investor Verification
                        </h3>
                      </div>
                      <p className="text-sm text-[#1a472a]/60 mb-4">
                        The following confirmations are required before accessing investment materials.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#f0ebe3] border border-[#1a472a]/10">
                          <Checkbox
                            id="isAccreditedInvestor"
                            checked={formData.isAccreditedInvestor}
                            onCheckedChange={(checked) => updateField("isAccreditedInvestor", checked as boolean)}
                            className="mt-0.5"
                          />
                          <Label htmlFor="isAccreditedInvestor" className="text-[#1a472a] cursor-pointer text-sm leading-relaxed">
                            <span className="font-semibold text-[#1a472a]">I am an accredited investor</span>
                            <span className="block text-xs text-[#1a472a]/85 mt-1">
                              As defined by applicable securities regulations in my jurisdiction.
                            </span>
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#f0ebe3] border border-[#1a472a]/10">
                          <Checkbox
                            id="understandsRisks"
                            checked={formData.understandsRisks}
                            onCheckedChange={(checked) => updateField("understandsRisks", checked as boolean)}
                            className="mt-0.5"
                          />
                          <Label htmlFor="understandsRisks" className="text-[#1a472a] cursor-pointer text-sm leading-relaxed">
                            <span className="font-semibold text-[#1a472a]">I understand the risks</span>
                            <span className="block text-xs text-[#1a472a]/85 mt-1">
                              I understand that investments in regenerative land projects and early-stage ventures carry significant risk, including potential loss of principal.
                            </span>
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#f0ebe3] border border-[#1a472a]/10">
                          <Checkbox
                            id="hasReadDisclosures"
                            checked={formData.hasReadDisclosures}
                            onCheckedChange={(checked) => updateField("hasReadDisclosures", checked as boolean)}
                            className="mt-0.5"
                          />
                          <Label htmlFor="hasReadDisclosures" className="text-[#1a472a] cursor-pointer text-sm leading-relaxed">
                            <span className="font-semibold text-[#1a472a]">I have read the risk disclosures</span>
                            <span className="block text-xs mt-1">
                              <a 
                                href="/risk-disclosure" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#4a7c59] underline hover:text-[#7dd87d] font-medium"
                              >
                                View Risk Disclosures
                              </a>
                            </span>
                          </Label>
                        </div>
                      </div>
                      
                      {!formData.isAccreditedInvestor || !formData.understandsRisks || !formData.hasReadDisclosures ? (
                        <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-muted p-3 rounded-lg border border-border">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>All three checkboxes must be confirmed to proceed.</span>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 2: Investment Profile */}
              {step === 2 && (
                <>
                  <CardHeader className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
                    <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <TrendingUp className="w-6 h-6" />
                      Investment Profile
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Help us understand your investment capacity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        What type of investor are you? (Optional)
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {investorTypes.map((type) => {
                          const Icon = type.icon;
                          const isSelected = formData.investorType === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => updateField("investorType", type.value)}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? "border-[#7dd87d] bg-[#7dd87d]/10"
                                  : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                              }`}
                            >
                              <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-[#4a7c59]" : "text-[#1a472a]/80"}`} />
                              <span className={`text-sm font-medium ${isSelected ? "text-[#1a472a]" : "text-[#1a472a]"}`}>
                                {type.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        Investment Range (Optional)
                      </Label>
                      <Select value={formData.investmentRange} onValueChange={(v) => updateField("investmentRange", v)}>
                        <SelectTrigger className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]">
                          <SelectValue placeholder="Select your investment range" />
                        </SelectTrigger>
                        <SelectContent>
                          {investmentRanges.map((range) => (
                            <SelectItem key={range.value} value={range.value}>
                              <span className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#4a7c59]" />
                                {range.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        Investment Timeline (Optional)
                      </Label>
                      <RadioGroup
                        value={formData.investmentTimeline}
                        onValueChange={(v) => updateField("investmentTimeline", v)}
                        className="space-y-2"
                      >
                        {investmentTimelines.map((timeline) => (
                          <div
                            key={timeline.value}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              formData.investmentTimeline === timeline.value
                                ? "border-[#7dd87d] bg-[#7dd87d]/10"
                                : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                            }`}
                            onClick={() => updateField("investmentTimeline", timeline.value)}
                          >
                            <RadioGroupItem value={timeline.value} id={timeline.value} />
                            <Label htmlFor={timeline.value} className="flex items-center gap-2 cursor-pointer flex-1 text-[#1a472a] font-medium">
                              <Clock className="w-4 h-4 text-[#4a7c59]" />
                              {timeline.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: Investment Interests */}
              {step === 3 && (
                <>
                  <CardHeader className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
                    <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <Globe className="w-6 h-6" />
                      Investment Interests
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      What areas of regeneration interest you most?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        Primary Interest (Optional)
                      </Label>
                      <RadioGroup
                        value={formData.primaryInterest}
                        onValueChange={(v) => updateField("primaryInterest", v)}
                        className="space-y-2"
                      >
                        <div
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            formData.primaryInterest === "land_projects"
                              ? "border-[#7dd87d] bg-[#7dd87d]/10"
                              : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                          }`}
                          onClick={() => updateField("primaryInterest", "land_projects")}
                        >
                          <RadioGroupItem value="land_projects" id="land_projects" />
                          <Label htmlFor="land_projects" className="cursor-pointer flex-1">
                            <span className="font-medium text-[#1a472a]">Specific Land Projects</span>
                            <p className="text-sm text-[#1a472a]/80">Invest directly in individual regenerative land projects</p>
                          </Label>
                        </div>
                        <div
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            formData.primaryInterest === "alliance_fund"
                              ? "border-[#7dd87d] bg-[#7dd87d]/10"
                              : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                          }`}
                          onClick={() => updateField("primaryInterest", "alliance_fund")}
                        >
                          <RadioGroupItem value="alliance_fund" id="alliance_fund" />
                          <Label htmlFor="alliance_fund" className="cursor-pointer flex-1">
                            <span className="font-medium text-[#1a472a]">ReGen Civics Alliance Fund</span>
                            <p className="text-sm text-[#1a472a]/80">Diversified investment across the entire network</p>
                          </Label>
                        </div>
                        <div
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            formData.primaryInterest === "both"
                              ? "border-[#7dd87d] bg-[#7dd87d]/10"
                              : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                          }`}
                          onClick={() => updateField("primaryInterest", "both")}
                        >
                          <RadioGroupItem value="both" id="both" />
                          <Label htmlFor="both" className="cursor-pointer flex-1">
                            <span className="font-medium text-[#1a472a]">Both Options</span>
                            <p className="text-sm text-[#1a472a]/80">Interested in exploring all investment opportunities</p>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        Sector Interests (Select all that apply)
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {sectorOptions.map((sector) => {
                          const isSelected = formData.sectorInterests.includes(sector);
                          return (
                            <button
                              key={sector}
                              type="button"
                              onClick={() => toggleSectorInterest(sector)}
                              className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                                isSelected
                                  ? "border-[#7dd87d] bg-[#7dd87d]/10 text-[#1a472a]"
                                  : "border-[#1a472a]/20 text-[#1a472a] hover:border-[#7dd87d]/50"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#4a7c59]" />}
                                {sector}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="geographicPreference" className="text-[#1a472a] font-medium">
                        Geographic Preference (Optional)
                      </Label>
                      <Input
                        id="geographicPreference"
                        value={formData.geographicPreference}
                        onChange={(e) => updateField("geographicPreference", e.target.value)}
                        placeholder="e.g., Europe, Latin America, Global"
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 4: Background & Motivation */}
              {step === 4 && (
                <>
                  <CardHeader className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
                    <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <Heart className="w-6 h-6" />
                      Background & Motivation
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Help us understand your journey and goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="investmentExperience" className="text-[#1a472a] font-medium">
                        Investment Experience
                      </Label>
                      <Textarea
                        id="investmentExperience"
                        value={formData.investmentExperience}
                        onChange={(e) => updateField("investmentExperience", e.target.value)}
                        placeholder="Tell us about your experience with impact investing, regenerative projects, or related fields..."
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d] min-h-[100px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="motivations" className="text-[#1a472a] font-medium">
                        What motivates you to invest in regeneration?
                      </Label>
                      <Textarea
                        id="motivations"
                        value={formData.motivations}
                        onChange={(e) => updateField("motivations", e.target.value)}
                        placeholder="Share what draws you to regenerative investing..."
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d] min-h-[100px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="impactGoals" className="text-[#1a472a] font-medium">
                        Impact Goals
                      </Label>
                      <Textarea
                        id="impactGoals"
                        value={formData.impactGoals}
                        onChange={(e) => updateField("impactGoals", e.target.value)}
                        placeholder="What impact do you hope to create through your investments?"
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d] min-h-[100px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="questionsForTeam" className="text-[#1a472a] font-medium">
                        Questions for Our Team
                      </Label>
                      <Textarea
                        id="questionsForTeam"
                        value={formData.questionsForTeam}
                        onChange={(e) => updateField("questionsForTeam", e.target.value)}
                        placeholder="Any questions you'd like us to address in our conversation?"
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d] min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 5: Final Details */}
              {step === 5 && (
                <>
                  <CardHeader className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white">
                    <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <Send className="w-6 h-6" />
                      Final Details
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Almost there! Just a few more details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="referralSource" className="text-[#1a472a] font-medium">
                        How did you hear about us?
                      </Label>
                      <Input
                        id="referralSource"
                        value={formData.referralSource}
                        onChange={(e) => updateField("referralSource", e.target.value)}
                        placeholder="e.g., Friend, Conference, Social Media, Search"
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d]"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[#1a472a] font-medium">
                        Preferred Contact Method
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: "email", label: "Email", icon: Mail },
                          { value: "phone", label: "Phone", icon: Phone },
                          { value: "video_call", label: "Video Call", icon: Video },
                        ].map((method) => {
                          const Icon = method.icon;
                          const isSelected = formData.preferredContact === method.value;
                          return (
                            <button
                              key={method.value}
                              type="button"
                              onClick={() => updateField("preferredContact", method.value)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? "border-[#7dd87d] bg-[#7dd87d]/10 text-[#1a472a]"
                                  : "border-[#1a472a]/20 text-[#1a472a] hover:border-[#7dd87d]/50"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {method.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes" className="text-[#1a472a] font-medium">
                        Additional Notes
                      </Label>
                      <Textarea
                        id="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={(e) => updateField("additionalNotes", e.target.value)}
                        placeholder="Anything else you'd like us to know?"
                        className="border-2 border-[#1a472a]/20 focus:border-[#7dd87d] min-h-[80px]"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 rounded-lg bg-[#f0ebe3]">
                      <Checkbox
                        id="newsletterOptIn"
                        checked={formData.newsletterOptIn}
                        onCheckedChange={(checked) => updateField("newsletterOptIn", checked as boolean)}
                      />
                      <Label htmlFor="newsletterOptIn" className="text-[#1a472a] cursor-pointer">
                        Keep me updated with ReGen Civics news and investment opportunities
                      </Label>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 rounded-xl p-4 border border-[#7dd87d]/30">
                      <h4 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#4a7c59]" />
                        Ready to Submit
                      </h4>
                      <p className="text-[#1a472a]/80 text-sm">
                        By submitting this form, you're taking the first step toward joining the ReGenerative Renaissance. 
                        Our team will review your inquiry and reach out to schedule a conversation.
                      </p>
                    </div>
                  </CardContent>
                </>
              )}
            </div>

          {/* Navigation */}
          <div className="flex justify-between items-center p-6 bg-[#f0ebe3] border-t border-[#1a472a]/10">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="rounded-xl border-2 border-[#1a472a]/30 text-[#1a472a]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {step < 5 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="rounded-xl bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffd700] hover:to-[#9de89d] text-[#1a472a]"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
              {submitError && (
                <div className="mb-3 bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-400">
                  {submitError}
                </div>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="rounded-xl bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffd700] hover:to-[#9de89d] text-[#1a472a]"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                {submitMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              </>
            )}
          </div>
        </Card>

        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm flex items-center justify-center gap-2">
            <Leaf className="w-4 h-4" />
            Your information is secure and will only be used to connect you with investment opportunities
          </p>
        </div>
      </div>
    </div>
  );
}
