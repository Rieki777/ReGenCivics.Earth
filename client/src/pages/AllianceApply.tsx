/**
 * /apply/alliance: the Alliance Partner application (ADR-72).
 *
 * The counterpart of /apply for organizations that support land projects with
 * services, tools, knowledge or relationships. One application per person,
 * saved as a draft as they type, editable until the partnership is decided.
 * On approval the partner is emailed how to vote for the Interoperability
 * Circle's call time and how to join the calls.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { LIGHT_CARD_FIELD } from "@/lib/fieldStyles";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Globe, Loader2, MapPin, Send } from "lucide-react";
import {
  ALLIANCE_LOCKED,
  ALLIANCE_ROLES,
  ALLIANCE_STATUS_PATH,
  ALLIANCE_APPLY_PATH,
  ALLIANCE_SHARE,
  cleanRoles,
  missingForSubmit,
} from "@shared/allianceApplication";
import { cleanDraftTools, draftToolsMissing, type DraftTool } from "@shared/toolLibrary";
import { DraftToolsEditor } from "@/components/DraftToolsEditor";
import { TickBox } from "@/components/TickBox";
import { usePersistFn } from "@/hooks/usePersistFn";

export const ALLIANCE_APPLY_SIGN_IN_HREF = `/sign-in?returnTo=${encodeURIComponent(ALLIANCE_APPLY_PATH)}`;

type Form = {
  contactName: string;
  organizationName: string;
  organizationUrl: string;
  roles: string[];
  otherSupport: string;
  scope: "local" | "global";
  location: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  supportDescription: string;
  partnershipDescription: string;
  /** The tools they bring to the library (ADR-73). Replaces the single repo field. */
  tools: DraftTool[];
};

const EMPTY: Form = {
  contactName: "",
  organizationName: "",
  organizationUrl: "",
  roles: [],
  otherSupport: "",
  scope: "local",
  location: "",
  country: "",
  latitude: null,
  longitude: null,
  supportDescription: "",
  partnershipDescription: "",
  tools: [],
};

const field = `mt-2 min-h-11 ${LIGHT_CARD_FIELD}`;
const help = "text-sm text-[#1a472a]/75 mt-1";
const sectionTitle = "text-lg font-semibold text-[#1a472a]";

type SetField = <K extends keyof Form>(key: K, value: Form[K]) => void;
type TextKey = { [K in keyof Form]: Form[K] extends string ? K : never }[keyof Form];

// The pieces below are memoized and take a stable `set`, so a keystroke
// re-renders the field being typed in, not the role boxes, the scope choice or
// the tools.

const StillSEO = memo(SEO);
const StillLabel = memo(Label);

const TextField = memo(function TextField({
  name,
  label,
  labelClassName = "text-[#1a472a]",
  hint,
  value,
  onSet,
  multiline = false,
  wrapperClassName,
  ...inputProps
}: {
  name: TextKey;
  label: string;
  labelClassName?: string;
  hint?: string;
  value: string;
  onSet: SetField;
  multiline?: boolean;
  wrapperClassName?: string;
} & Pick<ComponentProps<"input">, "type" | "inputMode" | "placeholder" | "className" | "autoComplete">) {
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onSet(name, e.target.value);
  return (
    <div className={wrapperClassName}>
      <StillLabel htmlFor={name} className={labelClassName}>{label}</StillLabel>
      {hint && <p className={help}>{hint}</p>}
      {multiline ? (
        <Textarea id={name} value={value} onChange={onChange} className={inputProps.className} />
      ) : (
        <Input id={name} value={value} onChange={onChange} {...inputProps} />
      )}
    </div>
  );
});

const AllianceIntro = memo(function AllianceIntro() {
  return (
    <>
      <Link href="/ally" className="inline-flex min-h-11 items-center text-sm font-medium text-[#2d5a3d] hover:underline">&larr; About the Alliance</Link>
      <h1 className="text-3xl font-bold text-[#1a472a] mt-4 mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Become an Alliance Partner
      </h1>
      <p className="text-[#1a472a]/80 mb-2">
        Alliance Partners support land projects with services, tools, knowledge or relationships. Approved partners join
        the Interoperability Circle, the weekly working group for the people building what sits under the land projects.
      </p>
    </>
  );
});

const RoleOptions = memo(function RoleOptions({ roles, onToggle }: { roles: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ALLIANCE_ROLES.map((r) => {
        const on = roles.includes(r.id);
        return (
          <label
            key={r.id}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${on ? "border-[#4a7c59] bg-[#7dd87d]/15" : "border-[#1a472a]/15 hover:border-[#4a7c59]/50"}`}
          >
            <TickBox checked={on} onChange={() => onToggle(r.id)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-[#1a472a]"><span aria-hidden="true">{r.icon}</span> {r.name}</span>
              <span className="block text-xs text-[#1a472a]/75">{r.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
});

const SCOPES = [
  { key: "local", icon: MapPin, title: "Location-based", sub: "We have a home base" },
  { key: "global", icon: Globe, title: "Global", sub: "We work everywhere" },
] as const;

const ScopeOptions = memo(function ScopeOptions({ scope, onSet }: { scope: Form["scope"]; onSet: SetField }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {SCOPES.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={scope === o.key}
          onClick={() => onSet("scope", o.key)}
          className={`min-h-11 rounded-lg border-2 p-3 text-center transition-colors ${scope === o.key ? "border-[#4a7c59] bg-[#7dd87d]/15" : "border-[#1a472a]/15 hover:border-[#4a7c59]/50"}`}
        >
          <o.icon className="mx-auto mb-1 h-5 w-5 text-[#4a7c59]" aria-hidden="true" />
          <span className="block text-sm font-semibold text-[#1a472a]">{o.title}</span>
          <span className="block text-xs text-[#1a472a]/75">{o.sub}</span>
        </button>
      ))}
    </div>
  );
});

const PinButton = memo(function PinButton({ pinned, onSet }: { pinned: boolean; onSet: SetField }) {
  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-[#1a472a] underline"
        onClick={() => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              onSet("latitude", Math.round(pos.coords.latitude * 10000) / 10000);
              onSet("longitude", Math.round(pos.coords.longitude * 10000) / 10000);
            },
            () => toast.error("Could not read your location. The town and country are enough."),
          );
        }}
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {pinned ? "Map pin set. Use my current location again" : "Pin us on the map with my current location"}
      </button>
    </div>
  );
});

const SendButton = memo(function SendButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <Button type="submit" className="min-h-12 w-full bg-[#1a472a] px-6 text-base font-semibold text-white hover:bg-[#2d5a3d] sm:w-auto" disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
});

export default function AllianceApply() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const mine = trpc.allianceApplications.mine.useQuery(undefined, { enabled: !!user });
  const app = mine.data?.[0] ?? null;
  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  // Fill the form once from the saved application (or the account's name).
  useEffect(() => {
    if (loaded.current || mine.isLoading || !user) return;
    loaded.current = true;
    if (!app) {
      setForm((f) => ({ ...f, contactName: user.name ?? "" }));
      return;
    }
    setForm({
      contactName: app.contactName ?? "",
      organizationName: app.organizationName ?? "",
      organizationUrl: app.organizationUrl ?? "",
      roles: cleanRoles(app.roles),
      otherSupport: app.otherSupport ?? "",
      scope: app.scope ?? "local",
      location: app.location ?? "",
      country: app.country ?? "",
      latitude: app.latitude ?? null,
      longitude: app.longitude ?? null,
      supportDescription: app.supportDescription ?? "",
      partnershipDescription: app.partnershipDescription ?? "",
      // A repo saved before the tools section existed becomes its first tool.
      tools: (() => {
        const saved = cleanDraftTools(app.tools);
        if (saved.length || !app.toolRepoUrl) return saved;
        return [{ name: "", url: app.toolRepoUrl, description: "", kind: "software" as const, isOpenSource: false }];
      })(),
    });
  }, [app, mine.isLoading, user]);

  const save = trpc.allianceApplications.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.allianceApplications.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = trpc.allianceApplications.submit.useMutation();

  // Autosave a moment after typing stops.
  useEffect(() => {
    if (!dirty || !user) return;
    const t = setTimeout(() => save.mutate(form), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, user]);

  const set = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }, []);
  const toggleRole = usePersistFn((id: string) =>
    set("roles", form.roles.includes(id) ? form.roles.filter((r) => r !== id) : [...form.roles, id]));
  const setTools = useCallback((next: DraftTool[]) => set("tools", next), [set]);

  const [triedSend, setTriedSend] = useState(false);
  const missing = useMemo(() => {
    const gaps = missingForSubmit(form);
    const toolGap = draftToolsMissing(cleanDraftTools(form.tools));
    return toolGap ? [...gaps, toolGap] : gaps;
  }, [form]);
  const locked = app ? (ALLIANCE_LOCKED as readonly string[]).includes(app.status) : false;
  const sent = app && ["submitted", "under_review"].includes(app.status);

  async function handleSend() {
    setTriedSend(true);
    if (missing.length) {
      toast.error(`Add ${missing.join(", ")} before sending.`);
      return;
    }
    try {
      await save.mutateAsync(form);
      if (!sent) await submit.mutateAsync();
      await utils.allianceApplications.mine.invalidate();
      toast.success(sent ? "Changes saved." : "Application sent. We will email you when it is reviewed.");
      navigate(ALLIANCE_STATUS_PATH);
    } catch (e: any) {
      toast.error(e?.message || "Could not send the application.");
    }
  }

  if (loading || (user && mine.isLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]"><Loader2 className="w-8 h-8 animate-spin text-[#1a472a]" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center p-4">
        <SEO title={ALLIANCE_SHARE.title} description={ALLIANCE_SHARE.description} image={ALLIANCE_SHARE.image} url={ALLIANCE_APPLY_PATH} />
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>Become an Alliance Partner</h1>
          <p className="text-[#1a472a]/80 mb-5">Sign in to start your application. It saves as you go, so you can come back to it.</p>
          <a
            href={ALLIANCE_APPLY_SIGN_IN_HREF}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#7dd87d] px-6 py-2 font-semibold text-[#1a472a] transition-colors hover:bg-[#9de89d]"
          >
            Sign in to apply
          </a>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center p-4">
        <SEO title="Alliance Partner application | ReGen Civics" description="Your Alliance Partner application." url={ALLIANCE_APPLY_PATH} />
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1a472a] mb-3">{app?.organizationName} is an Alliance Partner</h1>
          <p className="text-[#1a472a]/80 mb-5">The partnership is decided, so the application is closed for edits.</p>
          <Link href={ALLIANCE_STATUS_PATH} className="inline-flex min-h-11 items-center text-[#1a472a] font-semibold underline">Your next steps</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-10 px-4">
      <StillSEO title={ALLIANCE_SHARE.title} description={ALLIANCE_SHARE.description} image={ALLIANCE_SHARE.image} url={ALLIANCE_APPLY_PATH} />
      <div className="max-w-2xl mx-auto">
        <AllianceIntro />
        <p className="text-sm text-[#1a472a]/85 mb-6" aria-live="polite">
          {save.isPending ? "Saving…" : dirty ? "Unsaved changes" : app ? "Saved" : "Your answers save as you type."}
        </p>

        {app?.reviewNote && (app.status === "changes_requested" || app.status === "rejected") && (
          <div className="mb-6 rounded-xl border border-[#d4a574]/60 bg-[#fffaf0] p-4 text-[#1a472a]">
            <p className="font-semibold">A note from the review team</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{app.reviewNote}</p>
          </div>
        )}

        <form
          noValidate
          className="space-y-6 rounded-2xl bg-white p-6 border border-[#1a472a]/10"
          onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="contactName" label="Your name" value={form.contactName} onSet={set} className={field} autoComplete="name" />
            <TextField name="organizationName" label="Organization name" value={form.organizationName} onSet={set} className={field} autoComplete="organization" />
          </div>

          <TextField name="organizationUrl" label="Best link to explore your organization" type="url" inputMode="url" value={form.organizationUrl} onSet={set} placeholder="https://your-organization.org" className={field} />

          <fieldset>
            <legend className={sectionTitle}>What you bring</legend>
            <p className={help}>Pick every role and kind of support that fits. They become your tags on the map.</p>
            <RoleOptions roles={form.roles} onToggle={toggleRole} />
            {form.roles.includes("Other") && (
              <TextField name="otherSupport" label="Your other kind of support" value={form.otherSupport} onSet={set} className={field} wrapperClassName="mt-3" />
            )}
          </fieldset>

          <fieldset>
            <legend className={sectionTitle}>Where you work</legend>
            <ScopeOptions scope={form.scope} onSet={set} />
            {form.scope === "local" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField name="location" label="Town or region" value={form.location} onSet={set} className={field} />
                <TextField name="country" label="Country" value={form.country} onSet={set} className={field} autoComplete="country-name" />
                <PinButton pinned={form.latitude != null} onSet={set} />
              </div>
            )}
          </fieldset>

          <TextField
            name="supportDescription"
            label="How you support land projects"
            labelClassName={sectionTitle}
            hint="The services, resources or know-how you offer, and who you serve now."
            value={form.supportDescription}
            onSet={set}
            multiline
            className={`${field} min-h-[120px]`}
          />

          <TextField
            name="partnershipDescription"
            label="What you would like to build with the Alliance"
            labelClassName={sectionTitle}
            hint="Optional. The projects, partners or tools you would like to work with."
            value={form.partnershipDescription}
            onSet={set}
            multiline
            className={`${field} min-h-[100px]`}
          />

          <DraftToolsEditor tools={form.tools} onChange={setTools} showProblems={triedSend} />

          {missing.length > 0 && (
            <p className="text-sm text-[#1a472a]/80">Still to add: {missing.join(", ")}.</p>
          )}
          <SendButton
            busy={save.isPending || submit.isPending}
            label={sent ? "Save changes" : app?.status === "changes_requested" || app?.status === "rejected" ? "Send again" : "Send my application"}
          />
        </form>
      </div>
    </div>
  );
}
