import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { consumeBroadcastFill, clearBroadcastFill } from "@/lib/broadcastFill";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Radio, Clock, Eye, CheckCircle2, XCircle, Loader2, AlertTriangle, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DictationButton } from "@/components/admin/dictation";
import {
  BROADCAST_CHANNELS,
  BROADCAST_FILL_EVENT,
  broadcastBodiesReady,
  broadcastChannelById,
  buildBufferPostTargets,
  clipToBroadcastLimit,
  fillChannelBodiesFromMaster,
  profilesForChannel,
  resolveChannelBody,
  strictestBroadcastLimit,
  type BroadcastChannelId,
} from "@shared/broadcastChannels";

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

type DraftVariant = {
  channel: BroadcastChannelId;
  label: string;
  text: string;
  charCount: number;
  maxChars: number;
};

const BUFFER_SERVICE_MAP: Record<string, string> = {
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  bluesky: "Bluesky",
};

const ALL_CHANNELS = BROADCAST_CHANNELS.map((c) => ({
  id: c.id,
  label: c.label,
  isBuffer: c.id !== "farcaster",
}));

const LS_CHANNELS_KEY = "broadcast_channels";
const LS_PROFILE_IDS_KEY = "broadcast_profile_ids";
const BUFFER_CHANNELS_URL = "https://publish.buffer.com/channels";
const BUFFER_SETTINGS_HREF = "/admin?tab=settings";

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

function loadSavedProfileIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_PROFILE_IDS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

function saveProfileIds(ids: string[]) {
  localStorage.setItem(LS_PROFILE_IDS_KEY, JSON.stringify(ids));
}

function profileLabel(p: BufferProfile): string {
  return p.formatted_username ?? p.service_username ?? p.id;
}

export function AdminBroadcastPanel() {
  const [text, setText] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const channelMessageRef = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(loadSavedChannels);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(loadSavedProfileIds);
  const [channelBodies, setChannelBodies] = useState<Record<string, string>>({});
  const [activeChannelTab, setActiveChannelTab] = useState<string>("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<PostResult[]>([]);
  const [drafts, setDrafts] = useState<DraftVariant[]>([]);
  const [draftSources, setDraftSources] = useState<Array<{ id: number; title: string }>>([]);
  const [draftVoice, setDraftVoice] = useState<{ version: string; revision: number } | null>(null);
  const [draftGrounded, setDraftGrounded] = useState(false);

  const showPerChannelEditors = selectedChannels.length > 1;

  useEffect(() => {
    saveChannels(selectedChannels);
  }, [selectedChannels]);

  useEffect(() => {
    saveProfileIds(selectedProfileIds);
  }, [selectedProfileIds]);

  useEffect(() => {
    if (selectedChannels.length === 0) {
      setActiveChannelTab("");
      return;
    }
    if (!selectedChannels.includes(activeChannelTab)) {
      setActiveChannelTab(selectedChannels[0]);
    }
  }, [selectedChannels, activeChannelTab]);

  useEffect(() => {
    const applyBroadcastFill = (raw: string) => {
      const fullText = raw.trim();
      if (!fullText) return;

      // Once the per-channel surface exists, keep the article intact in the
      // master draft and adapt each selected body independently. The master is
      // the source of truth; no article text is silently lost at handoff.
      const hasPerChannelState =
        selectedChannels.length > 1 || Object.keys(channelBodies).length > 0;
      if (hasPerChannelState) {
        setText(fullText);
        setChannelBodies((prev) => ({
          ...prev,
          ...fillChannelBodiesFromMaster(fullText, selectedChannels, "adapt"),
        }));
        toast.message("Adapted social variants to each network's limit.");
        return;
      }

      // Legacy/single-message path: retain Fix 2's safe cap and visible notice.
      const limit = strictestBroadcastLimit(selectedChannels);
      const clipped = clipToBroadcastLimit(fullText, limit);
      setText(clipped);
      if (clipped.length < fullText.length) {
        toast.message(
          `Shortened for social (${fullText.length} → ${clipped.length} chars, max ${limit}).`,
        );
      }
    };

    const pending = consumeBroadcastFill();
    if (pending) applyBroadcastFill(pending);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      if (!detail?.text) return;
      clearBroadcastFill();
      applyBroadcastFill(detail.text);
    };
    window.addEventListener(BROADCAST_FILL_EVENT, handler);
    return () => window.removeEventListener(BROADCAST_FILL_EVENT, handler);
  }, [selectedChannels, channelBodies]);

  const {
    data: bufferProfiles,
    isLoading: loadingProfiles,
    error: profilesError,
    refetch: refetchProfiles,
    isFetching: refetchingProfiles,
  } = trpc.admin.broadcast.getBufferProfiles.useQuery(undefined, {
    retry: false,
  });

  const postToBuffer = trpc.admin.broadcast.postToBuffer.useMutation();
  const farcasterIntent = trpc.admin.broadcast.farcasterIntent.useMutation();
  const draftFromHarvest = trpc.harvest.draftBroadcast.useMutation();

  const bufferNotConfigured =
    profilesError?.message === "Buffer not configured" ||
    (profilesError as { data?: { code?: string } } | null)?.data?.code === "PRECONDITION_FAILED";

  const canPost = useMemo(
    () => broadcastBodiesReady(selectedChannels, text, channelBodies),
    [selectedChannels, text, channelBodies],
  );

  function profilesForService(service: string): BufferProfile[] {
    if (!bufferProfiles) return [];
    return profilesForChannel(bufferProfiles, service) as BufferProfile[];
  }

  function toggleChannel(id: string) {
    setSelectedChannels(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      return next;
    });
    const matches = profilesForService(id);
    if (matches.length === 0) return;
    setSelectedProfileIds(prev => {
      const matchIds = new Set(matches.map(p => p.id));
      const wasOn = selectedChannels.includes(id);
      if (wasOn) {
        return prev.filter(pid => !matchIds.has(pid));
      }
      const merged = new Set(prev);
      for (const p of matches) merged.add(p.id);
      return Array.from(merged);
    });
  }

  function toggleProfile(channelId: string, profileId: string) {
    setSelectedProfileIds(prev => {
      const on = prev.includes(profileId);
      const next = on ? prev.filter(id => id !== profileId) : [...prev, profileId];
      const matchIds = new Set(profilesForService(channelId).map(p => p.id));
      const anySelected = next.some(id => matchIds.has(id));
      setSelectedChannels(chs => {
        if (anySelected && !chs.includes(channelId)) return [...chs, channelId];
        if (!anySelected && chs.includes(channelId)) return chs.filter(c => c !== channelId);
        return chs;
      });
      return next;
    });
  }

  function selectAll() {
    setSelectedChannels(ALL_CHANNELS.map(c => c.id));
    if (bufferProfiles) {
      setSelectedProfileIds(bufferProfiles.map(p => p.id));
    }
  }

  function clearAll() {
    setSelectedChannels([]);
    setSelectedProfileIds([]);
  }

  function getProfileForChannel(service: string): BufferProfile | undefined {
    const matches = profilesForService(service);
    if (matches.length === 0) return undefined;
    const selected = matches.find(p => selectedProfileIds.includes(p.id));
    return selected ?? matches[0];
  }

  function setChannelBody(channelId: string, value: string) {
    setChannelBodies(prev => ({ ...prev, [channelId]: value }));
  }

  function applyDraft(variant: DraftVariant) {
    setChannelBodies(prev => ({ ...prev, [variant.channel]: variant.text }));
    setText(prev => (prev.trim() ? prev : variant.text));
    if (selectedChannels.includes(variant.channel)) {
      setActiveChannelTab(variant.channel);
    }
    toast.success(`Loaded the ${variant.label} draft into that channel.`);
  }

  function copyMasterToChannels() {
    if (!text.trim()) {
      toast.error("Write a master draft first.");
      return;
    }
    setChannelBodies(prev => ({
      ...prev,
      ...fillChannelBodiesFromMaster(text, selectedChannels, "copy"),
    }));
    toast.success("Copied master into each selected channel.");
  }

  function adaptMasterToChannels() {
    if (!text.trim()) {
      toast.error("Write a master draft first.");
      return;
    }
    setChannelBodies(prev => ({
      ...prev,
      ...fillChannelBodiesFromMaster(text, selectedChannels, "adapt"),
    }));
    toast.success("Adapted master into each channel (length-aware).");
  }

  async function handleLlmAdaptMasterToChannels() {
    if (!text.trim()) {
      toast.error("Write a master draft first.");
      return;
    }
    const channels = selectedChannels as BroadcastChannelId[];
    try {
      const res = await draftFromHarvest.mutateAsync({
        intent: text.trim(),
        channels,
        link: link.trim().startsWith("http") ? link.trim() : undefined,
        mode: "adaptMaster",
      });
      setDrafts(res.drafts);
      setDraftSources(res.sources);
      setDraftVoice(res.voice);
      setDraftGrounded(res.grounded);
      if (res.drafts.length > 0) {
        setChannelBodies(prev => {
          const next = { ...prev };
          for (const d of res.drafts) next[d.channel] = d.text;
          return next;
        });
        if (selectedChannels.includes(res.drafts[0].channel)) {
          setActiveChannelTab(res.drafts[0].channel);
        }
      }
      if (res.errors.length > 0) {
        toast.warning(`Adapted ${res.drafts.length}, ${res.errors.length} channel${res.errors.length === 1 ? "" : "s"} failed.`);
      } else {
        toast.success("LLM adapted master into each channel.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Owner access required/i.test(msg)) {
        toast.error("Harvest drafts are owner-only. Open The Harvest as the owner.");
        return;
      }
      toast.error(msg || "Could not LLM-adapt master to channels.");
    }
  }

  async function handleDraftFromHarvest() {
    const channels = (selectedChannels.length > 0 ? selectedChannels : ["twitter"]) as BroadcastChannelId[];
    try {
      const res = await draftFromHarvest.mutateAsync({
        intent: text.trim() || undefined,
        channels,
        link: link.trim().startsWith("http") ? link.trim() : undefined,
      });
      setDrafts(res.drafts);
      setDraftSources(res.sources);
      setDraftVoice(res.voice);
      setDraftGrounded(res.grounded);
      if (res.drafts.length > 0) {
        setChannelBodies(prev => {
          const next = { ...prev };
          for (const d of res.drafts) next[d.channel] = d.text;
          return next;
        });
        if (res.drafts.length === 1) {
          setText(res.drafts[0].text);
        } else if (!text.trim()) {
          setText(res.drafts[0].text);
        }
        if (selectedChannels.includes(res.drafts[0].channel)) {
          setActiveChannelTab(res.drafts[0].channel);
        }
      }
      if (res.errors.length > 0) {
        toast.warning(`Drafted ${res.drafts.length}, ${res.errors.length} channel${res.errors.length === 1 ? "" : "s"} failed.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Owner access required/i.test(msg)) {
        toast.error("Harvest drafts are owner-only. Open The Harvest as the owner.");
        return;
      }
      toast.error(msg || "Could not draft from The Harvest.");
    }
  }

  async function handlePost(scheduleTime?: string) {
    if (selectedChannels.length === 0) {
      toast.error("Select at least one channel.");
      return;
    }
    if (!canPost) {
      toast.error("Each selected channel needs a body within its character limit.");
      return;
    }

    setPosting(true);
    setResults([]);
    const newResults: PostResult[] = [];

    const bufferChannels = selectedChannels.filter(id => {
      const ch = ALL_CHANNELS.find(c => c.id === id);
      return ch?.isBuffer;
    });
    const hasFarcaster = selectedChannels.includes("farcaster");

    if (bufferChannels.length > 0) {
      const { targets, missingChannels } = buildBufferPostTargets({
        selectedChannelIds: selectedChannels,
        masterText: text,
        channelBodies,
        profiles: bufferProfiles ?? [],
        selectedProfileIds,
        isBufferChannel: (id) => ALL_CHANNELS.find(c => c.id === id)?.isBuffer === true,
      });

      for (const c of missingChannels) {
        newResults.push({
          channel: BUFFER_SERVICE_MAP[c] ?? c,
          success: false,
          error: "No connected Buffer profile found for this channel.",
        });
      }

      const posts = targets
        .filter((t) => t.text.length > 0)
        .map((t) => ({ profileId: t.profileId, text: t.text }));

      if (posts.length > 0) {
        try {
          const res = await postToBuffer.mutateAsync({
            posts,
            link: link.trim() || undefined,
            imageUrl: imageUrl.trim().startsWith("http") ? imageUrl.trim() : undefined,
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
          for (const p of posts) {
            const profile = bufferProfiles?.find(pr => pr.id === p.profileId);
            const label = profile
              ? (BUFFER_SERVICE_MAP[profile.service.toLowerCase()] ?? profile.service)
              : p.profileId;
            newResults.push({ channel: label, success: false, error: msg });
          }
        }
      }
    }

    if (hasFarcaster) {
      const farcasterText = resolveChannelBody(text, channelBodies, "farcaster").trim();
      try {
        const res = await farcasterIntent.mutateAsync({ text: farcasterText });
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

  const masterMaxHint = selectedChannels.length === 1
    ? (broadcastChannelById(selectedChannels[0])?.maxChars ?? 280)
    : null;
  const masterCharsLeft = masterMaxHint != null ? masterMaxHint - text.length : null;
  const masterOverLimit = masterCharsLeft != null && masterCharsLeft < 0;

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
          <CardDescription>
            Compose and publish to social channels
            {showPerChannelEditors ? " — each selected channel gets its own body" : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {bufferNotConfigured && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Buffer is not configured</p>
                <p className="text-sm text-amber-700 mt-1">
                  Paste a Buffer access token in Broadcast settings, then connect each network in Buffer.
                  You can still draft here and post to Farcaster via Warpcast.
                </p>
                <a
                  href={BUFFER_SETTINGS_HREF}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-900 underline"
                >
                  Open Broadcast settings
                </a>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">
              {showPerChannelEditors ? "Master draft" : "Message"}
            </Label>
            <div className="relative">
              <Textarea
                data-testid="broadcast-message"
                ref={messageRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={
                  showPerChannelEditors
                    ? "Write once, then copy or adapt into each channel below."
                    : "What do you want to share?"
                }
                rows={4}
                className="resize-none border-[#1a472a]/20 focus:border-[#1a472a] pr-16"
              />
              {masterCharsLeft != null && (
                <span
                  className={`absolute bottom-2 right-3 text-xs font-mono ${
                    masterOverLimit
                      ? "text-red-600 font-bold"
                      : masterCharsLeft <= 40
                      ? "text-amber-600"
                      : "text-[#1a472a]/80"
                  }`}
                >
                  {masterCharsLeft}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DictationButton
                value={text}
                onChange={setText}
                targetRef={messageRef}
                label="Dictate message"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDraftFromHarvest()}
                disabled={draftFromHarvest.isPending}
                data-testid="draft-with-harvest"
                className="border-[#1a472a]/30 text-[#1a472a]"
              >
                {draftFromHarvest.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Draft with Harvest
              </Button>
              <p className="text-xs text-[#1a472a]/80">
                Uses ripe Harvest ideas and the Worldview Pack voice. You still post.
                Empty box drafts from the ripest ideas.
              </p>
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[#1a472a]/15 bg-[#1a472a]/5 p-3" data-testid="harvest-drafts">
              <p className="text-xs font-medium text-[#1a472a]">
                {draftGrounded
                  ? `Grounded in ${draftSources.length} Harvest idea${draftSources.length === 1 ? "" : "s"}`
                  : "No matching Harvest ideas; drafted from your words and the voice pack"}
                {draftVoice ? ` · Worldview Pack r${draftVoice.revision}` : ""}
              </p>
              {draftSources.length > 0 && (
                <p className="text-xs text-[#1a472a]/80">
                  {draftSources.map((s) => s.title).join(" · ")}
                </p>
              )}
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div key={d.channel} className="rounded-lg border border-[#1a472a]/15 bg-white p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#1a472a]">{d.label}</p>
                      <span className="text-xs font-mono text-[#1a472a]/80">{d.charCount}/{d.maxChars}</span>
                    </div>
                    <p className="text-sm text-[#1a472a] whitespace-pre-wrap">{d.text}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#1a472a]/30 text-[#1a472a]"
                      onClick={() => applyDraft(d)}
                    >
                      Use this
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">Link (optional)</Label>
            <Input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://..."
              className="border-[#1a472a]/20 focus:border-[#1a472a]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#1a472a] font-medium">Image URL (optional)</Label>
            <Input
              data-testid="broadcast-image-url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://cdn.example.com/photo.jpg"
              className="border-[#1a472a]/20 focus:border-[#1a472a]"
            />
            <p className="text-xs text-[#1a472a]/70">
              Public direct image URL. Buffer fetches it when the post publishes — avoid expiring/signed links.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#1a472a] font-medium">Channels</Label>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => void refetchProfiles()}
                  className="text-xs text-[#1a472a] underline hover:no-underline inline-flex items-center gap-1"
                  disabled={refetchingProfiles || bufferNotConfigured}
                >
                  <RefreshCw className={`w-3 h-3 ${refetchingProfiles ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <span className="text-[#1a472a]/75">|</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[#1a472a] underline hover:no-underline"
                >
                  Select all
                </button>
                <span className="text-[#1a472a]/75">|</span>
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
              <div className="flex items-center gap-2 text-sm text-[#1a472a]/80">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading connected channels...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_CHANNELS.map(channel => {
                  const isChecked = selectedChannels.includes(channel.id);
                  const channelProfiles = channel.isBuffer
                    ? profilesForService(channel.id)
                    : [];
                  const bufferProfile = channel.isBuffer
                    ? getProfileForChannel(channel.id)
                    : undefined;
                  const notConnected = channel.isBuffer && channelProfiles.length === 0;
                  const multiProfiles = channelProfiles.length > 1;
                  const connectHref = bufferNotConfigured ? BUFFER_SETTINGS_HREF : BUFFER_CHANNELS_URL;

                  return (
                    <div
                      key={channel.id}
                      className={`flex flex-col gap-1.5 p-2.5 rounded-lg border transition-colors ${
                        isChecked
                          ? "border-[#1a472a] bg-[#1a472a]/5"
                          : "border-[#1a472a]/15"
                      } ${notConnected ? "opacity-80" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleChannel(channel.id)}
                            className="border-[#1a472a]/40"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1a472a] leading-tight">
                              {channel.label}
                            </p>
                            {channel.isBuffer && !multiProfiles && bufferProfile && (
                              <p className="text-xs text-[#1a472a]/80 truncate">
                                {profileLabel(bufferProfile)}
                              </p>
                            )}
                            {channel.isBuffer && multiProfiles && (
                              <p className="text-xs text-[#1a472a]/80">
                                {channelProfiles.filter(p => selectedProfileIds.includes(p.id)).length}
                                /{channelProfiles.length} profiles
                              </p>
                            )}
                            {notConnected && (
                              <p className="text-xs text-amber-600">Not connected</p>
                            )}
                            {!channel.isBuffer && (
                              <p className="text-xs text-[#1a472a]/80">Opens Warpcast</p>
                            )}
                          </div>
                        </label>
                        {notConnected && (
                          <a
                            href={connectHref}
                            target={bufferNotConfigured ? undefined : "_blank"}
                            rel={bufferNotConfigured ? undefined : "noopener noreferrer"}
                            data-testid={`connect-${channel.id}`}
                            className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-white bg-[#1a472a] hover:bg-[#2d5a3d] rounded-md px-2 min-h-8"
                          >
                            Connect
                            {!bufferNotConfigured && <ExternalLink className="w-3 h-3" />}
                          </a>
                        )}
                      </div>
                      {multiProfiles && (
                        <div
                          className="ml-6 space-y-1"
                          data-testid={`profile-picker-${channel.id}`}
                        >
                          {channelProfiles.map(p => (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 cursor-pointer text-xs text-[#1a472a]"
                            >
                              <Checkbox
                                checked={selectedProfileIds.includes(p.id)}
                                onCheckedChange={() => toggleProfile(channel.id, p.id)}
                                className="border-[#1a472a]/40 h-3.5 w-3.5"
                                data-testid={`profile-check-${p.id}`}
                              />
                              <span className="truncate">{profileLabel(p)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!bufferNotConfigured && (
              <p className="text-xs text-[#1a472a]/80">
                Social accounts connect in Buffer. Use Connect, link the network, then Refresh.
              </p>
            )}
          </div>

          {showPerChannelEditors && (
            <div className="space-y-3 rounded-xl border border-[#1a472a]/15 bg-[#1a472a]/5 p-3" data-testid="per-channel-editors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-[#1a472a] font-medium">Per-channel bodies</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-[#1a472a]/30 text-[#1a472a]"
                    data-testid="copy-master-to-channels"
                    onClick={copyMasterToChannels}
                  >
                    Copy master → all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-[#1a472a]/30 text-[#1a472a]"
                    data-testid="adapt-master-to-channels"
                    onClick={adaptMasterToChannels}
                  >
                    Adapt master → each
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-[#1a472a]/30 text-[#1a472a]"
                    data-testid="llm-adapt-master-to-channels"
                    onClick={() => void handleLlmAdaptMasterToChannels()}
                    disabled={draftFromHarvest.isPending}
                  >
                    {draftFromHarvest.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    LLM adapt master → each
                  </Button>
                </div>
              </div>
              <p className="text-xs text-[#1a472a]/80">
                Empty channel boxes fall back to the master draft when posting. Adapt clips to each network&apos;s length.
                LLM adapt rewrites channel-native via Harvest draft (same path as Draft with Harvest), without inventing facts beyond the master.
              </p>
              <Tabs
                value={activeChannelTab || selectedChannels[0]}
                onValueChange={setActiveChannelTab}
              >
                <TabsList className="flex flex-wrap h-auto gap-1 bg-white/80">
                  {selectedChannels.map((id) => {
                    const meta = broadcastChannelById(id);
                    const body = resolveChannelBody(text, channelBodies, id);
                    const max = meta?.maxChars ?? 280;
                    const over = body.length > max;
                    const customized = (channelBodies[id] ?? "").trim().length > 0;
                    return (
                      <TabsTrigger
                        key={id}
                        value={id}
                        data-testid={`channel-tab-${id}`}
                        className="text-xs data-[state=active]:bg-[#1a472a] data-[state=active]:text-white"
                      >
                        {meta?.label ?? id}
                        <span className={`ml-1 font-mono ${over ? "text-red-500" : "opacity-70"}`}>
                          {customized ? "·" : "◦"}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {selectedChannels.map((id) => {
                  const meta = broadcastChannelById(id);
                  const max = meta?.maxChars ?? 280;
                  const value = channelBodies[id] ?? "";
                  const left = max - value.length;
                  const over = left < 0;
                  const isActive = (activeChannelTab || selectedChannels[0]) === id;
                  return (
                    <TabsContent key={id} value={id} forceMount className="space-y-2 mt-3 data-[state=inactive]:hidden">
                      <div className="relative">
                        <Textarea
                          data-testid={`channel-body-${id}`}
                          ref={isActive ? channelMessageRef : undefined}
                          value={value}
                          onChange={(e) => setChannelBody(id, e.target.value)}
                          placeholder={`Optional ${meta?.label ?? id} body (falls back to master)`}
                          rows={4}
                          className="resize-none border-[#1a472a]/20 focus:border-[#1a472a] pr-20 bg-white"
                        />
                        <span
                          className={`absolute bottom-2 right-3 text-xs font-mono ${
                            over
                              ? "text-red-600 font-bold"
                              : left <= 40
                              ? "text-amber-600"
                              : "text-[#1a472a]/80"
                          }`}
                        >
                          {left}/{max}
                        </span>
                      </div>
                      {isActive && (
                        <DictationButton
                          value={value}
                          onChange={(v) => setChannelBody(id, v)}
                          targetRef={channelMessageRef}
                          label={`Dictate ${meta?.label ?? id}`}
                        />
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => handlePost()}
              disabled={posting || !canPost}
              className="bg-[#1a472a] text-white hover:bg-[#1a472a]/90"
              data-testid="broadcast-post-now"
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
              disabled={selectedChannels.length === 0}
              className="border-[#1a472a]/30 text-[#1a472a]"
              data-testid="broadcast-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

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
                disabled={posting || !scheduledAt || !canPost}
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]">Post Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedChannels.length === 0 ? (
              <p className="text-sm text-[#1a472a]/80 italic">No channels selected</p>
            ) : (
              selectedChannels.map((id) => {
                const meta = broadcastChannelById(id);
                const body = resolveChannelBody(text, channelBodies, id);
                const max = meta?.maxChars ?? 280;
                const over = body.length > max;
                return (
                  <div key={id} className="space-y-1" data-testid={`preview-channel-${id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[#1a472a] text-xs font-medium">{meta?.label ?? id}</Label>
                      <span className={`text-xs font-mono ${over ? "text-red-600" : "text-[#1a472a]/80"}`}>
                        {body.length} / {max}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f5f9f5] border border-[#1a472a]/15 whitespace-pre-wrap text-sm text-[#1a472a] leading-relaxed">
                      {body.trim() || (
                        <span className="text-[#1a472a]/80 italic">Nothing to preview yet</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {link && (
              <div>
                <Label className="text-[#1a472a]/75 text-xs">Link</Label>
                <p className="text-sm text-[#1a472a] break-all mt-0.5">{link}</p>
              </div>
            )}
            {imageUrl && (
              <div>
                <Label className="text-[#1a472a]/75 text-xs">Image</Label>
                <img
                  src={imageUrl}
                  alt="Broadcast image preview"
                  className="mt-1 rounded-lg max-h-48 object-cover w-full"
                  width={800}
                  height={192}
                  onError={e => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
