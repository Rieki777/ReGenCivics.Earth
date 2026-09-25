/**
 * Post a numbered update to the campaign. Stewards only (campaigns.createUpdate
 * checks on the server). Account followers see it in their notifications;
 * email followers hear about it in the next letter from the ReGen Civics
 * team, which Rye sends from admin Outbound.
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PenLine } from "lucide-react";

export function CampaignUpdatesComposer({ campaignId, onPosted }: { campaignId: number; onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState("");

  const mutation = trpc.campaigns.createUpdate.useMutation({
    onSuccess: () => {
      toast.success("Update posted.");
      setTitle("");
      setBody("");
      setImages("");
      onPosted();
    },
    onError: (err) => toast.error(err.message || "Couldn't post the update. Try again."),
  });

  const publish = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("An update needs a title and a few words about what happened.");
      return;
    }
    const imageUrls = images.split(",").map((u) => u.trim()).filter((u) => u.length > 0);
    mutation.mutate({
      campaignId,
      title: title.trim(),
      body: body.trim(),
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  return (
    <section id="updates-composer" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <PenLine className="w-5 h-5 text-[#4a7c59]" />
        Post an update
      </h2>
      <p className="text-sm text-[#1a472a]/75 mb-4">
        Followers and contributors with an account see it in their notifications. Email followers hear about it in the next letter from the ReGen Civics team.
      </p>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="update-title">Title</Label>
          <Input
            id="update-title"
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The greenhouse frame is up"
            className="bg-white border-[#7dd87d]/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="update-body">What happened?</Label>
          <Textarea
            id="update-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell your contributors what their offers made possible."
            rows={4}
            className="bg-white border-[#7dd87d]/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="update-images">Photo links (optional, separated by commas)</Label>
          <Input
            id="update-images"
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder="https://... , https://..."
            className="bg-white border-[#7dd87d]/30"
          />
        </div>
        <Button
          onClick={publish}
          disabled={mutation.isPending || !title.trim() || !body.trim()}
          className="bg-[#4a7c59] hover:bg-[#1a472a] text-white"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting...</> : "Post update"}
        </Button>
      </div>
    </section>
  );
}
