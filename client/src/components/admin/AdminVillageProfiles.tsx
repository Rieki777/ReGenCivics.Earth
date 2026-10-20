/**
 * Every Season 2 project's Village profile at a glance, for admins (ADR-77):
 * how many of its launch decisions are ready, how many answers its stewards
 * have kept, how many board suggestions wait for them, and which weeks it
 * answered on. Each row opens the project's own page, read as an admin.
 *
 * Nothing loads on mount: the list reads every project's sources, so it runs
 * when an admin taps the button (`villageProfile.adminList`, 10 a minute).
 */
import { useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export const ADMIN_PROFILES_COPY = {
  title: "Village profiles",
  why: "Each Season 2 project's Village OS 1.0, gathered from its application and every weekly board. Stewards keep what goes into their 1.0 file.",
  load: "See every project's profile",
  none: "No Season 2 project has applied yet.",
  open: "Open",
  ready: "Launch ready",
  kept: "Kept by stewards",
  waiting: "Suggestions waiting",
  weeks: "Weeks answered",
  project: "Project",
} as const;

const BUTTON = "min-h-11 text-white border-[#7dd87d]/50 hover:bg-[#7dd87d]/15 hover:text-white";

export function AdminVillageProfiles() {
  const utils = trpc.useUtils();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof utils.client.villageProfile.adminList.query>>["profiles"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await utils.client.villageProfile.adminList.query();
      setRows(r.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't load. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-[#0a1f14] border-[#7dd87d]/30 mt-4" data-testid="admin-village-profiles">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <MapIcon className="w-4 h-4 text-[#7dd87d]" aria-hidden="true" />
          {ADMIN_PROFILES_COPY.title}
        </CardTitle>
        <CardDescription className="text-white/70">{ADMIN_PROFILES_COPY.why}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Button size="sm" variant="outline" className={BUTTON} disabled={busy} onClick={() => void load()}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <MapIcon className="w-4 h-4" aria-hidden="true" />}
          {ADMIN_PROFILES_COPY.load}
        </Button>
        {error && <p className="text-amber-300" role="alert">{error}</p>}
        {rows && rows.length === 0 && <p className="text-white/70">{ADMIN_PROFILES_COPY.none}</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="text-white/70 border-b border-white/10">
                  <th className="py-1.5 pr-3 font-medium">{ADMIN_PROFILES_COPY.project}</th>
                  <th className="py-1.5 pr-3 font-medium tabular-nums">{ADMIN_PROFILES_COPY.ready}</th>
                  <th className="py-1.5 pr-3 font-medium tabular-nums">{ADMIN_PROFILES_COPY.kept}</th>
                  <th className="py-1.5 pr-3 font-medium tabular-nums">{ADMIN_PROFILES_COPY.waiting}</th>
                  <th className="py-1.5 pr-3 font-medium">{ADMIN_PROFILES_COPY.weeks}</th>
                  <th className="py-1.5 font-medium"><span className="sr-only">{ADMIN_PROFILES_COPY.open}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.applicationId} className="border-b border-white/5 align-middle">
                    <td className="py-1.5 pr-3 text-white">{r.projectName} <span className="text-white/60">({r.status.replace(/_/g, " ")})</span></td>
                    <td className="py-1.5 pr-3 text-white/80 tabular-nums">{r.launch.ready} of {r.launch.total}</td>
                    <td className="py-1.5 pr-3 text-white/80 tabular-nums">{r.yours}</td>
                    <td className="py-1.5 pr-3 text-white/80 tabular-nums">{r.suggested}</td>
                    <td className="py-1.5 pr-3 text-white/80">{r.weeks.length ? r.weeks.join(", ") : "None yet"}</td>
                    <td className="py-1.5">
                      <a href={`/apply/village?a=${r.applicationId}`} aria-label={`${ADMIN_PROFILES_COPY.open} ${r.projectName}`} className="inline-flex min-h-11 items-center text-[#7dd87d] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd87d]">{ADMIN_PROFILES_COPY.open}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
