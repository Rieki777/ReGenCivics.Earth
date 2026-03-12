/**
 * ProfileEditForm  -  Path-aware profile edit form shown on /profile.
 * Fields vary based on the user's chosen path.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Path = "investor" | "land_project" | "ally" | "player";

const PATH_LABELS: Record<Path, string> = {
  investor: "Investor",
  land_project: "Land Project",
  ally: "Alliance Partner",
  player: "Player",
};

export function ProfileEditForm() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.userProfiles.getMe.useQuery();

  const [form, setForm] = useState({
    displayName: "",
    // Structured soul questions (stored as JSON in bio)
    role: "",
    soul: "",
    desires: "",
    gifts: "",
    legacyBio: "",  // fallback for pre-structured bio plain text
    location: "",
    avatarUrl: "",
    investmentRange: "",
    projectName: "",
    projectUrl: "",
    organizationName: "",
    questInterests: "",
  });

  useEffect(() => {
    if (!profile) return;
    let parsed: { role?: string; soul?: string; desires?: string; gifts?: string } | null = null;
    try { parsed = JSON.parse(profile.bio ?? ""); } catch { /* plain text bio */ }
    setForm({
      displayName: profile.displayName ?? "",
      role: parsed?.role ?? "",
      soul: parsed?.soul ?? "",
      desires: parsed?.desires ?? "",
      gifts: parsed?.gifts ?? "",
      legacyBio: (!parsed && profile.bio) ? profile.bio : "",
      location: profile.location ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      investmentRange: profile.investmentRange ?? "",
      projectName: profile.projectName ?? "",
      projectUrl: profile.projectUrl ?? "",
      organizationName: profile.organizationName ?? "",
      questInterests: profile.questInterests ?? "",
    });
  }, [profile]);

  const update = trpc.userProfiles.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.userProfiles.getMe.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save profile");
    },
  });

  const path = profile?.path as Path | undefined | null;

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bioValue = (form.role || form.soul || form.desires || form.gifts)
      ? JSON.stringify({ role: form.role, soul: form.soul, desires: form.desires, gifts: form.gifts })
      : form.legacyBio || undefined;
    update.mutate({
      displayName: form.displayName || undefined,
      bio: bioValue,
      location: form.location || undefined,
      avatarUrl: form.avatarUrl || undefined,
      investmentRange: form.investmentRange || undefined,
      projectName: form.projectName || undefined,
      projectUrl: form.projectUrl || undefined,
      organizationName: form.organizationName || undefined,
      questInterests: form.questInterests || undefined,
    });
  }

  if (isLoading) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {path && (
        <div className="text-sm text-white/50 mb-1">
          Your path: <span className="text-white/80 font-medium">{PATH_LABELS[path]}</span>
        </div>
      )}

      {/* Common fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-white/70">Display Name</Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="Your name"
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-white/70">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City, Country"
            maxLength={255}
          />
        </div>
      </div>

      {/* Structured soul questions — stored as JSON in bio field */}
      <div className="space-y-3">
        <p className="text-white/70 text-sm font-medium">About You</p>
        {form.legacyBio ? (
          <div className="space-y-1.5">
            <Label htmlFor="legacyBio" className="text-white/60 text-xs">Bio</Label>
            <Textarea
              id="legacyBio"
              value={form.legacyBio}
              onChange={(e) => set("legacyBio", e.target.value)}
              placeholder="Tell the community about yourself"
              rows={3}
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-white/60 text-xs">Your role in this renaissance</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Land steward, investor, builder, artist..."
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soul" className="text-white/60 text-xs">Your soul's mission</Label>
              <Textarea
                id="soul"
                value={form.soul}
                onChange={(e) => set("soul", e.target.value)}
                placeholder="The deeper calling that brought you here..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desires" className="text-white/60 text-xs">What are you seeking?</Label>
              <Textarea
                id="desires"
                value={form.desires}
                onChange={(e) => set("desires", e.target.value)}
                placeholder="What would make this worth your time and energy?"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gifts" className="text-white/60 text-xs">Gifts you bring</Label>
              <Textarea
                id="gifts"
                value={form.gifts}
                onChange={(e) => set("gifts", e.target.value)}
                placeholder="Skills, resources, wisdom, connections..."
                rows={2}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl" className="text-white/70">Avatar URL</Label>
        <div className="flex items-center gap-3">
          {form.avatarUrl && (
            <img
              src={form.avatarUrl}
              alt="Preview"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/20"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <Input
            id="avatarUrl"
            value={form.avatarUrl}
            onChange={(e) => set("avatarUrl", e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && !v.startsWith("https://")) {
                // show a subtle warning by not validating — browser handles it
              }
            }}
            placeholder="https://..."
            maxLength={500}
          />
        </div>
        <p className="text-white/40 text-xs">
          Paste a direct link to an image (JPG, PNG, WebP). Tip: upload to Imgur or Google Photos (shared link) and paste the direct image URL. Must start with https://.
        </p>
      </div>

      {/* Investor-specific */}
      {path === "investor" && (
        <div className="space-y-1.5">
          <Label htmlFor="investmentRange" className="text-white/70">Investment Range</Label>
          <Input
            id="investmentRange"
            value={form.investmentRange}
            onChange={(e) => set("investmentRange", e.target.value)}
            placeholder="e.g. $50k – $250k"
            maxLength={255}
          />
        </div>
      )}

      {/* Land Project-specific */}
      {path === "land_project" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="projectName" className="text-white/70">Project Name</Label>
            <Input
              id="projectName"
              value={form.projectName}
              onChange={(e) => set("projectName", e.target.value)}
              placeholder="Your project name"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projectUrl" className="text-white/70">Project URL</Label>
            <Input
              id="projectUrl"
              value={form.projectUrl}
              onChange={(e) => set("projectUrl", e.target.value)}
              placeholder="https://..."
              maxLength={500}
              type="url"
            />
          </div>
        </div>
      )}

      {/* Alliance Partner-specific */}
      {path === "ally" && (
        <div className="space-y-1.5">
          <Label htmlFor="organizationName" className="text-white/70">Organization Name</Label>
          <Input
            id="organizationName"
            value={form.organizationName}
            onChange={(e) => set("organizationName", e.target.value)}
            placeholder="Your organization"
            maxLength={255}
          />
        </div>
      )}

      {/* Player-specific */}
      {path === "player" && (
        <div className="space-y-1.5">
          <Label htmlFor="questInterests" className="text-white/70">Quest Interests</Label>
          <Textarea
            id="questInterests"
            value={form.questInterests}
            onChange={(e) => set("questInterests", e.target.value)}
            placeholder="What kinds of quests interest you? (e.g. ecology, governance, art, tech)"
            rows={2}
          />
        </div>
      )}

      <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
        {update.isPending ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}
