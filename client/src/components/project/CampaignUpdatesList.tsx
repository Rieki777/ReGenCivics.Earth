import { BookOpen } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";

export type CampaignUpdateRow = {
  id: number;
  updateNumber: number;
  title: string;
  body: string;
  imageUrls?: unknown;
  publishedAt?: string | Date | null;
};

/**
 * The numbered updates journal for one campaign. Used on the campaign page
 * and on the project page, so an update reads the same in both places.
 */
export function CampaignUpdatesList({
  updates,
  id,
  emptyText = "No updates yet. Follow the campaign to hear when the first one lands.",
}: {
  updates: CampaignUpdateRow[] | undefined | null;
  id?: string;
  emptyText?: string;
}) {
  return (
    <div id={id} className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
        <BookOpen className="w-5 h-5 text-[#4a7c59]" />
        Updates ({updates?.length ?? 0})
      </h2>
      {!updates || updates.length === 0 ? (
        <p className="text-sm text-[#1a472a]/75">{emptyText}</p>
      ) : (
        <div className="space-y-6">
          {updates.map((update) => (
            <div key={update.id} className="border-l-3 border-[#7dd87d] pl-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-[#4a7c59] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {update.updateNumber}
                </span>
                <h3 className="font-bold text-[#1a472a] break-words min-w-0">{decodeBasicEntities(update.title)}</h3>
              </div>
              <p className="text-xs text-[#1a472a]/75 mb-2">
                {update.publishedAt ? new Date(update.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </p>
              <p className="text-sm text-[#1a472a]/80 whitespace-pre-line break-words">{decodeBasicEntities(update.body)}</p>
              {Array.isArray(update.imageUrls) && update.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {(update.imageUrls as string[]).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${update.title} photo ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
