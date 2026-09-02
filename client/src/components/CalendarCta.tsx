import { CALENDAR_SUBSCRIBE_WEBCAL } from "@/lib/seasonEvents";

const subscribeClassName =
  "inline-flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-6 py-3 rounded-xl font-bold transition-colors text-base";

const addOnceClassName =
  "inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white/70 hover:text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border border-white/20";

export function CalendarSubscribeButton() {
  return (
    <a href={CALENDAR_SUBSCRIBE_WEBCAL} className={subscribeClassName}>
      Subscribe
    </a>
  );
}

function AddOnceButtons({
  googleUrl,
  appleUrl,
  appleDownload,
}: {
  googleUrl: string;
  appleUrl: string;
  appleDownload?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={addOnceClassName}
      >
        Google Calendar
      </a>
      <a
        href={appleUrl}
        {...(appleDownload ? { download: appleDownload } : {})}
        className={addOnceClassName}
      >
        Apple/Outlook
      </a>
    </div>
  );
}

/**
 * Subscribe (live ICS/webcal) is the primary CTA.
 * Google Calendar and Apple/Outlook one-shot adds stay under Add once.
 */
export function CalendarCta({
  googleUrl,
  appleUrl,
  appleDownload,
}: {
  googleUrl: string;
  appleUrl: string;
  appleDownload?: string;
}) {
  return (
    <div className="space-y-3">
      <CalendarSubscribeButton />
      <p className="text-white/60 text-xs">Live calendar. Times stay current if they change.</p>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1.5">Add once</p>
        <AddOnceButtons googleUrl={googleUrl} appleUrl={appleUrl} appleDownload={appleDownload} />
      </div>
    </div>
  );
}
