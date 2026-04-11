"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { fetchFromMainSite } from "@/lib/api";
import { ClaimDraft } from "./types";
import { ProgressDots } from "./ProgressDots";
import { WelcomeScreen } from "./WelcomeScreen";
import { ClaimTypeScreen } from "./ClaimTypeScreen";
import { NameScreen } from "./NameScreen";
import { CapitalFormsScreen } from "./CapitalFormsScreen";
import { DurationScreen } from "./DurationScreen";
import { ReachScreen } from "./ReachScreen";
import { TangibleOutputsScreen } from "./TangibleOutputsScreen";
import { StoryScreen } from "./StoryScreen";
import { EvidenceScreen } from "./EvidenceScreen";
import { WhatsAliveScreen } from "./WhatsAliveScreen";
import { TierSuggestionScreen } from "./TierSuggestionScreen";
import { RoutingScreen } from "./RoutingScreen";
import { ImprovementScreen } from "./ImprovementScreen";
import { InvitationScreen } from "./InvitationScreen";

const TOTAL_STEPS = 14;

export function ClaimFlowStepper() {
  const { ready, authenticated } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draft, setDraftState] = useState<ClaimDraft>({});
  const [step, setStep] = useState<number>(1);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const claimIdRef = useRef<number | null>(null);

  // Load any existing draft
  useEffect(() => {
    if (!ready || !authenticated) return;
    (async () => {
      try {
        const token = await getAccessToken();
        const existing = await fetchFromMainSite<any>("claims.getClaimDraft", {}, token ?? undefined);
        if (existing) {
          claimIdRef.current = existing.id;
          setDraftState(existing);
          const urlStep = Number(searchParams.get("step"));
          setStep(urlStep && urlStep >= 1 && urlStep <= TOTAL_STEPS ? urlStep : (existing.currentStep ?? 1));
        } else {
          const urlStep = Number(searchParams.get("step"));
          setStep(urlStep && urlStep >= 1 && urlStep <= TOTAL_STEPS ? urlStep : 1);
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
      } finally {
        setLoaded(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  // Sync URL with step
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(step));
    router.replace(`/game/claim?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loaded]);

  const setDraft = useCallback((patch: Partial<ClaimDraft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const saveStep = useCallback(async (targetStep: number, dataOverride?: ClaimDraft) => {
    try {
      const token = await getAccessToken();
      const source = dataOverride ?? draft;
      const result = await fetchFromMainSite<{ id: number }>(
        "claims.saveClaimStep",
        { step: targetStep, data: source },
        token ?? undefined,
      );
      if (result?.id) claimIdRef.current = result.id;
    } catch (err) {
      console.error("Failed to save step:", err);
    }
  }, [draft, getAccessToken]);

  const next = useCallback(async () => {
    await saveStep(step, draft);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [saveStep, step, draft]);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await saveStep(TOTAL_STEPS, draft);
      if (claimIdRef.current) {
        const token = await getAccessToken();
        await fetchFromMainSite("claims.submitClaim", { id: claimIdRef.current }, token ?? undefined);
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Something went wrong saving your claim. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }, [saveStep, draft, getAccessToken]);

  if (!ready || !loaded) {
    return <div className="text-white/55 text-center py-12">Loading...</div>;
  }
  if (!authenticated) {
    return <div className="text-white/55 text-center py-12">Sign in to start your claim.</div>;
  }

  const screenProps = { draft, setDraft, next, back };

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressDots total={TOTAL_STEPS} current={step} />
      {step === 1 && <WelcomeScreen {...screenProps} />}
      {step === 2 && <ClaimTypeScreen {...screenProps} />}
      {step === 3 && <NameScreen {...screenProps} />}
      {step === 4 && <CapitalFormsScreen {...screenProps} />}
      {step === 5 && <DurationScreen {...screenProps} />}
      {step === 6 && <ReachScreen {...screenProps} />}
      {step === 7 && <TangibleOutputsScreen {...screenProps} />}
      {step === 8 && <StoryScreen {...screenProps} />}
      {step === 9 && <EvidenceScreen {...screenProps} />}
      {step === 10 && <WhatsAliveScreen {...screenProps} />}
      {step === 11 && <TierSuggestionScreen {...screenProps} />}
      {step === 12 && <RoutingScreen {...screenProps} />}
      {step === 13 && <ImprovementScreen {...screenProps} />}
      {step === 14 && (
        <InvitationScreen {...screenProps} onSubmit={handleSubmit} submitting={submitting} submitted={submitted} />
      )}
    </div>
  );
}
