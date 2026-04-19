import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Image, Wand2, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";

type ContentType = "forum" | "quest" | "campaign" | "blog" | "video" | "profile" | "default";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "campaign", label: "Campaign" },
  { value: "forum", label: "Forum Post" },
  { value: "quest", label: "Quest" },
  { value: "video", label: "Video Backdrop" },
  { value: "profile", label: "Profile" },
  { value: "default", label: "Default / Other" },
];

export function AdminImageStudio() {
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ publicUrl: string; replaced: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMut = trpc.imageStudio.generateVariations.useMutation({
    onSuccess(data) {
      setVariations(data.variations);
      setKeys(data.keys);
      setSelected(null);
      setResult(null);
      setError(null);
    },
    onError(err) {
      const msg = err.message;
      if (msg.includes("Failed to parse URL") || msg.includes("not configured") || msg.includes("IMAGE_GEN")) {
        setError("Image generation is not configured. Check that IMAGE_GEN_WORKER_URL is set in Railway (full URL with https://) and the Cloudflare Worker is deployed.");
      } else {
        setError(msg);
      }
    },
  });

  const applyMut = trpc.imageStudio.applyVariation.useMutation({
    onSuccess(data) {
      setResult(data);
      setVariations([]);
      setKeys([]);
      setSelected(null);
    },
    onError(err) {
      const msg = err.message;
      if (msg.includes("Failed to parse URL") || msg.includes("not configured") || msg.includes("IMAGE_GEN")) {
        setError("Image generation is not configured. Check that IMAGE_GEN_WORKER_URL is set in Railway (full URL with https://) and the Cloudflare Worker is deployed.");
      } else {
        setError(msg);
      }
    },
  });

  const handleGenerate = () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setError(null);
    setResult(null);
    generateMut.mutate({ mode, contentType, title: title.trim(), description: description || undefined, editUrl: editUrl || undefined, editPrompt: editPrompt || undefined, count: 4 });
  };

  const handleApply = () => {
    if (selected === null) { setError("Select a variation first"); return; }
    setError(null);
    const oldFilename = mode === "edit" && editUrl ? editUrl.split("/").pop() : undefined;
    applyMut.mutate({ selectedKey: keys[selected], allKeys: keys, contentType, title: title.trim(), oldFilename });
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isGenerating = generateMut.isPending;
  const isApplying = applyMut.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Image className="w-5 h-5 text-[#7dd87d]" />
        <h2 className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Image Studio
        </h2>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["create", "edit"] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setVariations([]); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[#1a472a] text-white"
                : "bg-[#f0ede8] text-[#1a472a] hover:bg-[#e8e4de]"
            }`}
          >
            {m === "create" ? "Create New" : "Edit Existing"}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="space-y-4 bg-[#f8f5f0] rounded-xl p-5 border border-[#e8e4de]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1a472a] mb-1">Content Type</label>
            <select
              value={contentType}
              onChange={e => setContentType(e.target.value as ContentType)}
              className="w-full border border-[#e8e4de] rounded-lg px-3 py-2 text-sm text-[#1a472a] bg-white focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40"
            >
              {CONTENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a472a] mb-1">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Topic or subject of the image"
              className="w-full border border-[#e8e4de] rounded-lg px-3 py-2 text-sm text-[#1a472a] bg-white focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1a472a] mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Additional context for the image prompt"
            className="w-full border border-[#e8e4de] rounded-lg px-3 py-2 text-sm text-[#1a472a] bg-white focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40"
          />
        </div>

        {mode === "edit" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#1a472a] mb-1">Existing Image URL</label>
              <input
                value={editUrl}
                onChange={e => setEditUrl(e.target.value)}
                placeholder="https://assets.regencivics.earth/..."
                className="w-full border border-[#e8e4de] rounded-lg px-3 py-2 text-sm text-[#1a472a] bg-white focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40 font-mono"
              />
              {editUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-[#e8e4de] h-32 bg-[#e8e4de]">
                  <img src={editUrl} alt="Current" className="w-full h-full object-cover" width={400} height={128} loading="lazy" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1a472a] mb-1">Edit Instructions</label>
              <input
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                placeholder="e.g. add children playing, make it feel like dusk, include a stream..."
                className="w-full border border-[#e8e4de] rounded-lg px-3 py-2 text-sm text-[#1a472a] bg-white focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/40"
              />
            </div>
          </>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || isApplying}
          className="flex items-center gap-2 bg-[#1a472a] hover:bg-[#2d5a3d] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating 4 variations…</>
          ) : (
            <><Wand2 className="w-4 h-4" /> Generate 4 Variations</>
          )}
        </button>
      </div>

      {/* Variations grid */}
      {(isGenerating || variations.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide mb-3">
            Click a variation to select it
          </p>
          <div className="grid grid-cols-2 gap-3">
            {isGenerating
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="aspect-video rounded-xl bg-[#e8e4de] animate-pulse flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#1a472a]/30 animate-spin" />
                  </div>
                ))
              : variations.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      selected === i
                        ? "border-[#7dd87d] ring-2 ring-[#7dd87d]/40 scale-[1.02]"
                        : "border-transparent hover:border-[#7dd87d]/50"
                    }`}
                  >
                    <img src={url} alt={`Variation ${i + 1}`} className="w-full h-full object-cover" width={400} height={400} loading="lazy" />
                    {selected === i && (
                      <div className="absolute top-2 right-2 bg-[#7dd87d] rounded-full p-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-2 text-white text-xs font-medium drop-shadow">
                      {i + 1}
                    </div>
                  </button>
                ))}
          </div>

          {selected !== null && !isGenerating && (
            <div className="mt-4">
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Apply Variation {selected + 1}</>
                )}
              </button>
              <p className="text-xs text-[#1a472a]/50 mt-1">
                Promotes to permanent R2 filename, deletes other variations{mode === "edit" ? ", and auto-replaces DB references" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-[#f0faf0] border border-[#7dd87d]/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#1a472a] font-semibold text-sm">
            <CheckCircle className="w-4 h-4 text-[#7dd87d]" />
            Image applied successfully
          </div>
          <div className="font-mono text-xs text-[#1a472a]/70 break-all flex items-center gap-2 flex-wrap">
            <span className="break-all">{result.publicUrl}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a href={result.publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 text-[#7dd87d]" />
              </a>
              <button onClick={handleCopy} className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors">
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
          {result.replaced > 0 && (
            <div className="text-xs text-[#1a472a]/60">
              Updated {result.replaced} database record{result.replaced !== 1 ? "s" : ""}
            </div>
          )}
          <div className="mt-2 rounded-lg overflow-hidden border border-[#7dd87d]/20 h-40">
            <img src={result.publicUrl} alt="Applied" className="w-full h-full object-cover" width={400} height={160} loading="lazy" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
