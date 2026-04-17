/**
 * SubmitToDAOModal
 *
 * Opens when a player clicks "Submit Proposal on DAO" on a quest card.
 * Asks for their video/article URL, then creates a Hypha Bridge record and
 * redirects them to /bridge/hypha/:key where they review the pre-filled
 * proposal before continuing to Hypha.
 *
 * If they don't have a URL yet, we show an encouraging message and close.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { X, ExternalLink, Link2, Leaf, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface SubmitToDAOModalProps {
  isOpen: boolean;
  onClose: () => void;
  questId: string;
  questTitle: string;
  questDescription: string;
  questDeliverable: string;
  regenReward: number;
  leadImageUrl?: string;
}

export function SubmitToDAOModal({
  isOpen,
  onClose,
  questId,
  questTitle,
  questDescription,
  questDeliverable,
  regenReward,
  leadImageUrl,
}: SubmitToDAOModalProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [noUrlYet, setNoUrlYet] = useState(false);

  const createBridge = trpc.hyphaBridge.createFromQuest.useMutation({
    onSuccess(data) {
      onClose();
      navigate(data.bridgeUrl.replace(window.location.origin, ""));
    },
  });

  if (!isOpen) return null;

  const isValidUrl = (() => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  const showError = touched && url.length > 0 && !isValidUrl;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setNoUrlYet(true);
      return;
    }
    if (!isValidUrl) {
      setTouched(true);
      return;
    }
    if (!user) return;

    createBridge.mutate({
      questId,
      questTitle,
      questDescription,
      questDeliverable,
      regenReward,
      deliverableUrl: url.trim(),
      ...(leadImageUrl ? { leadImageUrl } : {}),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[#4a7c59]" />
            <h2 className="font-bold text-[#1a472a] text-lg">Submit to the DAO</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Quest summary */}
          <div className="mb-5 p-3 bg-[#f0ebe3] rounded-xl text-sm">
            <p className="font-semibold text-[#1a472a]">{questTitle}</p>
            <p className="text-[#1a472a]/60 mt-0.5 text-xs">
              +{regenReward} $ReGen + 1 RGVoice on approval
            </p>
          </div>

          {noUrlYet ? (
            /* No URL state */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-[#1a472a] mb-2">Come back when you have your link</h3>
              <p className="text-sm text-gray-600 mb-4">
                Finish your video or article first, post it somewhere (YouTube,
                a blog, Notion, anywhere public), then come back here and we'll
                copy everything over for you so submitting to the DAO takes
                about 30 seconds.
              </p>
              <button
                onClick={() => { setNoUrlYet(false); setUrl(""); }}
                className="text-sm text-[#4a7c59] hover:underline"
              >
                I do have a link, let me try again
              </button>
            </div>
          ) : (
            /* URL input form */
            <form onSubmit={handleSubmit}>
              <label className="block mb-1.5 text-sm font-semibold text-[#1a472a]">
                Your video or article URL
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Paste the link to your deliverable. We'll copy it into your
                proposal so you only need to click Publish on Hypha.
              </p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setTouched(true); }}
                  placeholder="https://youtube.com/watch?v=..."
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 transition-colors ${
                    showError
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                  autoFocus
                />
              </div>
              {showError && (
                <p className="mt-1.5 text-xs text-red-600">
                  That doesn't look like a valid URL. Make sure it starts with https://
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={createBridge.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-[#1a472a] hover:bg-[#0f2d1a] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {createBridge.isPending ? (
                    "Preparing your proposal..."
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Continue to Hypha
                    </>
                  )}
                </button>
                {createBridge.isError && (
                  <p className="text-xs text-red-600 text-center">
                    Something went wrong. Try again or{" "}
                    <a
                      href="https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      go to Hypha directly
                    </a>
                    .
                  </p>
                )}
                <p className="text-center text-xs text-gray-400">
                  Not logged in?{" "}
                  <a
                    href="https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a7c59] hover:underline"
                  >
                    Go to Hypha directly
                  </a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
 