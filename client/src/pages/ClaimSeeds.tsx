/**
 * ClaimSeeds.tsx
 * Multi-step form for SEEDS token holders to claim $ReGen tokens.
 * Step 1: Account lookup
 * Step 2: Contribution review and adjustment
 * Step 3: Base wallet details
 * Step 4: Confirm and submit
 * Dispute path: For accounts not found or contested amounts
 */

import { useState, useEffect, useRef } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/FileUpload";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Save,
} from "lucide-react";
import { Link } from "wouter";

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

type Transaction = {
  date: string | Date;
  transactionId: string;
  usdAmount?: number;
  usdValue?: number;
};

type ClaimFormData = {
  seedsAccount: string;
  totalUsd: number;
  adjustedUsd: number;
  spentAmount: number;
  hasSpentTokens: boolean;
  transactions: Transaction[];
  baseWalletAddress: string;
  email: string;
  disputeExplanation: string;
  disputeEvidence: UploadedFile[];
  isOnDisputePath: boolean;
};

type LookupResult = {
  found: boolean;
  totalUsd?: number;
  transactions?: Transaction[];
  existingClaim?: {
    status: string;
    amount: number;
  };
};

const LS_KEY = "seeds-claim-draft";

function loadDraft(): Partial<ClaimFormData> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const INITIAL_FORM_DATA: ClaimFormData = {
  seedsAccount: "",
  totalUsd: 0,
  adjustedUsd: 0,
  spentAmount: 0,
  hasSpentTokens: false,
  transactions: [],
  baseWalletAddress: "",
  email: "",
  disputeExplanation: "",
  disputeEvidence: [],
  isOnDisputePath: false,
};

export default function ClaimSeeds() {
  const { isAuthenticated, user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ClaimFormData>(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_FORM_DATA, ...draft } : INITIAL_FORM_DATA;
  });
  const [draftRestored, setDraftRestored] = useState(() => loadDraft() !== null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);

  // Pre-fill the email field from the signed-in account so users do not have
  // to retype it. Only fills when the field is currently empty.
  useEffect(() => {
    if (isAuthenticated && user?.email && !formData.email) {
      setFormData(f => ({ ...f, email: user.email ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.email]);

  // Autosave to localStorage (debounced)
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(formData));
      } catch {
        // storage quota exceeded, ignore
      }
    }, 1000);
    return () => {
      if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    };
  }, [formData]);

  const lookupMutation = trpc.seedsClaims.lookup.useMutation();
  const submitMutation = trpc.seedsClaims.submit.useMutation({
    onSuccess: (result) => {
      setSubmittedClaimId(String(result.claimId));
      setIsSubmitted(true);
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        // ignore
      }
    },
    onError: (err) => {
      setSubmitError(err?.message || "Submission failed. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const updateField = <K extends keyof ClaimFormData>(
    field: K,
    value: ClaimFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLookup = async () => {
    if (!formData.seedsAccount.trim()) {
      setSubmitError("Please enter your SEEDS account name");
      return;
    }

    setSubmitError(null);
    const result = await lookupMutation.mutateAsync({
      seedsAccount: formData.seedsAccount.trim(),
    });

    if (result.found && result.totalUsd !== undefined && result.transactions) {
      updateField("totalUsd", result.totalUsd);
      updateField("adjustedUsd", result.totalUsd);
      updateField("transactions", result.transactions);
      setStep(2);
    } else {
      // Account not found, move to dispute path
      updateField("isOnDisputePath", true);
      setStep(2);
    }
  };

  const handleSpentTokensChange = (spent: boolean) => {
    updateField("hasSpentTokens", spent);
    if (!spent) {
      updateField("spentAmount", 0);
      updateField("adjustedUsd", formData.totalUsd);
    }
  };

  const handleSpentAmountChange = (amount: number) => {
    updateField("spentAmount", amount);
    updateField("adjustedUsd", Math.max(0, formData.totalUsd - amount));
  };

  const validateBaseWallet = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const canProceedToStep3 = (): boolean => {
    if (formData.isOnDisputePath) {
      return (
        formData.seedsAccount.trim() !== "" &&
        formData.spentAmount > 0 &&
        formData.disputeExplanation.trim() !== ""
      );
    }
    return true;
  };

  const canProceedToStep4 = (): boolean => {
    return (
      validateBaseWallet(formData.baseWalletAddress) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    );
  };

  const regenAmount = (formData.adjustedUsd || 0) * 100;

  if (isSubmitted) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-gradient-to-b bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 shadow-lg">
              <CardHeader className="text-center space-y-3">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-3xl">Claim Submitted</CardTitle>
                <CardDescription className="text-lg">
                  Your SEEDS contribution claim has been received.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted border border-border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Claim ID</p>
                  <p className="font-mono text-lg text-primary">{submittedClaimId}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="text-foreground">
                    We will verify your claim against the Telos blockchain and process
                    it within 7-10 business days. You will receive email updates at:
                  </p>
                  <p className="font-medium text-foreground">{formData.email}</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    Join the ReGen Civics community to start building with us.
                  </p>
                </div>

                <Link href="/play">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Continue to ReGen Civics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-b bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Step Indicator */}
          <div className="flex justify-between mb-8 px-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    s === step
                      ? "bg-amber-600 text-white"
                      : s < step
                        ? "bg-green-600 text-white"
                        : "bg-gray-300 text-muted-foreground"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center w-16">
                  {s === 1 && "Account"}
                  {s === 2 && "Review"}
                  {s === 3 && "Wallet"}
                  {s === 4 && "Confirm"}
                </p>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {/* Draft Restored Notice */}
          {draftRestored && step === 1 && (
            <div className="mb-6 p-4 bg-muted border border-border rounded-lg flex gap-2">
              <Save className="w-4 h-4 text-primary mt-0.5" />
              <p className="text-sm text-primary">
                Your draft has been restored. You can continue where you left off.
              </p>
            </div>
          )}

          {/* STEP 1: Account Lookup */}
          {step === 1 && !formData.isOnDisputePath && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-2xl">Claim Your SEEDS Contributions</CardTitle>
                <CardDescription>
                  Your financial contributions to SEEDS are being honored in ReGen Civics.
                  Enter your SEEDS account name to look up your contribution records.
                  Claims are open until September 22, 2026.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="seedsAccount" className="text-base font-medium">
                    SEEDS Account Name
                  </Label>
                  <Input
                    id="seedsAccount"
                    placeholder="your12charname"
                    maxLength={12}
                    value={formData.seedsAccount}
                    onChange={(e) => updateField("seedsAccount", e.target.value.toLowerCase())}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is the account name you created when you signed up for SEEDS. Check
                    your SEEDS wallet profile to find it.
                  </p>
                </div>

                <div className="flex gap-2 text-sm">
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                  <a
                    href="https://eosauthority.com/tokens/token.seeds/SEEDS?network=telos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary underline"
                  >
                    View SEEDS token information
                  </a>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleLookup}
                    disabled={lookupMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {lookupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      "Look Up My Account"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Contribution Review */}
          {step === 2 && !formData.isOnDisputePath && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Review Your Contributions</CardTitle>
                <CardDescription>
                  Verify your SEEDS transaction history and adjust if needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Contribution Summary */}
                <div className="bg-muted border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Original USD Contribution</p>
                  <p className="text-3xl font-bold text-primary">${formData.totalUsd.toFixed(2)}</p>
                  <p className="text-sm text-primary">
                    Equivalent: {(formData.totalUsd * 100).toLocaleString()} $ReGen tokens
                  </p>
                </div>

                {/* Transaction Table */}
                {formData.transactions && formData.transactions.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium text-foreground">Date</th>
                          <th className="text-left py-2 font-medium text-foreground">Transaction ID</th>
                          <th className="text-right py-2 font-medium text-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.transactions.map((tx, idx) => (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-3 text-muted-foreground">{typeof tx.date === 'string' ? tx.date : tx.date.toLocaleDateString()}</td>
                            <td className="py-3">
                              <a
                                href={`https://eosauthority.com/transaction/${tx.transactionId}?network=telos`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary underline text-xs font-mono flex items-center gap-1"
                              >
                                {tx.transactionId.slice(0, 10)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="py-3 text-right text-foreground">
                              ${(tx.usdAmount ?? tx.usdValue ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Spent Tokens Question */}
                <div className="space-y-4 border-t pt-6">
                  <p className="font-medium text-foreground">
                    Did you sell, spend, or transfer any of the SEEDS tokens you purchased?
                  </p>
                  <RadioGroup
                    value={formData.hasSpentTokens ? "yes" : "no"}
                    onValueChange={(val) => handleSpentTokensChange(val === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no-spent" />
                      <Label htmlFor="no-spent" className="font-normal">
                        No, I still hold all my SEEDS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes-spent" />
                      <Label htmlFor="yes-spent" className="font-normal">
                        Yes, I used some
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Spent Amount Input */}
                {formData.hasSpentTokens && (
                  <div className="space-y-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="space-y-2">
                      <Label htmlFor="spentAmount" className="text-sm font-medium">
                        Approximate USD value of SEEDS you sold, spent, or transferred
                      </Label>
                      <Input
                        id="spentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.spentAmount || ""}
                        onChange={(e) => handleSpentAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-lg"
                      />
                    </div>

                    {/* Adjusted Amount */}
                    <div className="bg-white rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Adjusted USD Amount</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${formData.adjustedUsd.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {regenAmount.toLocaleString()} $ReGen tokens
                      </p>
                    </div>

                    {/* Fraud Warning */}
                    <div className="bg-muted border border-border rounded-lg p-3 mt-4">
                      <p className="text-xs font-medium text-foreground flex gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          We will verify all claims against the Telos blockchain before minting.
                          The full transaction history for your account is public. Any claim that
                          doesn't match the on-chain record will be denied, and you will lose your
                          ability to claim entirely.
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      updateField("isOnDisputePath", false);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!formData.hasSpentTokens && step === 2}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Dispute Path */}
          {step === 2 && formData.isOnDisputePath && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Claim Dispute</CardTitle>
                <CardDescription>
                  We couldn't find your account or you'd like to claim a different amount.
                  Submit your claim for admin review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="disputeSeedAccount" className="text-base font-medium">
                    SEEDS Account Name
                  </Label>
                  <Input
                    id="disputeSeedAccount"
                    value={formData.seedsAccount}
                    onChange={(e) => updateField("seedsAccount", e.target.value.toLowerCase())}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="disputeAmount" className="text-base font-medium">
                    USD Amount Claiming
                  </Label>
                  <Input
                    id="disputeAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.spentAmount || ""}
                    onChange={(e) => updateField("spentAmount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Equivalent: {(formData.spentAmount * 100).toLocaleString()} $ReGen tokens
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="disputeExplanation" className="text-base font-medium">
                    Explanation
                  </Label>
                  <Textarea
                    id="disputeExplanation"
                    value={formData.disputeExplanation}
                    onChange={(e) => updateField("disputeExplanation", e.target.value)}
                    placeholder="Explain why your account wasn't found or why you believe you're owed a different amount..."
                    rows={5}
                  />
                </div>

                <div>
                  <FileUpload
                    value={formData.disputeEvidence}
                    onChange={(files) => updateField("disputeEvidence", files)}
                    maxFiles={3}
                    maxSizeMB={10}
                    label="Supporting Evidence (Optional)"
                    helperText="Upload screenshots, transaction records, or other documentation"
                  />
                </div>

                {/* Fraud Warning */}
                <div className="bg-muted border border-border rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      We will verify all claims against the Telos blockchain before minting.
                      Any fraudulent claim will result in permanent disqualification.
                    </span>
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      updateField("isOnDisputePath", false);
                      updateField("disputeExplanation", "");
                      updateField("disputeEvidence", []);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToStep3()}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Base Wallet */}
          {step === 3 && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Base Wallet Address</CardTitle>
                <CardDescription>
                  ReGen Civics runs on Base (Coinbase's blockchain). Your $ReGen tokens
                  will be sent to your Base wallet address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    If you don't have one yet, go to{" "}
                    <a
                      href="https://app.hypha.earth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline hover:text-blue-800"
                    >
                      app.hypha.earth
                    </a>{" "}
                    to create a free Base blockchain account.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="baseWallet" className="text-base font-medium">
                    Base Wallet Address
                  </Label>
                  <Input
                    id="baseWallet"
                    placeholder="0x..."
                    value={formData.baseWalletAddress}
                    onChange={(e) => updateField("baseWalletAddress", e.target.value)}
                    className={`font-mono ${
                      formData.baseWalletAddress &&
                      !validateBaseWallet(formData.baseWalletAddress)
                        ? "border-red-300"
                        : ""
                    }`}
                  />
                  {formData.baseWalletAddress && !validateBaseWallet(formData.baseWalletAddress) && (
                    <p className="text-xs text-destructive">
                      Please enter a valid Base wallet address (starts with 0x)
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll send you claim status updates at this address.
                  </p>
                </div>

                {isAuthenticated ? (
                  <div className="rounded-lg border border-[#7dd87d]/50 bg-[#7dd87d]/10 p-4">
                    <p className="text-sm text-white/90">
                      <span className="font-semibold text-[#7dd87d]">Signed in.</span>{" "}
                      We'll send claim updates to{" "}
                      <span className="font-mono text-white">{user?.email ?? "your account email"}</span>{" "}
                      and link this claim to your player profile so you can start playing
                      right after submission.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#7dd87d]/30 bg-[#0d2818]/60 p-4 space-y-3">
                    <p className="text-sm text-white/90">
                      Sign in to link this claim to your player profile and pick up
                      right where you left off after submission.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // The draft is already auto-saved to localStorage so the
                          // form will repopulate after the OAuth round-trip.
                          window.location.href = getLoginUrl();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7dd87d] text-[#1a472a] font-semibold text-sm hover:bg-[#9de89d] transition-colors"
                      >
                        Sign in / Create account
                      </button>
                      <span className="text-xs text-white/55 self-center">
                        Or continue as a guest. Your draft is auto-saved.
                      </span>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!canProceedToStep4()}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Confirm & Submit */}
          {step === 4 && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Confirm & Submit Claim</CardTitle>
                <CardDescription>
                  Review your information before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Summary */}
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">SEEDS Account</span>
                      <span className="font-medium text-foreground text-right">
                        {formData.seedsAccount}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Original USD</span>
                      <span className="font-medium text-foreground">
                        ${formData.totalUsd.toFixed(2)}
                      </span>
                    </div>
                    {formData.hasSpentTokens && formData.spentAmount > 0 && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">Spent/Transferred</span>
                          <span className="font-medium text-foreground">
                            -${formData.spentAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                      </>
                    )}
                    <div className="flex justify-between items-start bg-amber-50 -mx-4 -my-3 px-4 py-3 rounded">
                      <span className="text-sm font-medium text-foreground">Final USD Claim</span>
                      <span className="font-bold text-primary">
                        ${formData.adjustedUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">$ReGen Tokens</span>
                      <span className="font-bold text-foreground">
                        {regenAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Base Wallet</span>
                      <span className="font-mono text-xs text-foreground text-right">
                        {formData.baseWalletAddress}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm text-foreground">{formData.email}</span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="space-y-4 border-y py-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="confirm"
                      checked={formData.hasSpentTokens}
                      onCheckedChange={(checked) =>
                        updateField("hasSpentTokens", checked === true)
                      }
                    />
                    <label htmlFor="confirm" className="text-sm leading-relaxed text-foreground">
                      I confirm this information is accurate. I understand that claims are
                      verified against the blockchain and fraudulent claims result in permanent
                      disqualification.
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      submitMutation.mutate({
                        seedsAccount: formData.seedsAccount,
                        email: formData.email,
                        originalUsdTotal: formData.totalUsd,
                        spentUsdAmount: formData.spentAmount,
                        claimedUsdAmount: formData.adjustedUsd,
                        regenAmount: formData.adjustedUsd, // 1:1 USD to $ReGen
                        baseWalletAddress: formData.baseWalletAddress,
                        isDispute: formData.isOnDisputePath,
                        disputeReason: formData.disputeExplanation || undefined,
                        evidenceUrls: formData.disputeEvidence.length > 0 ? JSON.stringify(formData.disputeEvidence.map(f => f.url)) : undefined,
                      });
                    }}
                    disabled={!formData.hasSpentTokens || submitMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Claim"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
