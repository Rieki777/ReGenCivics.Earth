/**
 * Outbound hub: email + social in one admin section.
 * PR1 is the shell. Write / Templates / Sent are empty until the send PR.
 */
import { useMemo, useState } from "react";
import { Mail, Radio, Users, FileText, Send, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OUTBOUND_SURFACES,
  type OutboundSurface,
} from "@/lib/adminNav";
import {
  NEWSLETTER_SOURCES,
  filterNewsletterAudience,
  newsletterAudienceCsv,
  newsletterSourceLabel,
  type NewsletterAudienceRow,
  type SubscriberStatusFilter,
} from "@/lib/outboundAudience";

const SURFACE_META: Record<OutboundSurface, { label: string; icon: typeof Mail; blurb: string }> = {
  write: { label: "Write", icon: Mail, blurb: "Draft a letter" },
  social: { label: "Social", icon: Radio, blurb: "Post to channels" },
  people: { label: "People", icon: Users, blurb: "Subscribers" },
  templates: { label: "Templates", icon: FileText, blurb: "Saved letters" },
  sent: { label: "Sent", icon: Send, blurb: "Issue history" },
};

export function AdminOutboundHub({
  surface,
  onSurfaceChange,
}: {
  surface: OutboundSurface;
  onSurfaceChange: (surface: OutboundSurface) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Outbound
        </h2>
        <p className="text-sm text-[#1a472a]/80">
          Letters to subscribers and posts to social channels, in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outbound sections">
        {OUTBOUND_SURFACES.map((id) => {
          const meta = SURFACE_META[id];
          const Icon = meta.icon;
          const active = surface === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSurfaceChange(id)}
              className={`min-h-11 px-3 rounded-xl border inline-flex items-center gap-2 text-sm font-medium ${
                active
                  ? "border-[#1a472a] bg-[#1a472a]/5 text-[#1a472a]"
                  : "border-[#1a472a]/15 bg-white text-[#1a472a]/80 hover:border-[#1a472a]/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {surface === "write" && <WriteStub />}
      {surface === "social" && <AdminBroadcastPanel />}
      {surface === "people" && <PeoplePanel />}
      {surface === "templates" && <TemplatesStub />}
      {surface === "sent" && <SentStub />}
    </div>
  );
}

function WriteStub() {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Write a letter
        </CardTitle>
        <CardDescription>
          Compose a newsletter to subscribers here. Sending ships in the next update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed border-[#1a472a]/20 bg-[#f8f5f0] p-6 text-sm text-[#1a472a]/80 space-y-2">
          <p>
            The composer will take full markdown: headings, bold, italic, lists, links,
            blockquotes, horizontal rules, and images from assets.regencivics.earth.
          </p>
          <p>
            Insert a CTA button as its own control. Insert an image the same way.
            Preview the letter with buttons, images, and the unsubscribe footer before
            anything goes out.
          </p>
          <p>
            An AI writing partner can draft a letter, add a button, drop in a hero
            image, or shorten copy for an exit-intent segment.
          </p>
          <p>The send button stays off until that path is ready.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatesStub() {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Newsletter templates
        </CardTitle>
        <CardDescription>
          Saved Outbound letters live here: full markdown layouts with CTA buttons and images.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#1a472a]/80">No newsletter templates yet.</p>
      </CardContent>
    </Card>
  );
}

function SentStub() {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Sent issues
        </CardTitle>
        <CardDescription>
          Each letter you send will show here with recipient counts and status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#1a472a]/80">Nothing sent from Outbound yet.</p>
      </CardContent>
    </Card>
  );
}

function PeoplePanel() {
  const { data: subscribers, isLoading } = trpc.newsletter.list.useQuery();
  const [status, setStatus] = useState<SubscriberStatusFilter>("active");
  const [source, setSource] = useState("all");

  const filtered = useMemo(
    () => filterNewsletterAudience((subscribers ?? []) as NewsletterAudienceRow[], { status, source }),
    [subscribers, status, source],
  );

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const csv = newsletterAudienceCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle
              className="text-[#1a472a] flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Mail className="w-5 h-5" />
              Subscribers
            </CardTitle>
            <CardDescription>People who signed up to receive updates</CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-[#1a472a]/30 text-[#1a472a]"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-[#1a472a] text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubscriberStatusFilter)}>
              <SelectTrigger className="bg-white min-w-[10rem] border-[#1a472a]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[#1a472a] text-xs">Signup source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-white min-w-[12rem] border-[#1a472a]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {NEWSLETTER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {newsletterSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-[#1a472a]/75">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{subscribers && subscribers.length > 0 ? "No subscribers match this filter." : "No newsletter subscribers yet."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#1a472a]/80 pb-2 border-b border-[#1a472a]/10">
              {filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}
              {status === "active" ? " (active)" : ""}
            </p>
            {filtered.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#f0ebe3]/50 border border-[#1a472a]/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#1a472a]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a472a] truncate">{subscriber.email}</p>
                    <p className="text-xs text-[#1a472a]/75">
                      Subscribed {new Date(subscriber.createdAt).toLocaleDateString()}
                      {subscriber.source ? ` via ${newsletterSourceLabel(subscriber.source)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {subscriber.isActive !== 1 && (
                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {newsletterSourceLabel(subscriber.source || "other")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminOutboundHub;
