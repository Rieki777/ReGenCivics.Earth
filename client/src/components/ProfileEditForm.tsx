/**
 * ProfileEditForm — Path-aware profile edit form shown on /profile.
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
    bio: "",
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
    setForm({
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? "",
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
    update.mutate({
      displayName: form.displayName || undefined,
      bio: form.bio || undefined,
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

      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-white/70">Bio / About</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="Tell the community about yourself"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl" className="text-white/70">Avatar URL</Label>
        <Input
          id="avatarUrl"
          value={form.avatarUrl}
          onChange={(e) => set("avatarUrl", e.target.value)}
          placeholder="https://..."
          maxLength={500}
          type="url"
        />
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
