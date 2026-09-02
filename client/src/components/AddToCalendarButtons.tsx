/**
 * Google Calendar + Apple/Outlook add-to-calendar pair.
 * Markup matches the Next Session card on /schedule.
 */
export function AddToCalendarButtons({
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
        className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285f4"/>
          <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Google Calendar
      </a>
      <a
        href={appleUrl}
        {...(appleDownload ? { download: appleDownload } : {})}
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
        </svg>
        Apple/Outlook
      </a>
    </div>
  );
}
