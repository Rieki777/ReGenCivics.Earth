/**
 * GovCreate
 * Route: /gov/create
 *
 * Multi-tenant governance: any citizen can create a bioregion, land project,
 * or organization tenant and become its first admin. Spec: Section 4.4.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Sprout, Building2, Globe, ArrowRight, AlertCircle } from "lucide-react";
import { getLoginUrl } from "@/const";

const TENANT_TYPES = [
  { value: "bioregion" as const, label: "Bioregion", icon: Globe, description: "A bioregional cohort or watershed community" },
  { value: "land_project" as const, label: "Land Project", icon: Sprout, description: "A specific regenerative land project with its own governance" },
  { value: "organization" as const, label: "Organization", icon: Building2, description: "An alliance organization or sub-org" },
];

export default function GovCreate() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tenantType, setTenantType] = useState<"bioregion" | "land_project" | "organization">("bioregion");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [hyphaDhoSlug, setHyphaDhoSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.governance.createTenant.useMutation({
    onSuccess: (data) => {
      navigate(`/gov/${data.slug}`);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    createMutation.mutate({
      tenantType,
      slug: slug.toLowerCase().trim(),
      displayName: displayName.trim(),
      description: description.trim() || undefined,
      hyphaDhoSlug: hyphaDhoSlug.trim() || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex flex-col items-center justify-center text-center px-4">
        <Layers className="w-10 h-10 text-[#7dd87d] mb-3" />
        <h1 className="text-2xl font-bold text-white mb-2">Sign in to create a governance space</h1>
        <p className="text-white/65 mb-6 max-w-md">
          You need an account to create a bioregion, land project, or organization tenant.
        </p>
        <a href={getLoginUrl()} className="px-6 py-3 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold">
          Sign in
        </a>
      </div>
    );
  }

  const slugValid = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Create a governance space | ReGen Civics" description="Spin up a new bioregion, land project, or organization governance tenant." />
      <BackButton />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-7 h-7 text-[#7dd87d]" />
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Create a governance space
          </h1>
        </div>
        <p className="text-white/65 text-sm mb-8 max-w-xl">
          Bioregions, land projects, and alliance organizations each get their own governance tenant. You become the first admin and invite members from there.
        </p>

        <div className="bg-white/5 border border-[#7dd87d]/30 rounded-2xl p-6 backdrop-blur-sm space-y-5">
          {/* Tenant type picker */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Type</label>
            <div className="grid sm:grid-cols-3 gap-2">
              {TENANT_TYPES.map((t) => {
                const Icon = t.icon;
                const active = tenantType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTenantType(t.value)}
                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-colors ${
                      active
                        ? "bg-[#7dd87d]/15 border-[#7dd87d] text-white"
                        : "bg-white/5 border-white/15 text-white/75 hover:bg-white/8"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-[#7dd87d]" />
                    <span className="font-bold text-sm">{t.label}</span>
                    <span className="text-[11px] opacity-75 leading-snug">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Skagit Watershed"
              className="bg-white/10 border-white/15 text-white placeholder:text-white/70"
              maxLength={200}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="skagit-watershed"
              className="bg-white/10 border-white/15 text-white placeholder:text-white/70 font-mono"
              maxLength={80}
            />
            <p className="text-white/70 text-[11px] mt-1">
              Used in the URL: <code className="text-[#7dd87d]/80">/gov/{slug || "your-slug"}</code>. Lowercase letters, numbers, hyphens.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who is this governance space for and what kinds of decisions live here?"
              rows={4}
              className="bg-white/10 border-white/15 text-white placeholder:text-white/70 resize-none"
              maxLength={2000}
            />
          </div>

          {/* Hypha DHO slug */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Hypha DHO slug (optional)</label>
            <Input
              value={hyphaDhoSlug}
              onChange={(e) => setHyphaDhoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="leave blank to use the platform default"
              className="bg-white/10 border-white/15 text-white placeholder:text-white/70 font-mono"
              maxLength={80}
            />
            <p className="text-white/70 text-[11px] mt-1">
              Maps your tenant to a specific Hypha DHO on Base for token claims. You can set this later.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/30 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!slug || !slugValid || !displayName || createMutation.isPending}
            className="w-full bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold py-3 rounded-xl"
          >
            {createMutation.isPending ? "Creating..." : "Create governance space"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
