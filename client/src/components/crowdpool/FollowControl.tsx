/**
 * One Follow control for every campaign surface (build spec 2026-09-27,
 * section 12.5; research R05). It replaced four email sign-ups that each
 * promised something different.
 *
 * Project mode follows the project, not one campaign
 * (campaigns.followProject, user_follows.targetType 'project'), so a follow
 * lasts from season to season:
 *   - signed in: one tap, a toggle with aria-pressed, optimistic with a
 *     rollback and a toast when the server says no;
 *   - signed out, on a project with a live campaign: Follow opens an email
 *     form (campaigns.subscribeByEmail), prefilled when we already have the
 *     address. Email followers hear through the season letters Rye sends from
 *     Outbound, so nothing is sent to them automatically;
 *   - an example project, or a signed-out visitor on a project with no live
 *     campaign: the same Follow button opens the season form instead.
 *
 * Season mode joins the season's crowdpool waitlist (campaigns.joinWaitlist;
 * the server picks the season): one button when signed in, an email field
 * when signed out. It sits on the gallery, the Needs tab and the practice
 * receipt.
 *
 * Every control is 44px tall, every field has a visible label, errors sit
 * under the field with role="alert", and confirmations land in a polite live
 * region. The control adds no fixed or sticky element.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FOLLOW } from "@shared/crowdpoolCopy";

export type FollowControlProps =
  | {
      mode: "project";
      /** The project page key (shared/projectKey.ts), the canonical one when known. */
      projectKey: string;
      /** The live campaign an email follow attaches to. Null when the project has none live. */
      campaignId: number | null;
      projectName: string;
      /** projects.getPublic viewer.followsProject. */
      initiallyFollowing: boolean;
      variant: "header" | "receipt";
      /** Prefills the email form, for example with the address an offer just went out under. */
      defaultEmail?: string;
      /** Example projects can't be followed, so they offer the season form. */
      isExample?: boolean;
    }
  | {
      mode: "season";
      variant: "card" | "receipt";
      heading?: string;
      defaultEmail?: string;
    };

/** Enough of an email address to send: something@something.tld, no spaces. The server checks again. */
export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The site's root carries `.dark`, and the outline Button sets
 * dark:bg-transparent and dark:border-input, which would leave "Following"
 * white on the white card. The dark: classes here take their place
 * (tailwind-merge keeps the last of each), so the button reads the same on
 * every page.
 */
const followButtonClass = (on: boolean) =>
  `min-h-11 ${on
    ? "bg-[#4a7c59] text-white border-[#4a7c59] hover:bg-[#1a472a] hover:text-white dark:bg-[#4a7c59] dark:border-[#4a7c59] dark:hover:bg-[#1a472a]"
    : "border-[#4a7c59] text-[#1a472a] bg-white hover:bg-[#4a7c59] hover:text-white dark:bg-white dark:border-[#4a7c59] dark:hover:bg-[#4a7c59]"}`;

/** Where a panel sits: in the header's row it goes last and takes a full line, so Share stays beside Follow. */
const panelPlacement = (variant: "header" | "receipt") =>
  variant === "header" ? "order-last basis-full w-full" : "basis-full w-full";

export function FollowControl(props: FollowControlProps) {
  const { isAuthenticated } = useAuth();
  if (props.mode === "season") {
    return <SeasonFollow variant={props.variant} heading={props.heading} defaultEmail={props.defaultEmail} />;
  }
  if (props.isExample || (!isAuthenticated && !props.campaignId)) {
    return (
      <SeasonFallback
        variant={props.variant}
        projectName={props.projectName}
        isExample={!!props.isExample}
        defaultEmail={props.defaultEmail}
      />
    );
  }
  if (isAuthenticated) {
    return (
      <ProjectToggle
        projectKey={props.projectKey}
        projectName={props.projectName}
        initiallyFollowing={props.initiallyFollowing}
        variant={props.variant}
      />
    );
  }
  return (
    <EmailFollow
      campaignId={props.campaignId!}
      projectName={props.projectName}
      variant={props.variant}
      defaultEmail={props.defaultEmail}
    />
  );
}

// ── Signed in: one tap ──────────────────────────────────────────────────────

function ProjectToggle({ projectKey, projectName, initiallyFollowing, variant }: {
  projectKey: string;
  projectName: string;
  initiallyFollowing: boolean;
  variant: "header" | "receipt";
}) {
  const utils = trpc.useUtils();
  const [following, setFollowing] = useState(initiallyFollowing);
  // The page's own reading wins once it arrives (another control, another tab).
  useEffect(() => setFollowing(initiallyFollowing), [initiallyFollowing]);

  // Every Follow on the page reads projects.getPublic, so they agree after a tap.
  const settle = () => { void utils.projects.getPublic.invalidate(); };
  const follow = trpc.campaigns.followProject.useMutation({
    onError: () => { setFollowing(false); toast.error(FOLLOW.error); },
    onSettled: settle,
  });
  const unfollow = trpc.campaigns.unfollowProject.useMutation({
    onError: () => { setFollowing(true); toast.error(FOLLOW.error); },
    onSettled: settle,
  });
  const pending = follow.isPending || unfollow.isPending;

  const toggle = () => {
    // One change at a time. The button stays focusable while it saves.
    if (pending) return;
    const next = !following;
    setFollowing(next);
    if (next) follow.mutate({ key: projectKey });
    else unfollow.mutate({ key: projectKey });
  };

  const label = variant === "receipt"
    ? (following ? FOLLOW.followingProject(projectName) : FOLLOW.followProject(projectName))
    : (following ? FOLLOW.following : FOLLOW.follow);

  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={following}
      aria-busy={pending || undefined}
      onClick={toggle}
      className={followButtonClass(following)}
    >
      {following ? <BellRing className="w-4 h-4 mr-2" aria-hidden="true" /> : <Bell className="w-4 h-4 mr-2" aria-hidden="true" />}
      {label}
    </Button>
  );
}

// ── Signed out, a live campaign: follow by email ────────────────────────────

function EmailFollow({ campaignId, projectName, variant, defaultEmail }: {
  campaignId: number;
  projectName: string;
  variant: "header" | "receipt";
  defaultEmail?: string;
}) {
  const panelId = useId();
  const inputId = useId();
  const errorId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // An address that arrives after the first render (the receipt) fills an empty field.
  useEffect(() => {
    if (defaultEmail) setEmail((v) => v || defaultEmail);
  }, [defaultEmail]);

  const subscribe = trpc.campaigns.subscribeByEmail.useMutation({
    onSuccess: () => {
      setDone(true);
      setError(null);
      toggleRef.current?.focus();
    },
    onError: () => setError(FOLLOW.error),
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) setMounted(true);
  };

  // Opening the form puts the cursor in the field.
  useEffect(() => {
    if (open && !done) inputRef.current?.focus();
  }, [open, done]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isEmailLike(value)) {
      setError(FOLLOW.invalidEmail);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    subscribe.mutate({ campaignId, email: value });
  };

  return (
    <>
      <Button
        ref={toggleRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={followButtonClass(done)}
      >
        {done ? <BellRing className="w-4 h-4 mr-2" aria-hidden="true" /> : <Bell className="w-4 h-4 mr-2" aria-hidden="true" />}
        {variant === "receipt"
          ? (done ? FOLLOW.followingProject(projectName) : FOLLOW.followProject(projectName))
          : (done ? FOLLOW.following : FOLLOW.follow)}
      </Button>
      {mounted && (
        <div
          id={panelId}
          hidden={!open}
          className={`${panelPlacement(variant)} text-left rounded-xl bg-[#f0f7f0] p-3 sm:p-4 space-y-2`}
        >
          {/* Always in the panel once it has opened, so the confirmation is read out. */}
          <p role="status" className={done ? "flex items-start gap-2 text-sm font-medium text-[#1a472a]" : "sr-only"}>
            {done && <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#4a7c59]" aria-hidden="true" />}
            {done ? FOLLOW.emailDone(projectName) : ""}
          </p>
          {!done && (
            <form noValidate onSubmit={submit} className="space-y-2">
              <p className="text-sm text-[#1a472a]/85">{FOLLOW.emailIntro(projectName)}</p>
              <label htmlFor={inputId} className="block text-sm font-semibold text-[#1a472a]">
                {FOLLOW.emailLabel}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  ref={inputRef}
                  id={inputId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="bg-white border-[#4a7c59]/40"
                />
                <Button
                  type="submit"
                  disabled={subscribe.isPending}
                  className="min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white whitespace-nowrap"
                >
                  {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                  {FOLLOW.emailSubmit}
                </Button>
              </div>
              {error && (
                <p id={errorId} role="alert" className="text-sm font-medium text-red-700">{error}</p>
              )}
            </form>
          )}
        </div>
      )}
    </>
  );
}

// ── An example project, or signed out with nothing live: the season form ────

function SeasonFallback({ variant, projectName, isExample, defaultEmail }: {
  variant: "header" | "receipt";
  projectName: string;
  isExample: boolean;
  defaultEmail?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) setMounted(true);
  };
  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={followButtonClass(false)}
      >
        <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
        {variant === "receipt" ? FOLLOW.followProject(projectName) : FOLLOW.follow}
      </Button>
      {mounted && (
        <div
          id={panelId}
          hidden={!open}
          className={`${panelPlacement(variant)} text-left rounded-xl bg-[#f0f7f0] p-3 sm:p-4`}
        >
          {/* An example says why it can't be followed; a project with nothing live says what this does. */}
          {!isExample && <p className="text-sm font-semibold text-[#1a472a] mb-1">{FOLLOW.seasonHeading}</p>}
          <SeasonForm
            tone="light"
            lead={isExample ? FOLLOW.exampleRefused : undefined}
            bodyWhenSignedOut={!isExample}
            defaultEmail={defaultEmail}
            focusOnMount
          />
        </div>
      )}
    </>
  );
}

// ── Season mode ──────────────────────────────────────────────────────────────

function SeasonFollow({ variant, heading, defaultEmail }: {
  variant: "card" | "receipt";
  heading?: string;
  defaultEmail?: string;
}) {
  if (variant === "card") {
    return (
      <div className="bg-gradient-to-br from-[#0d2818] to-[#1a472a] border border-[#7dd87d]/20 rounded-2xl p-6 sm:p-8 text-center">
        <Bell className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {heading ?? FOLLOW.seasonHeading}
        </h2>
        <SeasonForm tone="dark" defaultEmail={defaultEmail} />
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#4a7c59]/30 bg-[#f0f7f0] p-4">
      <p className="text-sm font-semibold text-[#1a472a] mb-2">{heading ?? FOLLOW.seasonHeading}</p>
      <SeasonForm tone="light" defaultEmail={defaultEmail} bodyWhenSignedOut={false} />
    </div>
  );
}

/**
 * The waitlist form. Signed in with an address on the account: one button.
 * Otherwise: a labelled email field and "Tell me". `lead` goes first when
 * given (the fallback panel's reason); the body says what happens next.
 */
function SeasonForm({ tone, lead, defaultEmail, focusOnMount = false, bodyWhenSignedOut = true }: {
  tone: "dark" | "light";
  lead?: string;
  defaultEmail?: string;
  focusOnMount?: boolean;
  bodyWhenSignedOut?: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const accountEmail = isAuthenticated && typeof user?.email === "string" && isEmailLike(user.email) ? user.email.trim() : null;
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (defaultEmail) setEmail((v) => v || defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (!focusOnMount) return;
    (accountEmail ? buttonRef.current : inputRef.current)?.focus();
    // Once, when the panel first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = trpc.campaigns.joinWaitlist.useMutation({
    onSuccess: () => {
      setDone(true);
      setError(null);
      // The form goes away, so the confirmation takes the focus.
      requestAnimationFrame(() => statusRef.current?.focus());
    },
    onError: () => setError(FOLLOW.error),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (accountEmail) {
      join.mutate({ email: accountEmail });
      return;
    }
    const value = email.trim();
    if (!isEmailLike(value)) {
      setError(FOLLOW.invalidEmail);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    join.mutate({ email: value });
  };

  const dark = tone === "dark";
  const text = dark ? "text-white/80" : "text-[#1a472a]/85";
  const body = accountEmail ? FOLLOW.seasonBodySignedIn(accountEmail) : bodyWhenSignedOut ? FOLLOW.seasonBody : null;
  const errorClass = dark ? "text-sm font-medium text-[#ffb4a8]" : "text-sm font-medium text-red-700";

  return (
    <div className={dark ? "max-w-md mx-auto" : ""}>
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={done
          ? `flex items-start gap-2 text-sm font-medium outline-none ${dark ? "justify-center text-[#7dd87d]" : "text-[#1a472a]"}`
          : "sr-only"}
      >
        {done && <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${dark ? "" : "text-[#4a7c59]"}`} aria-hidden="true" />}
        {done ? FOLLOW.seasonDone : ""}
      </p>
      {!done && (
        <form noValidate onSubmit={submit} className="space-y-2">
          {lead && <p className={`text-sm ${text}`}>{lead}</p>}
          {/* break-words: a long account address must not push the page sideways at 375px. */}
          {body && <p className={`text-sm break-words ${text} ${dark ? "mb-3" : ""}`}>{body}</p>}
          {accountEmail ? (
            <Button
              ref={buttonRef}
              type="submit"
              disabled={join.isPending}
              className={dark
                ? "min-h-11 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-semibold"
                : "min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white"}
            >
              {join.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : null}
              {FOLLOW.seasonSignedIn}
            </Button>
          ) : (
            <>
              <label
                htmlFor={inputId}
                className={`block text-sm font-semibold ${dark ? "text-white text-left" : "text-[#1a472a]"}`}
              >
                {FOLLOW.emailLabel}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  ref={inputRef}
                  id={inputId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={dark
                    ? "bg-white/10 border-white/30 text-white placeholder:text-white/70"
                    : "bg-white border-[#4a7c59]/40"}
                />
                <Button
                  type="submit"
                  disabled={join.isPending}
                  className={dark
                    ? "min-h-11 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-semibold whitespace-nowrap"
                    : "min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white whitespace-nowrap"}
                >
                  {join.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : null}
                  {FOLLOW.seasonSubmit}
                </Button>
              </div>
            </>
          )}
          {error && (
            <p id={errorId} role="alert" className={`${errorClass} ${dark ? "text-left" : ""}`}>{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
