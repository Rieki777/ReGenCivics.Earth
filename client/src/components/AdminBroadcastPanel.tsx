import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Radio, Clock, Eye, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type Channel = {
  id: string;
  label: string;
  isBuffer: boolean;
};

type PostResult = {
  channel: string;
  success: boolean;
  error?: string;
};

type BufferProfile = {
  id: string;
  service: string;
  service_username: string;
  formatted_username?: string;
};

// ─── Channel definitions ────────────────────────────────────────────────────

const BUFFER_SERVICE_MAP: Record<string, string> = {
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
};

const ALL_CHANNELS: Channel[] = [
  { id: "twitter", label: "X / Twitter", isBuffer: true },
  { id: "linkedin", label: "LinkedIn", isBuffer: true },
  { id: "facebook", label: "Facebook", isBuffer: true },
  { id: "instagram", label: "Instagram", isBuffer: true },
  { id: "bluesky", label: "Bluesky", isBuffer: true },
  { id: "farcaster", label: "Farcaster", isBuffer: false },
];

const LS_CHANNELS_KEY = "broadcast_channels";
const MAX_CHARS = 280;

function loadSavedChannels(): string[] {
  try {
    const raw = localStorage.getItem(LS_CHANNELS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

function saveChannels(channels: string[]) {
  localStorage.setItem(LS_CHANNELS_KEY, JSON.stringify(channels));
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AdminBroadcastPanel() {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(loadSavedChannels);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<PostResult[]>([]);

  // Persist channel selections
  useEffect(() => {
    saveChannels(selectedChannels);
  }, [selectedChannels]);

  // Fetch Buffer profiles to find matching profile IDs
  const {
    data: bufferProfiles,
    isLoading: loadingProfiles,
    error: profilesError,
  } = trpc.admin.broadcast.getBufferProfiles.useQuery(undefined, {
    retry: false,
  });

  const postToBuffer = trpc.admin.broadcast.postToBuffer.useMutation();
  const farcasterIntent = trpc.admin.broadcast.farcasterIntent.useMutation();

  // If Buffer is totally unavailable (503 / precondition failed)
  const bufferNotConfigured =
    profilesError?.message === "Buffer not configured" ||
    (profilesError as any)?.data?.code === "PRECONDITION_FAILED";

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function toggleChannel(id: string) {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedChannels(ALL_CHANNELS.map(c => c.id));
  }

  function clearAll() {
    setSelectedChannels([]);
  }

  function getProfileForChannel(service: string): BufferProfile | undefined {
    if (!bufferProfiles) return undefined;
    return bufferProfiles.find(
      p => p.service.toLowerCase() === service.toLowerCase()
    );
  }

  // ─── Posting logic ──────────────────────────────────────────────────────────

  async function handlePost(scheduleTime?: string) {
    if (!text.trim()) {
      toast.error("Please write something before posting.");
      return;
    }
    if (selectedChannels.length === 0) {
      toast.error("Select at least one channel.");
      return;
    }

    setPosting(true);
    setResults([]);
    const newResults: PostResult[] = [];

    // Separate channels
    const bufferChannels = selectedChannels.filter(id => {
      const ch = ALL_CHANNELS.find(c => c.id === id);
      return ch?.isBuffer;
    });
    const hasFarcaster = selectedChannels.includes("farcaster");

    // Post to Buffer channels
    if (bufferChannels.length > 0) {
      // Map channel IDs to Buffer profile IDs
      const profileIds: string[] = [];
      const missingChannels: string[] = [];

      for (const channelId of bufferChannels) {
        const profile = getProfileForChannel(channelId);
        if (profile) {
          profileIds.push(profile.id);
        } else {
          missingChannels.push(channelId);
        }
      }

      if (missingChannels.length > 0) {
        for (const c of missingChannels) {
          newResults.push({
            channel: BUFFER_SERVICE_MAP[c] ?? c,
            success: false,
            error: "No connected Buffer profile found for this channel.",
          });
        }
      }

      if (profileIds.length > 0) {
        try {
          const res = await postToBuffer.mutateAsync({
            text: text.trim(),
            link: link.trim() || undefined,
            profileIds,
            scheduledAt: scheduleTime || undefined,
          });

          for (const r of res.results) {
            const profile = bufferProfiles?.find(p => p.id === r.profileId);
            const label = profile
              ? (BUFFER_SERVICE_MAP[profile.service.toLowerCase()] ?? profile.service)
              : r.profileId;
            newResults.push({
              channel: label,
              success: r.success,
              error: r.error,
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          for (const id of profileIds) {
            const profile = bufferProfiles?.find(p => p.id === id);
            const label = profile
              ? (BUFFER_SERVICE_MAP[profile.service.toLowerCase()] ?? profile.service)
              : id;
            newResults.push({ channel: label, success: false, error: msg });
          }
        }
      }
    }

    // Post to Farcaster (intent URL, opens in new tab)
    if (hasFarcaster) {
      try {
        const res = await farcasterIntent.mutateAsync({ text: text.trim() });
        window.open(res.url, "_blank", "noopener,noreferrer");
        newResults.push({ channel: "Farcaster", success: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        newResults.push({ channel: "Farcaster", success: false, error: msg });
      }
    }

    setResults(newResults);
    setPosting(false);

    const successes = newResults.filter(r => r.success).length;
    const failures = newResults.filter(r => !r.success).length;
    if (failures === 0) {
      toast.success(`Posted to ${successes} channel${successes !== 1 ? "s" : ""}.`);
    } else if (successes === 0) {
      toast.error("All posts failed. Check the results below.");
    } else {
      toast.warning(`${successes} posted, ${failures} failed.`);
    }
  }

  function handleSchedulePost() {
    if (!scheduledAt) {
      toast.error("Pick a date and time first.");
      return;
    }
    const isoTime = new Date(scheduledAt).toISOString();
    handlePost(isoTime);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (bufferNotConfigured) {
    return (
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <Radio className="w-5 h-5" />
            Broadcast
          </CardTitle>
          <CardDescription>Post to social channels from one place</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Buffer is not configured</p>
              <p className="text-sm text-amber-700 mt-1">
                To enable social posting, add your Buffer access token to the server environment:
              </p>
              <pre className="mt-2 text-xs bg-amber-100 text-amber-900 rounded p-2 font-mono">
                BUFFER_ACCESS_TOKEN=your_token_here
              </pre>
              <p className="text-sm text-amber-700 mt-2">
                Get your token from{" "}
                <a
                  href="https://buffer.com/developers/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  buffer.com/developers/api
                </a>
                . Then restart the server and return here.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                Farcaster posting (via Warpcast intent links) works without any token.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const charsLeft = MAX_CHARS - text.length;
  const overLimit = charsLeft < 0;

  return (
    <>
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle
            className="text-[#1a472a] flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Radio className="w-5 h-5" />
            Broadcast
          </CardTitle>
          <CardDescription>Compose and publish to social channels</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Compose */}
          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">Message</Label>
            <div className="relative">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What do you want to share?"
                rows={4}
                className="resize-none border-[#1a472a]/20 focus:border-[#1a472a] pr-16"
              />
              <span
                className={`absolute bottom-2 right-3 text-xs font-mono ${
                  overLimit
                    ? "text-red-600 font-bold"
                    : charsLeft <= 40
                    ? "text-amber-600"
                    : "text-[#1a472a]/50"
                }`}
              >
                {charsLeft}
              </span>
            </div>
          </div>

          {/* Optional link */}
          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">Link (optional)</Label>
            <Input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://..."
              className="border-[#1a472a]/20 focus:border-[#1a472a]"
            />
          </div>

          {/* Optional image URL */}
          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">Image URL (optional)</Label>
            <Input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="border-[#1a472a]/20 focus:border-[#1a472a]"
            />
          </div>

          {/* Channel selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#1a472a] font-medium">Channels</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[#1a472a] underline hover:no-underline"
                >
                  Select all
                </button>
                <span className="text-[#1a472a]/30">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-[#1a472a] underline hover:no-underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {loadingProfiles ? (
              <div className="flex items-center gap-2 text-sm text-[#1a472a]/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading connected channels...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_CHANNELS.map(channel => {
                  const isChecked = selectedChannels.includes(channel.id);
                  const bufferProfile = channel.isBuffer
                    ? getProfileForChannel(channel.id)
                    : undefined;
                  const notConnected = channel.isBuffer && !bufferProfile;

                  return (
                    <label
                      key={channel.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "border-[#1a472a] bg-[#1a472a]/5"
                          : "border-[#1a472a]/15 hover:border-[#1a472a]/40"
                      } ${notConnected ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        className="border-[#1a472a]/40"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1a472a] leading-tight">
                          {channel.label}
                        </p>
                        {channel.isBuffer && bufferProfile && (
                          <p className="text-xs text-[#1a472a]/60 truncate">
                            {bufferProfile.formatted_username ?? bufferProfile.service_username}
                          </p>
                        )}
                        {notConnected && (
                          <p className="text-xs text-amber-600">Not connected</p>
                        )}
                        {!channel.isBuffer && (
                          <p className="text-xs text-[#1a472a]/60">Opens Warpcast</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => handlePost()}
              disabled={posting || overLimit || !text.trim() || selectedChannels.length === 0}
              className="bg-[#1a472a] text-white hover:bg-[#1a472a]/90"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post Now
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowScheduler(s => !s)}
              className="border-[#1a472a]/30 text-[#1a472a]"
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!text.trim()}
              className="border-[#1a472a]/30 text-[#1a472a]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

          {/* Schedule input */}
          {showScheduler && (
            <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-[#1a472a]/5 border border-[#1a472a]/15">
              <div className="space-y-1">
                <Label className="text-[#1a472a] text-sm font-medium">Schedule for</Label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="block border border-[#1a472a]/20 rounded-md px-3 py-1.5 text-sm text-[#1a472a] bg-white focus:outline-none focus:border-[#1a472a]"
                />
              </div>
              <Button
                onClick={handleSchedulePost}
                disabled={posting || !scheduledAt || overLimit || !text.trim() || selectedChannels.length === 0}
                className="bg-[#1a472a] text-white hover:bg-[#1a472a]/90"
              >
                {posting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                Schedule Post
              </Button>
            </div>
          )}

          {/* Per-channel results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#1a472a] font-medium">Results</Label>
              <div className="space-y-1.5">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      r.success
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}
                  >
                    {r.success ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                    )}
                    <div>
                      <span className="font-medium">{r.channel}</span>
                      {r.success ? (
                        <span className="ml-2 text-green-700">Posted successfully</span>
                      ) : (
                        <span className="ml-2 text-red-700">{r.error ?? "Failed"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]">Post Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#f5f9f5] border border-[#1a472a]/15 whitespace-pre-wrap text-sm text-[#1a472a] leading-relaxed">
              {text || <span className="text-[#1a472a]/40 italic">Nothing to preview yet</span>}
            </div>
            {link && (
              <div>
                <Label className="text-[#1a472a]/70 text-xs">Link</Label>
                <p className="text-sm text-[#1a472a] break-all mt-0.5">{link}</p>
              </div>
            )}
            {imageUrl && (
              <div>
                <Label className="text-[#1a472a]/70 text-xs">Image</Label>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-1 rounded-lg max-h-48 object-cover w-full"
                  width={800}
                  height={192}
                  onError={e => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
            <div>
              <Label className="text-[#1a472a]/70 text-xs">Channels</Label>
              <p className="text-sm text-[#1a472a] mt-0.5">
                {selectedChannels.length > 0
                  ? selectedChannels
                      .map(id => ALL_CHANNELS.find(c => c.id === id)?.label ?? id)
                      .join(", ")
                  : "None selected"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#1a472a]/50">
              <span>{text.length} / {MAX_CHARS} characters</span>
              {overLimit && <span className="text-red-600 font-semibold">(over limit)</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
