import { useEffect, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { Wrench, MapPin, Vote, Users, Coins } from "lucide-react";

export function RoutingScreen({ draft, setDraft, next, back }: ScreenProps) {
  const routes = useMemo(() => {
    const forms = new Set((draft.formsOfCapital ?? []).map((f) => f.form));
    const outputTypes = new Set((draft.tangibleOutputs ?? []).map((o) => o.type));
    return {
      toolsLibrary: outputTypes.has("tool_software") || outputTypes.has("templates_guides") || outputTypes.has("methodology_framework") || outputTypes.has("curriculum_course"),
      localScale: forms.has("material") || forms.has("living"),
      governance: forms.has("social") || forms.has("intellectual"),
      mentoring: (draft.duration === "5_10_years" || draft.duration === "10_plus_years"),
      fundPathway: draft.routeToFundPathway ?? false,
    };
  }, [draft.formsOfCapital, draft.tangibleOutputs, draft.duration, draft.routeToFundPathway]);

  useEffect(() => {
    setDraft({
      routeToToolsLibrary: routes.toolsLibrary,
      routeToLocalScale: routes.localScale,
      routeToGovernance: routes.governance,
      routeToMentoring: routes.mentoring,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes.toolsLibrary, routes.localScale, routes.governance, routes.mentoring]);

  const sections = [
    { show: routes.toolsLibrary, Icon: Wrench, title: "Your work belongs in the Tools Library", body: "The tools, curricula, and frameworks you named will go into the ReGen Civics Tools Library so other players can find them. Your name stays on them." },
    { show: routes.localScale, Icon: MapPin, title: "You can bring this into a local scale game", body: "If you're working with land, tools, or living systems in a specific place, you can join a local bioregional game and do this work alongside other stewards." },
    { show: routes.governance, Icon: Vote, title: "Your voice fits in governance", body: "Social and intellectual work like yours often shows up in our forum conversations and proposal cycles. You'll get an invitation to the governance app." },
    { show: routes.mentoring, Icon: Users, title: "You could mentor others", body: "With the years you've put in, you have something to pass on. We'll add you to the list of potential mentors for newer contributors." },
    { show: routes.fundPathway, Icon: Coins, title: "Fund review pathway", body: "Given the scope of what you shared, we're flagging your claim for the Fund review track. Someone from the team will follow up directly." },
  ];

  const activeCount = sections.filter((s) => s.show).length;

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Here's where your work connects.</h2>
      <p className="text-white/60 text-sm mb-6">Based on what you shared, these are the places in the network where your contribution fits. Nothing is required. Just a sketch of the threads.</p>
      <div className="space-y-3 mb-6">
        {activeCount === 0 && (
          <p className="text-white/55 text-sm italic">We'll connect you with the broader network during your Proposal Party.</p>
        )}
        {sections.filter((s) => s.show).map((s) => {
          const Icon = s.Icon;
          return (
            <div key={s.title} className="rounded-xl p-4 border border-[#7dd87d]/25 bg-[#7dd87d]/5">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-semibold text-sm mb-1">{s.title}</div>
                  <div className="text-white/70 text-sm">{s.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
