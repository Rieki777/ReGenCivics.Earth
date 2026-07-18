/**
 * Compose to Publish (Harvest Phase 5): the compose box at the top of
 * /admin-create and the staged Publication review screen.
 *
 * The staging rules the UI enforces visually (the server enforces them for
 * real): every surface has its own Approve, publish only unlocks after
 * approval, the review screen shows everything before anything fires, the
 * article goes out as a hidden preview first, and email routes to the
 * hardened send on the newsletter draft.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, PenLine, Sparkles, Check, Globe, ImagePlus, ExternalLink, Undo2 } from "lucide-react";

const SURFACE_LABEL: Record<string, string> = {
  site: "Article on the site",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  threads_x: "Threads / X",
  email: "Email announcement",
};

export function ComposeBox({ onComposed }: { onComposed: (publicationId: number) => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ ideas: Array<{ id: number; title: string }>; sourceRefs: string[] } | null>(null);
  const composePreview = trpc.harvest.composePreview.useMutation();
  const compose = trpc.harvest.compose.useMutation();

  return (
    <div className="rounded-2xl border-2 border-[#1a472a]/30 bg-white p-4 space-y-2">
      <p className="text-sm font-semibold text-[#1a472a] flex items-center gap-1.5"><PenLine className="w-4 h-4 text-[#2d5a3d]" /> Compose</p>
      <Textarea value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }}
        placeholder="Drop an idea. First line becomes the working title. It fans out into an article, social posts, and an optional email, grounded in your own notes."
        className="min-h-[100px] text-sm bg-white text-[#1a472a] placeholder:text-[#4a7c59] rounded-xl border border-[#1a472a]/25 focus-visible:ring-[#4a7c59]" />
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="h-9 rounded-lg border-[#1a472a]/30 text-[#1a472a]"
          disabled={text.trim().length < 10 || composePreview.isPending}
          onClick={async () => setPreview(await composePreview.mutateAsync({ text: text.trim() }))}>
          {composePreview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          What would it draw from?
        </Button>
        <Button size="sm" className="h-9 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]"
          disabled={text.trim().length < 10 || compose.isPending}
          onClick={async () => {
            const result = await compose.mutateAsync({ text: text.trim() });
            setText("");
            setPreview(null);
            onComposed(result.publicationId);
          }}>
          {compose.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {compose.isPending ? "Drafting the full package..." : "Compose the package"}
        </Button>
        {compose.isError && <p className="text-xs text-red-700">{compose.error.message}</p>}
      </div>
      {preview && (
        <div className="text-xs text-[#1a472a] border-t border-[#1a472a]/10 pt-2">
          {preview.ideas.length > 0 ? (
            <>
              <p className="font-semibold mb-1">Drawing from {preview.ideas.length} related idea{preview.ideas.length === 1 ? "" : "s"} ({preview.sourceRefs.length} raw sources):</p>
              {preview.ideas.map((i) => <p key={i.id}>· {i.title}</p>)}
            </>
          ) : (
            <p>No related vault material found; it will draft from your composed words alone.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TargetRow({ publicationId, target, item, onChanged }: {
  publicationId: number;
  target: { id: number; surface: string; status: string; externalUrl: string | null };
  item: { id: number; body: string | null; status: string } | undefined;
  onChanged: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const approve = trpc.harvest.approveTarget.useMutation();
  const publish = trpc.harvest.publishTarget.useMutation();
  const needsProfile = !["site", "email"].includes(target.surface);
  const statusColor = target.status === "published" ? "bg-[#4a7c59] text-white"
    : target.status === "approved" ? "bg-amber-100 text-amber-900"
    : target.status === "failed" ? "bg-red-100 text-red-800"
    : "bg-[#1a472a]/10 text-[#1a472a]";

  return (
    <div className="rounded-xl border border-[#1a472a]/20 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-[#1a472a]">{SURFACE_LABEL[target.surface] ?? target.surface}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{target.status}</span>
        {target.externalUrl && !target.externalUrl.startsWith("buffer:") && (
          <a href={target.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-[#2d5a3d] hover:underline inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> view
          </a>
        )}
        <span className="flex-1" />
        {target.status === "draft" && (
          <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs border-[#1a472a]/30 text-[#1a472a]" disabled={approve.isPending || !item?.body}
            onClick={async () => { await approve.mutateAsync({ publicationId, surface: target.surface as never }); onChanged(); }}>
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
        )}
        {target.status === "approved" && target.surface !== "email" && (
          <Button size="sm" className="h-7 rounded-lg text-xs bg-[#1a472a] hover:bg-[#2d5a3d]" disabled={publish.isPending || (needsProfile && !profileId)}
            onClick={async () => {
              const result = await publish.mutateAsync({
                publicationId,
                surface: target.surface as never,
                ...(target.surface === "site" ? { makePublic: true } : {}),
                ...(needsProfile ? { profileId } : {}),
              });
              setNote(result.note ?? null);
              onChanged();
            }}>
            {publish.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3 mr-1" />} Publish
          </Button>
        )}
      </div>
      {item?.body && <p className="text-xs text-[#2d5a3d] line-clamp-2">{item.body.slice(0, 200)}</p>}
      {target.surface === "email" && target.status !== "published" && (
        <p className="text-[11px] text-[#2d5a3d]">Email only goes out through the hardened send: edit the newsletter draft below, then Preview email send.</p>
      )}
      {target.surface === "site" && target.status === "approved" && (
        <p className="text-[11px] text-[#2d5a3d]">First publish creates a hidden preview at a private URL; publishing again makes it public (voice grader must pass).</p>
      )}
      {needsProfile && target.status === "approved" && (
        <input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Buffer profile id for this channel"
          className="w-full text-xs text-[#1a472a] placeholder:text-[#4a7c59] rounded-lg border border-[#1a472a]/25 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4a7c59]" maxLength={64} />
      )}
      {note && <p className="text-[11px] text-[#2d5a3d]">{note}</p>}
      {publish.isError && <p className="text-[11px] text-red-700">{publish.error.message}</p>}
    </div>
  );
}

export function PublicationReview({ publicationId }: { publicationId: number }) {
  const review = trpc.harvest.publicationReview.useQuery({ publicationId }, { retry: false });
  const generateImages = trpc.harvest.generateImages.useMutation();
  const chooseImage = trpc.harvest.chooseImage.useMutation();
  const unpublish = trpc.harvest.unpublishArticle.useMutation();
  const utils = trpc.useUtils();
  const onChanged = () => {
    void utils.harvest.publicationReview.invalidate({ publicationId });
    void utils.harvest.listFeed.invalidate();
  };

  if (review.isLoading) return <p className="text-xs text-[#2d5a3d] py-2"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Loading publication...</p>;
  if (!review.data) return null;
  const { publication, targets, items, images, article } = review.data;

  return (
    <div className="rounded-2xl border-2 border-[#1a472a]/25 bg-[#f8f5f0] p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-[#1a472a]">Publication: {publication.title}</p>
        <Badge variant="outline" className="text-[10px] border-[#1a472a]/30 text-[#2d5a3d]">{publication.status}</Badge>
        {article?.status === "public" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-800" disabled={unpublish.isPending}
            onClick={async () => { await unpublish.mutateAsync({ publicationId }); onChanged(); }}>
            <Undo2 className="w-3 h-3 mr-1" /> Unpublish article
          </Button>
        )}
      </div>
      <p className="text-xs text-[#2d5a3d]">Everything below goes out only after you approve it, surface by surface. Edit any draft in the Drafts tier first; the texts here are those same items.</p>

      <div className="space-y-2">
        {targets.map((target) => (
          <TargetRow key={target.id} publicationId={publicationId} target={target}
            item={items.find((i) => i.id === target.itemId) as { id: number; body: string | null; status: string } | undefined}
            onChanged={onChanged} />
        ))}
      </div>

      <div className="border-t border-[#1a472a]/10 pt-2 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-[#1a472a] uppercase tracking-wide">Images</p>
          {(["hero", "inline"] as const).map((slot) => (
            <Button key={slot} size="sm" variant="outline" className="h-7 rounded-lg text-xs border-[#1a472a]/30 text-[#1a472a]"
              disabled={generateImages.isPending}
              onClick={async () => { await generateImages.mutateAsync({ publicationId, slot }); onChanged(); }}>
              <ImagePlus className="w-3 h-3 mr-1" /> {slot} options
            </Button>
          ))}
          {generateImages.isError && <p className="text-[11px] text-red-700">{generateImages.error.message}</p>}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {images.map((image) => (
              <button key={image.id} className={`relative rounded-lg overflow-hidden border-2 ${image.chosen ? "border-[#4a7c59]" : "border-transparent hover:border-[#1a472a]/30"}`}
                onClick={async () => { await chooseImage.mutateAsync({ imageId: image.id }); onChanged(); }}
                title={image.altText}>
                <img src={image.url} alt={image.altText} className="w-full h-24 object-cover" loading="lazy" />
                <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white">{image.slot}{image.chosen ? " · chosen" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
