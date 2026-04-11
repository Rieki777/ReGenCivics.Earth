import { ClaimType } from "@/lib/tierConfig";

export interface CapitalFormEntry {
  form: string;
  example: string;
}

export interface TangibleOutputEntry {
  type: string;
  name: string;
  description: string;
}

export interface ClaimDraft {
  id?: number;
  claimType?: ClaimType;
  displayName?: string;
  orgDescription?: string;
  formsOfCapital?: CapitalFormEntry[];
  duration?: string;
  reach?: string;
  tangibleOutputs?: TangibleOutputEntry[];
  description?: string;
  evidenceLinks?: string[];
  whatsAlive?: string;
  suggestedTier?: string;
  suggestedTierUsd?: number;
  suggestedTierTokens?: number;
  contributorOverride?: "accept" | "higher" | "lower";
  overrideReason?: string;
  routeToToolsLibrary?: boolean;
  routeToLocalScale?: boolean;
  routeToGovernance?: boolean;
  routeToMentoring?: boolean;
  routeToFundPathway?: boolean;
  improvementSuggestion?: string;
  currentStep?: number;
}

export interface ScreenProps {
  draft: ClaimDraft;
  setDraft: (patch: Partial<ClaimDraft>) => void;
  next: () => void;
  back: () => void;
}
