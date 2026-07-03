/**
 * UserNotificationPreferences - User-facing toggles for email notification types.
 * Separate from the admin NotificationPreferences (which controls internal team alerts).
 */
import { useState } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface NotificationPrefs {
  communityUpdates: boolean;
  questAnnouncements: boolean;
  governanceUpdates: boolean;
}

const DEFAULTS: NotificationPrefs = {
  communityUpdates: true,
  questAnnouncements: true,
  governanceUpdates: false,
};

function parsePrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return DEFAULTS;
  const obj = raw as Record<string, unknown>;
  return {
    communityUpdates: typeof obj.communityUpdates === "boolean" ? obj.communityUpdates : DEFAULTS.communityUpdates,
    questAnnouncements: typeof obj.questAnnouncements === "boolean" ? obj.questAnnouncements : DEFAULTS.questAnnouncements,
    governanceUpdates: typeof obj.governanceUpdates === "boolean" ? obj.governanceUpdates : DEFAULTS.governanceUpdates,
  };
}

interface Props {
  currentPrefs: unknown;
}

export function UserNotificationPreferences({ currentPrefs }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => parsePrefs(currentPrefs));
  const [saving, setSaving] = useState(false);

  const mutation = trpc.playerProfiles.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
      setSaving(false);
    },
    onError: (err) => {
      toast.error("Failed to save preferences", { description: err.message });
      setSaving(false);
    },
  });

  function toggle(key: keyof NotificationPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    mutation.mutate(updated);
  }

  const TOGGLES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    {
      key: "communityUpdates",
      label: "Community Updates",
      description: "New forum threads, replies to threads you follow, and community highlights",
    },
    {
      key: "questAnnouncements",
      label: "Quest & Event Announcements",
      description: "New quests, seasonal events, and game updates",
    },
    {
      key: "governanceUpdates",
      label: "Governance Updates",
      description: "Email me when a proposal reaches last call or ships. At most one email a day",
    },
  ];

  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm">Notification Preferences</h3>
        {saving && <span className="text-white/60 text-xs">Saving...</span>}
      </div>
      <div className="space-y-3">
        {TOGGLES.map(({ key, label, description }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-white/70 text-xs mt-0.5">{description}</p>
            </div>
            <div
              className={`w-10 h-5 rounded-full flex-shrink-0 relative transition-colors ${
                prefs[key] ? "bg-[#7dd87d]" : "bg-white/20"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  prefs[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Recording email toggle (separate from player profile prefs, stored on newsletter subscriber) */}
      <RecordingEmailToggle />
    </div>
  );
}

function RecordingEmailToggle() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.newsletter.recordingNotifyStatus.useQuery();
  const mutation = trpc.newsletter.toggleRecordingNotify.useMutation({
    onSuccess: (res) => {
      utils.newsletter.recordingNotifyStatus.setData(undefined, { enabled: res.enabled });
      toast.success(res.enabled ? "Recording updates enabled" : "Recording updates disabled");
    },
    onError: (err) => {
      toast.error("Failed to update", { description: err.message });
    },
  });

  const enabled = data?.enabled ?? false;

  if (isLoading) return null;

  return (
    <button
      onClick={() => mutation.mutate({ enabled: !enabled })}
      disabled={mutation.isPending}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left mt-3 pt-3 border-t border-t-white/10"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Session Recording Updates</p>
        <p className="text-white/70 text-xs mt-0.5">Get an email when a new session recording is ready to watch</p>
      </div>
      <div
        className={`w-10 h-5 rounded-full flex-shrink-0 relative transition-colors ${
          enabled ? "bg-[#7dd87d]" : "bg-white/20"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
