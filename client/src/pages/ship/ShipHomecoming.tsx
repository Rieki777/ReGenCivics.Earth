/**
 * /ship/log/:slug — the Homecoming recap page (SHIP_V5_FLYWHEEL §2). Every
 * completed voyage auto-compiles into a beautiful public page: crew, dates, log
 * entries with photos, seeds planted, stamps earned, a closing line in her
 * voice, and the Ship's Bell referral CTA baked into the footer.
 */
import { useRoute, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sprout, Stamp } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipImage, BookNowButton } from "./shipShared";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default function ShipHomecoming() {
  const [, params] = useRoute("/ship/log/:slug");
  const slug = params?.slug ?? "";
  const { data, isLoading } = trpc.ship.log.recap.useQuery({ slug }, { enabled: slug.length > 0 });

  if (isLoading) {
    return <PageWrapper><ShipSection><p className="text-muted-foreground">Turning the pages…</p></ShipSection></PageWrapper>;
  }
  if (!data) {
    return (
      <PageWrapper>
        <SEO title="Voyage not found" description="This voyage's page is private or not yet home." url={`/ship/log/${slug}`} />
        <ShipSection>
          <h1 className="text-2xl font-bold mb-2">This page hasn't come home yet</h1>
          <p className="text-foreground/80 mb-4">The voyage may still be sailing, or the crew kept it private.</p>
          <Link href="/ship/log"><Button className="bg-[#2f5d3a] hover:bg-[#264a2f]">The fleet's log</Button></Link>
        </ShipSection>
      </PageWrapper>
    );
  }

  const refUrl = data.referralHandle ? `/ship/book?ref=${encodeURIComponent(data.referralHandle)}` : "/ship/book";

  return (
    <PageWrapper>
      <SEO
        title={`${data.crewName}'s voyage`}
        description={`${data.crewName} sailed the ReGen Ship ${fmt(data.startDate)} to ${fmt(data.endDate)}, planting ${data.plantingCount} seeds along the way.`}
        url={`/ship/log/${data.slug}`}
      />
      <ShipSection>
        <ShipEyebrow>Homecoming</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.crewName}'s voyage</h1>
        <p className="text-foreground/70">Boarded {fmt(data.startDate)}, home {fmt(data.endDate)}.</p>

        <div className="flex flex-wrap gap-4 mt-5">
          <span className="inline-flex items-center gap-1.5 text-sm"><Sprout className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" /> {data.plantingCount} seeds planted</span>
          <span className="inline-flex items-center gap-1.5 text-sm"><Stamp className="w-4 h-4 text-[#8a6d3b]" aria-hidden="true" /> {data.stampCount} passport stamps</span>
        </div>
      </ShipSection>

      {data.entries.length > 0 && (
        <ShipSection className="pt-0">
          <div className="max-w-2xl space-y-6">
            {data.entries.map((e) => (
              <article key={e.id} className="rounded-2xl border bg-card overflow-hidden">
                {e.photoUrl && <img src={e.photoUrl} alt={e.title ?? "Voyage photo"} loading="lazy" className="w-full max-h-72 object-cover" />}
                <div className="p-5">
                  {e.dayNumber != null && <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Day {e.dayNumber}</div>}
                  {e.title && <h2 className="text-xl font-bold mb-2">{e.title}</h2>}
                  <p className="text-foreground/85 whitespace-pre-line">{e.content}</p>
                </div>
              </article>
            ))}
          </div>
        </ShipSection>
      )}

      <ShipSection className="pt-0">
        <div className="max-w-2xl rounded-2xl border border-[#ffd700]/50 bg-[#ffd700]/10 p-6 text-center">
          <p className="text-lg italic mb-4">{data.closingLine}</p>
          <BookNowButton size="lg" href={refUrl} />
          <p className="text-xs text-muted-foreground mt-3">
            <Link href="/ship/log" className="underline">See every voyage that has sailed her</Link>
          </p>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
