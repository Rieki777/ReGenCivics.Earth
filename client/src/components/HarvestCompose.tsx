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
import { Loader2, PenLine, Sparkles, Check, Globe, ImagePlus, ExternalLink, Undo2, Copy } from "lucide-react";

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

type FactFlag = { claim: string; problem: string; severity: "block" | "warn" };

function TargetRow({ publicationId, target, item, onChanged }: {
  publicationId: number;
  target: {
    id: number; surface: string; status: string; externalUrl: string | null;
    verificationStatus?: string | null; verificationFlags?: unknown;
    firstComment?: string | null; weeklyNote?: string | null;
  };
  item: { id: number; body: string | null; status: string } | undefined;
  onChanged: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [firstCommentDraft, setFirstCommentDraft] = useState(target.firstComment ?? "");
  const [weeklyNoteDraft, setWeeklyNoteDraft] = useState(target.weeklyNote ?? "");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(item?.body ?? "");
  const [saved, setSaved] = useState(false);
  const unapprove = trpc.harvest.unapproveTarget.useMutation();
  // The same mutation the Drafts tier uses, so edits made here feed
  // voice-learning and reset the fact-check exactly as they do there.
  const editItem = trpc.harvest.editItem.useMutation();
  const approve = trpc.harvest.approveTarget.useMutation();
  const publish = trpc.harvest.publishTarget.useMutation();
  const verify = trpc.harvest.verifyTarget.useMutation();
  const updateFields = trpc.harvest.updateTargetFields.useMutation();
  const needsProfile = !["site", "email"].includes(target.surface);
  // The first comment is a social-surface tactic: the site and email have no
  // comment thread to put a link in.
  const takesFirstComment = !["site", "email"].includes(target.surface);

  // Fact-check state. Blocks are hard stops on approve; warns are for the eye.
  const flags: FactFlag[] = Array.isArray(target.verificationFlags) ? (target.verificationFlags as FactFlag[]) : [];
  const blocks = flags.filter((f) => f.severity === "block");
  const verification = target.verificationStatus ?? "unverified";
  const statusColor = target.status === "published" ? "bg-[#4a7c59] text-white"
    : target.status === "approved" ? "bg-amber-100 text-amber-900"
    : target.status === "failed" ? "bg-red-100 text-red-800"
    : "bg-[#1a472a]/10 text-[#1a472a]";

  return (
    <div className="rounded-xl border border-[#1a472a]/20 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-[#1a472a]">{SURFACE_LABEL[target.surface] ?? target.surface}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{target.status}</span>
        {item?.body && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            blocks.length > 0 ? "bg-red-100 text-red-800"
              : verification === "flagged" ? "bg-amber-100 text-amber-900"
              : verification === "passed" ? "bg-[#1a472a]/10 text-[#1a472a]"
              : "bg-[#f0ebe3] text-[#2d5a3d]"
          }`}>
            {blocks.length > 0 ? `${blocks.length} block${blocks.length > 1 ? "s" : ""}`
              : verification === "flagged" ? `${flags.length} to check`
              : verification === "passed" ? "facts checked"
              : "unverified"}
          </span>
        )}
        {target.externalUrl && !target.externalUrl.startsWith("buffer:") && (
          <a href={target.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-[#2d5a3d] hover:underline inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> view
          </a>
        )}
        <span className="flex-1" />
        {item?.body && target.status !== "published" && (
          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-[#2d5a3d]" disabled={verify.isPending}
            onClick={async () => { await verify.mutateAsync({ publicationId, surface: target.surface as never }); onChanged(); }}>
            {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            {verification === "unverified" ? "Verify" : "Re-verify"}
          </Button>
        )}
        {target.status === "draft" && (
          <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs border-[#1a472a]/30 text-[#1a472a]"
            disabled={approve.isPending || !item?.body || blocks.length > 0}
            title={blocks.length > 0 ? "Resolve the block-level fact flags first: edit the draft, then re-verify." : undefined}
            onClick={async () => { await approve.mutateAsync({ publicationId, surface: target.surface as never }); onChanged(); }}>
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
        )}
        {/* Approving is easy to do by accident. Undoing it should be too, right
            up until the thing is actually published. */}
        {target.status === "approved" && (
          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-[#2d5a3d]" disabled={unapprove.isPending}
            onClick={async () => { await unapprove.mutateAsync({ publicationId, surface: target.surface as never }); onChanged(); }}>
            <Undo2 className="w-3 h-3 mr-1" /> Un-approve
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
      {/* Click the preview to open the full draft and edit it in place. Saving
          goes through the same editItem the Drafts tier uses, so the second
          brain learns from the edit and verification resets itself. */}
      {item?.body && !open && (
        <button
          type="button"
          onClick={() => { setBodyDraft(item.body ?? ""); setOpen(true); }}
          className="w-full text-left text-xs text-[#2d5a3d] line-clamp-2 hover:text-[#1a472a]"
          title="Open the full draft to read and edit it"
        >
          {item.body.slice(0, 200)}
        </button>
      )}
      {item?.body && open && (
        <div className="space-y-2">
          <Textarea
            value={bodyDraft}
            onChange={(e) => { setBodyDraft(e.target.value); setSaved(false); }}
            className="min-h-[260px] text-xs leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#2d5a3d]">Saving teaches the voice loop. Was the edit:</span>
            {(["style", "content"] as const).map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant="outline"
                className="h-7 rounded-lg text-xs border-[#1a472a]/30 text-[#1a472a]"
                disabled={editItem.isPending || bodyDraft.trim() === "" || bodyDraft === item.body}
                onClick={async () => {
                  await editItem.mutateAsync({ itemId: item.id, body: bodyDraft, editKind: kind });
                  setSaved(true);
                  onChanged();
                }}
              >
                {editItem.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                mostly {kind}
              </Button>
            ))}
            <span className="flex-1" />
            {saved && <span className="text-[11px] text-[#1a472a]">Saved</span>}
            <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-[#2d5a3d]" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
      {/* Fact flags come before the draft preview's convenience: judgment first. */}
      {flags.length > 0 && (
        <div className={`rounded-lg border px-2 py-1.5 space-y-1 ${blocks.length > 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          {flags.map((f, i) => (
            <p key={i} className="text-[11px] leading-snug">
              <span className={`mr-1.5 px-1 rounded text-[10px] ${f.severity === "block" ? "bg-red-200 text-red-900" : "bg-amber-200 text-amber-900"}`}>{f.severity}</span>
              <span className="italic text-[#1a472a]">&ldquo;{f.claim}&rdquo;</span>
              <span className="text-[#2d5a3d]"> {f.problem}</span>
            </p>
          ))}
        </div>
      )}
      {/* The link lives here, not in the body: a URL in the post suppresses
          reach on LinkedIn and Instagram. Verified alongside the draft. */}
      {takesFirstComment && target.status !== "published" && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#2d5a3d] uppercase tracking-wide">First comment</span>
            <span className="text-[10px] text-[#2d5a3d]/80">the link goes here, not in the post</span>
            <span className="flex-1" />
            {firstCommentDraft.trim() && (
              <button
                type="button"
                className="text-[10px] text-[#2d5a3d] hover:underline inline-flex items-center gap-1"
                onClick={async () => {
                  await navigator.clipboard.writeText(firstCommentDraft);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <Textarea
            value={firstCommentDraft}
            onChange={(e) => setFirstCommentDraft(e.target.value)}
            onBlur={() => {
              if ((target.firstComment ?? "") !== firstCommentDraft) {
                updateFields.mutate(
                  { publicationId, surface: target.surface as never, firstComment: firstCommentDraft },
                  { onSuccess: onChanged },
                );
              }
            }}
            placeholder="Full write-up: https://..."
            className="min-h-[52px] text-xs"
          />
        </div>
      )}
      {/* The honest replacement for analytics, written after the fact. */}
      {target.status === "published" && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-[#2d5a3d] uppercase tracking-wide">Weekly note</span>
          <Textarea
            value={weeklyNoteDraft}
            onChange={(e) => setWeeklyNoteDraft(e.target.value)}
            onBlur={() => {
              if ((target.weeklyNote ?? "") !== weeklyNoteDraft) {
                updateFields.mutate(
                  { publicationId, surface: target.surface as never, weeklyNote: weeklyNoteDraft },
                  { onSuccess: onChanged },
                );
              }
            }}
            placeholder="Did this land, and why do you think so? One sentence."
            className="min-h-[44px] text-xs"
          />
        </div>
      )}
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
