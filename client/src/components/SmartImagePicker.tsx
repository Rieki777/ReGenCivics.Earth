/**
 * SmartImagePicker - Site-wide single-image picker.
 *
 * Three modes:
 *   Upload  - drag-and-drop or click to browse
 *   Generate - AI image generation (Flux-1-Schnell), up to 3 tries per mount
 *   URL     - paste a direct link
 *
 * Adapts to light or dark backgrounds via the `theme` prop.
 * Returns a single URL string via onChange.
 */
import { useState, useCallback, useRef } from "react";
import {
  Upload, Sparkles, Link2, X, Loader2,
  Image as ImageIcon, Wand2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { resolveAssetUrl } from "@/lib/utils";

type Mode = "upload" | "generate" | "url";
type Theme = "light" | "dark";

interface SmartImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  /** Tunes the AI prompt style */
  context?: "forum" | "quest" | "campaign" | "blog" | "video" | "profile" | "default";
  /** Label shown above the picker */
  label?: string;
  /** Max AI generations per mount */
  maxGenerations?: number;
  /** Visual theme. Default "dark". */
  theme?: Theme;
  /** Preview shape */
  shape?: "square" | "circle";
  /** Hide the Generate tab entirely (e.g. for admin-only contexts) */
  hideGenerate?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Theme-aware class maps
function t(theme: Theme) {
  const dark = theme === "dark";
  return {
    label: dark ? "text-white/60" : "text-[#1a472a]/80",
    tabBg: dark ? "bg-white/5 border-white/10" : "bg-[#f0f7f0] border-[#e8e4de]",
    tabActive: "bg-[#7dd87d]/20 text-[#7dd87d]",
    tabInactive: dark ? "text-white/70 hover:text-white/70" : "text-[#1a472a]/80 hover:text-[#1a472a]/70",
    dropzone: dark ? "border-white/20 hover:border-white/40 bg-white/5" : "border-[#e8e4de] hover:border-[#7dd87d]/50 bg-[#f8f5f0]",
    dropzoneActive: "border-[#7dd87d] bg-[#7dd87d]/10",
    dropIcon: dark ? "text-white/70" : "text-[#1a472a]/25",
    dropText: dark ? "text-white/60" : "text-[#1a472a]/80",
    input: dark
      ? "bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:ring-[#7dd87d]/50"
      : "bg-white border-[#e8e4de] text-[#1a472a] placeholder:text-[#1a472a]/75 focus:ring-[#7dd87d]/50 focus:border-[#7dd87d]",
    secondaryBtn: dark
      ? "bg-white/10 text-white hover:bg-white/20 border-white/20"
      : "bg-[#f0f7f0] text-[#1a472a] hover:bg-[#e8e4de] border-[#e8e4de]",
    hint: dark ? "text-white/70" : "text-[#1a472a]/80",
    error: "text-red-500 text-xs",
    previewBorder: dark ? "border-white/20" : "border-[#e8e4de]",
    genCounter: dark ? "text-white/70" : "text-[#1a472a]/80",
  };
}

export function SmartImagePicker({
  value,
  onChange,
  context = "default",
  label,
  maxGenerations = 3,
  theme = "dark",
  shape = "square",
  hideGenerate = false,
}: SmartImagePickerProps) {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<Mode>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [genPrompt, setGenPrompt] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const c = t(theme);

  const uploadMutation = trpc.files.upload.useMutation();
  const generateMutation = trpc.images.generate.useMutation();

  const showGenerate = !hideGenerate && isAuthenticated;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileData: base64,
        contentType: file.type,
      });
      onChange(result.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Try a smaller file or different format.");
    } finally {
      setUploading(false);
    }
  }, [onChange, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = useCallback(async () => {
    if (!genPrompt.trim() || genCount >= maxGenerations || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        context,
        title: genPrompt.trim(),
      });
      onChange(result.url);
      setGenCount(prev => prev + 1);
    } catch (err: any) {
      setError(err?.message || "Generation failed. Try again with a different description.");
    } finally {
      setGenerating(false);
    }
  }, [genPrompt, genCount, maxGenerations, generating, context, onChange, generateMutation]);

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http")) {
      setError("Enter a full URL starting with http.");
      return;
    }
    setError(null);
    onChange(trimmed);
    setUrlInput("");
  }, [urlInput, onChange]);

  const clear = () => { onChange(""); setError(null); };

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  // Preview state: image is selected
  if (value) {
    return (
      <div className="space-y-2">
        {label && <p className={`text-xs font-medium ${c.label}`}>{label}</p>}
        <div className="relative inline-block group">
          <img
            src={resolveAssetUrl(value)}
            alt="Selected image"
            className={`w-24 h-24 ${shapeClass} object-cover border-2 ${c.previewBorder} transition-opacity group-hover:opacity-80`}
            width={96}
            height={96}
          />
          <button
            onClick={clear}
            className={`absolute -top-2 -right-2 w-6 h-6 ${shape === "circle" ? "rounded-full" : "rounded-md"} bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100`}
            aria-label="Remove image"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <p className={`text-xs font-medium ${c.label}`}>{label}</p>}

      {/* Mode tabs */}
      <div className={`inline-flex gap-0.5 rounded-lg p-0.5 border ${c.tabBg}`}>
        {([
          { key: "upload" as Mode, icon: Upload, label: "Upload", show: true },
          { key: "generate" as Mode, icon: Sparkles, label: "Generate", show: showGenerate },
          { key: "url" as Mode, icon: Link2, label: "URL", show: true },
        ]).filter(tab => tab.show).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setMode(tab.key); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === tab.key ? c.tabActive : c.tabInactive
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {mode === "upload" && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop an image here or click to browse"
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            dragActive ? c.dropzoneActive : c.dropzone
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-[#7dd87d] animate-spin" />
              <p className={`text-xs ${c.dropText}`}>Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className={`w-6 h-6 ${c.dropIcon}`} />
              <p className={`text-xs ${c.dropText}`}>Drop an image here, or click to browse</p>
              <p className={`text-[10px] ${c.hint}`}>JPG, PNG, WebP, GIF. Max 10 MB.</p>
            </>
          )}
        </div>
      )}

      {/* Generate */}
      {mode === "generate" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={genPrompt}
              onChange={e => setGenPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="Describe the image you want..."
              className={`flex-1 rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 ${c.input}`}
              maxLength={200}
              disabled={generating}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!genPrompt.trim() || generating || genCount >= maxGenerations}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7dd87d] text-[#1a472a] font-semibold text-sm hover:bg-[#9de89d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {generating ? "Creating..." : "Generate"}
            </button>
          </div>

          {/* Generation counter */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: maxGenerations }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < genCount ? "bg-[#7dd87d]" : theme === "dark" ? "bg-white/15" : "bg-[#1a472a]/10"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs ${c.genCounter}`}>
              {genCount >= maxGenerations
                ? "All generations used. Upload or paste a URL instead."
                : `${maxGenerations - genCount} generation${maxGenerations - genCount === 1 ? "" : "s"} remaining`}
            </p>
          </div>
        </div>
      )}

      {/* URL */}
      {mode === "url" && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleUrlSubmit(); }}
            placeholder="https://example.com/image.webp"
            className={`flex-1 rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 ${c.input}`}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 border ${c.secondaryBtn}`}
          >
            Use
          </button>
        </div>
      )}

      {error && <p className={c.error}>{error}</p>}
    </div>
  );
}
