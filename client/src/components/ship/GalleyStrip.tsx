/**
 * The Galley strip for the Captain's Book (Galley spec section 6f). Shows this
 * voyage's hauls and favorite remixes so a crew's creative ideas become part of
 * their voyage story, with a link into the Galley and a one-tap way to submit a
 * favorite remix to the shared cookbook for review.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UtensilsCrossed, BookOpen, Sparkles, ChefHat } from "lucide-react";

export function GalleyStrip({ bookingId }: { bookingId?: number | null }) {
  const hauls = trpc.ship.galley.myHauls.useQuery(undefined, { retry: false });
  const remixes = trpc.ship.galley.myRemixes.useQuery(undefined, { retry: false });
  const publish = trpc.ship.galley.publishToCookbook.useMutation();
  const utils = trpc.useUtils();

  const voyageHauls = (hauls.data ?? []).filter((h) => !bookingId || h.bookingId === bookingId);
  const voyageRemixes = (remixes.data ?? []).filter((r) => !bookingId || r.bookingId === bookingId);

  async function submit(remixId: number, name: string) {
    try {
      await publish.mutateAsync({ remixId, visibility: "public" });
      await utils.ship.galley.myRemixes.invalidate();
      toast.success(`"${name}" sent to the cookbook for review.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit that remix.");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-[#b5651d]" aria-hidden="true" /> The Galley
        </h2>
        <Link href="/ship/galley" className="text-sm text-[#2f5d3a] dark:text-[#7dd87d] font-medium underline">Open the Galley</Link>
      </div>

      <p className="text-sm text-foreground/80 mb-4">
        {voyageHauls.length} {voyageHauls.length === 1 ? "haul" : "hauls"} logged this voyage. Cook what you gather, and
        your best dishes can join the ship's cookbook.
      </p>

      {voyageRemixes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No remixes yet. Log a market haul in the Galley and remix it into your first dish.</p>
      ) : (
        <div className="space-y-2">
          {voyageRemixes.slice(0, 8).map((r) => {
            const submitted = r.cookbookStatus !== "none";
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <span className="text-sm font-medium flex items-center gap-1.5 min-w-0">
                  {r.engine === "cook" ? <ChefHat className="w-4 h-4 text-[#b5651d] shrink-0" aria-hidden="true" /> : <Sparkles className="w-4 h-4 text-[#ffd700] shrink-0" aria-hidden="true" />}
                  <span className="truncate">{r.dishName}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-0 shrink-0"
                  disabled={submitted || publish.isPending}
                  onClick={() => void submit(r.id, r.dishName)}
                >
                  <BookOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  {r.cookbookStatus === "approved" ? "In the cookbook" : submitted ? "Under review" : "To cookbook"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
