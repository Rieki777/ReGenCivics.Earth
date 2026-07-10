/**
 * /ship/log - The public voyage log. Read-only. Every crew keeps daily entries,
 * seed plantings, and passport stamps, and those logs become the ongoing story
 * of the fleet.
 */
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { ScrollText } from "lucide-react";
import { ShipImage, ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ShipLog() {
  const q = trpc.ship.log.list.useQuery({});
  const entries = [...(q.data ?? [])].sort((a, b) => {
    const ta = new Date(a.createdAt as string | number | Date).getTime();
    const tb = new Date(b.createdAt as string | number | Date).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return (
    <PageWrapper>
      <SEO
        title="The Voyage Log"
        description="Every crew keeps a public log of daily entries, seed plantings, and passport stamps. Their logs become the story of the fleet."
        url="/ship/log"
      />

      <ShipNavRow current="/ship/log" />

      {/* Header image */}
      <ShipSection>
        <div className="aspect-[21/9] mb-8">
          <ShipImage
            name="ship-campfire-dusk.jpg"
            alt="A fire ring and chairs beside the ship at dusk."
            className="h-full"
          />
        </div>
        <ShipEyebrow>The voyage log</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-[#4a7c59] shrink-0" aria-hidden="true" />
          The story of the fleet
        </h1>
        <p className="max-w-3xl text-foreground/85">
          Every crew keeps a public log of daily entries, seed plantings, and passport stamps. Read together, those logs
          become the ongoing story of the fleet, one voyage handed to the next.
        </p>
      </ShipSection>

      {/* Entries */}
      <ShipSection className="pt-0">
        {q.isLoading ? (
          <p className="text-muted-foreground">Loading the log...</p>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#4a7c59]/40 bg-[#4a7c59]/5 p-10 text-center">
            <p className="text-lg font-medium mb-1">No entries yet.</p>
            <p className="text-muted-foreground">The first crews are about to sail.</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {entries.map((entry, i) => (
              <article
                key={(entry as { id?: string | number }).id ?? i}
                className="rounded-2xl border bg-card overflow-hidden"
              >
                {entry.photoUrl ? (
                  <div className="aspect-[16/9] w-full">
                    <img
                      src={entry.photoUrl}
                      alt={entry.title ?? "A photo from the voyage log."}
                      loading="lazy"
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                    {typeof entry.dayNumber === "number" ? (
                      <span className="uppercase tracking-widest text-xs font-semibold text-[#4a7c59]">
                        Day {entry.dayNumber}
                      </span>
                    ) : null}
                    {entry.title ? <h2 className="text-xl font-semibold">{entry.title}</h2> : null}
                  </div>
                  <p className="text-foreground/85 whitespace-pre-line">{entry.content}</p>
                  {formatDate(entry.createdAt) ? (
                    <p className="text-xs text-muted-foreground mt-3">{formatDate(entry.createdAt)}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </ShipSection>
    </PageWrapper>
  );
}
