import { useState } from "react";
import { Handshake, X, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VouchSectionProps {
  playerId: number;
  isOwnProfile: boolean;
}

export default function VouchSection({ playerId, isOwnProfile }: VouchSectionProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const vouchesQuery = trpc.playerProfiles.listVouches.useQuery(
    { playerId },
    { staleTime: 60 * 1000 }
  );
  const hasVouchedQuery = trpc.playerProfiles.hasVouched.useQuery(
    { playerId },
    { enabled: !!user && !isOwnProfile, staleTime: 60 * 1000 }
  );

  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");

  const vouchMutation = trpc.playerProfiles.vouchPlayer.useMutation({
    onSuccess: () => {
      utils.playerProfiles.listVouches.invalidate({ playerId });
      utils.playerProfiles.hasVouched.invalidate({ playerId });
      toast.success("Vouch recorded");
      setIsOpen(false);
      setNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const vouches = vouchesQuery.data ?? [];
  const alreadyVouched = hasVouchedQuery.data ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Handshake className="h-4 w-4" />
          Vouches ({vouches.length})
        </h3>

        {!isOwnProfile && user && !alreadyVouched && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
          >
            <Handshake className="h-3.5 w-3.5" />
            Vouch for this player
          </button>
        )}

        {!isOwnProfile && user && alreadyVouched && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-700/20 border border-green-700/40 px-3 py-1.5 text-xs text-green-300">
            <Check className="h-3.5 w-3.5" />
            You vouched
          </span>
        )}
      </div>

      {vouches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vouches.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-1 pr-3 py-1"
              title={v.note ?? ""}
            >
              {v.voucherAvatar ? (
                <img
                  src={v.voucherAvatar}
                  alt={v.voucherName ?? ""}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span className="h-6 w-6 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px] font-bold">
                  {(v.voucherName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs text-white/80">{v.voucherName ?? "Someone"}</span>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vouch for this player"
        >
          <div
            className="bg-[#0d2818] border border-white/10 rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-[#7dd87d]" />
                  Vouch for this player
                </h3>
                <p className="text-white/60 text-sm mt-1">
                  Tell others why you trust this person. Your vouch is public.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-sm text-white/80 mb-1.5">
              Why do you vouch for this person?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="We worked together on the Cascadia Commons harvest, and they followed through on everything they said they would."
              className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3 py-2 text-sm placeholder:text-white/60 outline-none focus:ring-1 focus:ring-[#7dd87d]/50 resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/70">{note.length} / 200</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-md text-sm text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!note.trim()) {
                      toast.error("Share a short note before vouching.");
                      return;
                    }
                    vouchMutation.mutate({ playerId, note: note.trim() });
                  }}
                  disabled={vouchMutation.isPending || !note.trim()}
                  className="px-4 py-2 rounded-md bg-[#7dd87d] text-[#0d2818] text-sm font-semibold hover:bg-[#9de89d] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {vouchMutation.isPending ? "Submitting…" : "Submit vouch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
