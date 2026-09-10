/**
 * Auto-scheduled event reminders on the Admin Events tab.
 * Extends the existing manual reminder / rollup / follow-up tools.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  AUTO_REMINDER_OFFSETS,
  AUTO_REMINDER_SWEEP_MINUTES,
  CUSTOM_APPLICATION_STATUSES,
  NEWSLETTER_AUDIENCE_SOURCES,
  audienceModeHelp,
  audienceModeLabel,
  canEnableAutoReminders,
  defaultAudienceMode,
  defaultOffsetsForEvent,
  type AutoReminderAudienceMode,
  type CustomApplicationStatus,
  type CustomAudienceConfig,
  type NewsletterAudienceSource,
} from "@shared/eventAutoReminders";

type SavedAutoReminder = {
  eventId: number;
  enabled: boolean;
  audienceMode: AutoReminderAudienceMode;
  audienceConfig: CustomAudienceConfig;
  offsetsMinutes: number[];
  sends: Array<{ offsetMinutes: number; recipientCount: number }>;
};

type EventRow = {
  id: number;
  title: string;
  type: string;
  season?: string | null;
  status: string;
};

const STATUS_LABELS: Record<CustomApplicationStatus, string> = {
  submitted: "Submitted applications",
  under_review: "Under review",
  approved: "Approved projects",
  active: "Active projects",
  rejected: "Rejected applications",
  changes_requested: "Changes requested",
};

const SOURCE_LABELS: Record<NewsletterAudienceSource, string> = {
  homepage: "Homepage",
  investor_form: "Investor form",
  connect_form: "Connect form",
  apply_form: "Apply form",
  footer: "Footer",
  exit_intent: "Exit intent",
  other: "Other",
};

function emptyConfig(): CustomAudienceConfig {
  return {
    newsletterSources: [],
    includeInvestors: false,
    includeLoi: false,
    includeEventSignups: false,
    applicationStatuses: [],
  };
}

export function AdminEventAutoReminders({
  event,
  saved,
}: {
  event: EventRow;
  saved?: SavedAutoReminder | null;
}) {
  const forceCustom = event.type === "special" && event.season !== "Season 2";
  const defaultMode = defaultAudienceMode(event);
  const utils = trpc.useUtils();
  const saveMutation = trpc.events.setAutoReminder.useMutation({
    onSuccess: () => {
      utils.events.listAutoReminders.invalidate();
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<AutoReminderAudienceMode>(defaultMode);
  const [offsets, setOffsets] = useState<Set<number>>(new Set(defaultOffsetsForEvent(event)));
  const [config, setConfig] = useState<CustomAudienceConfig>(emptyConfig());
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const nextMode = forceCustom ? "custom" : (saved?.audienceMode ?? defaultMode);
    setEnabled(saved?.enabled ?? false);
    setMode(nextMode);
    setOffsets(new Set(saved?.offsetsMinutes?.length ? saved.offsetsMinutes : defaultOffsetsForEvent(event)));
    setConfig({ ...emptyConfig(), ...(saved?.audienceConfig ?? {}) });
  }, [event.id, saved, forceCustom, defaultMode]);

  const audienceConfig = useMemo(() => ({
    newsletterSources: config.newsletterSources ?? [],
    includeInvestors: !!config.includeInvestors,
    includeLoi: !!config.includeLoi,
    includeEventSignups: !!config.includeEventSignups,
    applicationStatuses: config.applicationStatuses ?? [],
  }), [config]);

  const previewQuery = trpc.events.previewAutoReminderAudience.useQuery(
    {
      eventId: event.id,
      audienceMode: mode,
      audienceConfig,
    },
    { enabled: true, staleTime: 15_000 },
  );

  const canEnable = canEnableAutoReminders(mode, audienceConfig);
  const sentSet = new Set((saved?.sends ?? []).map((s) => s.offsetMinutes));
  const upcoming = event.status === "upcoming";

  function toggleOffset(minutes: number) {
    setOffsets((prev) => {
      const next = new Set(prev);
      if (next.has(minutes)) next.delete(minutes);
      else next.add(minutes);
      return next;
    });
  }

  function toggleSource(source: NewsletterAudienceSource) {
    setConfig((prev) => {
      const current = prev.newsletterSources ?? [];
      const next = current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source];
      return { ...prev, newsletterSources: next };
    });
  }

  function toggleStatus(status: CustomApplicationStatus) {
    setConfig((prev) => {
      const current = prev.applicationStatuses ?? [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, applicationStatuses: next };
    });
  }

  async function handleSave() {
    const offsetsMinutes = AUTO_REMINDER_OFFSETS
      .map((o) => o.minutes)
      .filter((m) => offsets.has(m));
    await saveMutation.mutateAsync({
      eventId: event.id,
      enabled: enabled && canEnable,
      audienceMode: mode,
      audienceConfig,
      offsetsMinutes,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 4000);
  }

  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Auto-reminders</p>
          {!upcoming && (
            <p className="text-xs text-yellow-300">This event is not upcoming. New sends will not fire until the start time is in the future.</p>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id={`auto-remind-on-${event.id}`}
              checked={enabled}
              onCheckedChange={(val) => setEnabled(!!val)}
              className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
            />
            <Label htmlFor={`auto-remind-on-${event.id}`} className="text-sm text-white/80 cursor-pointer">
              Send reminders automatically before this event
            </Label>
          </div>

          <div>
            <p className="text-white/60 text-xs mb-1.5">When</p>
            <div className="flex flex-wrap gap-3">
              {AUTO_REMINDER_OFFSETS.map((offset) => (
                <label key={offset.minutes} className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                  <Checkbox
                    checked={offsets.has(offset.minutes)}
                    onCheckedChange={() => toggleOffset(offset.minutes)}
                    className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                  />
                  {offset.label}
                  {sentSet.has(offset.minutes) && (
                    <span className="text-[#7dd87d]">sent</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs mb-1.5">Audience</p>
            {forceCustom ? (
              <p className="text-xs text-white/80 mb-2">
                Custom event. Pick who should get these emails. There is no default list.
              </p>
            ) : (
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as AutoReminderAudienceMode)}
              >
                <SelectTrigger className="bg-white/10 border-white/25 text-white mt-0 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="season2_approved">{audienceModeLabel("season2_approved")}</SelectItem>
                  <SelectItem value="open_access">{audienceModeLabel("open_access")}</SelectItem>
                  <SelectItem value="custom">{audienceModeLabel("custom")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-white/50 mt-1">{audienceModeHelp(mode)}</p>
          </div>

          {mode === "custom" && (
            <div className="space-y-2 rounded-lg border border-white/10 p-3">
              <p className="text-xs text-white/70">Custom lists</p>
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                <Checkbox
                  checked={!!config.includeEventSignups}
                  onCheckedChange={(val) => setConfig((p) => ({ ...p, includeEventSignups: !!val }))}
                  className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                />
                People who signed up for this event
              </label>
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                <Checkbox
                  checked={!!config.includeInvestors}
                  onCheckedChange={(val) => setConfig((p) => ({ ...p, includeInvestors: !!val }))}
                  className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                />
                Investor inquiries
              </label>
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                <Checkbox
                  checked={!!config.includeLoi}
                  onCheckedChange={(val) => setConfig((p) => ({ ...p, includeLoi: !!val }))}
                  className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                />
                Letters of intent
              </label>
              <div>
                <p className="text-xs text-white/50 mb-1">Newsletter sources</p>
                <div className="flex flex-wrap gap-2">
                  {NEWSLETTER_AUDIENCE_SOURCES.map((source) => (
                    <label key={source} className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                      <Checkbox
                        checked={(config.newsletterSources ?? []).includes(source)}
                        onCheckedChange={() => toggleSource(source)}
                        className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                      />
                      {SOURCE_LABELS[source]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Application statuses</p>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_APPLICATION_STATUSES.map((status) => (
                    <label key={status} className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
                      <Checkbox
                        checked={(config.applicationStatuses ?? []).includes(status)}
                        onCheckedChange={() => toggleStatus(status)}
                        className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                      />
                      {STATUS_LABELS[status]}
                    </label>
                  ))}
                </div>
              </div>
              {!canEnable && (
                <p className="text-xs text-yellow-300">Pick at least one list before turning auto-reminders on.</p>
              )}
            </div>
          )}

          <p className="text-xs text-white/70">
            {previewQuery.isLoading
              ? "Counting recipients..."
              : previewQuery.data?.blocked
                ? "Recipient count: 0 (choose an audience first)"
                : `This will send to ${previewQuery.data?.count ?? 0} ${(previewQuery.data?.count ?? 0) === 1 ? "person" : "people"}.`}
          </p>

          <div className="flex items-center gap-2">
            <Button
              disabled={saveMutation.isPending || offsets.size === 0 || (enabled && !canEnable)}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-4"
            >
              {saveMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
              Save auto-reminders
            </Button>
            {savedFlash && (
              <span className="text-xs text-[#7dd87d] flex items-center gap-1">
                <CheckCheck size={12} /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">
            The hourly event-reminders cron and a {AUTO_REMINDER_SWEEP_MINUTES}-minute in-process sweep send these. Each offset sends once. If a sweep lands after an offset is due, catch-up still sends it until the session starts.
          </p>
        </div>
  );
}
