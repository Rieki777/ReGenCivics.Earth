/**
 * GovTenant
 * Route: /gov/:slug
 *
 * Tenant home page: shows the tenant's display name, description, member
 * count, recent decisions, and a Join button for non-members.
 */
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Layers, Users, Globe, Sprout, Building2, ArrowRight, ExternalLink } from "lucide-react";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  bioregion: Globe,
  land_project: Sprout,
  organization: Building2,
  platform: Layers,
};

export default function GovTenant() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const tenantQuery = trpc.governance.getTenantBySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const tenantsQuery = trpc.governance.myTenants.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useContext();
  const joinMutation = trpc.governance.joinTenant.useMutation({
    onSuccess: () => {
      utils.governance.myTenants.invalidate();
      utils.governance.getTenantBySlug.invalidate({ slug });
    },
  });

  if (tenantQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center text-white/65">
        Loading tenant...
      </div>
    );
  }

  const tenant = tenantQuery.data;
  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex flex-col items-center justify-center text-center px-4">
        <Layers className="w-10 h-10 text-amber-400 mb-3" />
        <h1 className="text-2xl font-bold text-white mb-2">Tenant not found</h1>
        <p className="text-white/65 mb-6">No governance space with that slug.</p>
        <Link href="/gov/create" className="text-[#7dd87d] hover:underline">Create one</Link>
      </div>
    );
  }

  const Icon = TYPE_ICON[tenant.tenantType] ?? Layers;
  const isMember = (tenantsQuery.data ?? []).some((t: any) => t.id === tenant.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title={`${tenant.displayName} | Governance | ReGen Civics`} description={tenant.description ?? `Governance space for ${tenant.displayName}`} />
      <BackButton />

      {/* Hero */}
      <section className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="flex items-start gap-4 mb-4">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.displayName} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-8 h-8 text-[#7dd87d]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              {tenant.displayName}
            </h1>
            <div className="flex items-center gap-3 text-white/55 text-sm mt-1 flex-wrap">
              <span className="capitalize">{tenant.tenantType.replace("_", " ")}</span>
              <span>·</span>
              <span className="font-mono">/gov/{tenant.slug}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {(tenant as any).memberCount ?? 0} members
              </span>
            </div>
          </div>
          {isAuthenticated && !isMember && (
            <Button
              onClick={() => joinMutation.mutate({ slug: slug ?? "" })}
              disabled={joinMutation.isPending}
              className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold flex-shrink-0"
            >
              {joinMutation.isPending ? "Joining..." : "Join"}
            </Button>
          )}
          {isAuthenticated && isMember && (
            <span className="text-[#7dd87d] text-xs font-bold px-3 py-1.5 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30">
              Member
            </span>
          )}
        </div>

        {tenant.description && (
          <p className="text-white/85 text-base leading-relaxed max-w-2xl">{tenant.description}</p>
        )}
      </section>

      {/* Hypha DHO link */}
      {tenant.hyphaDhoSlug && (
        <section className="px-4 max-w-4xl mx-auto mb-8">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">Hypha DHO</p>
            <p className="text-white/85 text-sm">
              Token decisions in this space land at <code className="font-mono text-amber-300">{tenant.hyphaDhoSlug}</code> on Hypha.
            </p>
            <p className="text-white/55 text-xs mt-2">
              Members claim accumulated internal tokens to this DHO when they cross the claim threshold.
            </p>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="px-4 max-w-4xl mx-auto mb-12">
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/community/decisions" className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-4 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#7dd87d]" />
              <span className="text-white font-bold text-sm">Open decisions</span>
              <ArrowRight className="w-3 h-3 text-white/55 ml-auto" />
            </div>
            <p className="text-white/65 text-xs leading-relaxed">All open decisions across this space.</p>
          </Link>
          <Link href="/community/decisions/stories" className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-4 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold text-sm">Storyteller narratives</span>
              <ArrowRight className="w-3 h-3 text-white/55 ml-auto" />
            </div>
            <p className="text-white/65 text-xs leading-relaxed">How past decisions actually went down.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
