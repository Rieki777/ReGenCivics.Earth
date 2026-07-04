/**
 * SendGratitudeModal
 *
 * Footer-anchored "Send gratitude" flow. Opens a modal that:
 *   1. Takes a typed query and calls `trpc.gratitude.searchUsers` to find
 *      candidate recipients (by handle, name, or displayName).
 *   2. Lets the sender pick one, then write a reason (3 to 500 chars).
 *   3. Submits via `trpc.gratitude.send` with sourceType "profile" so the
 *      server-side duplicate guard does not collapse multiple direct
 *      gratitudes against each other.
 *
 * Signed-out users are redirected to the login URL (same pattern as
 * GratitudeButton).
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Search, Send, ArrowLeft, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const MIN_QUERY = 2;
const MAX_QUERY = 40;
const MIN_MESSAGE = 3;
const MAX_MESSAGE = 500;

type Recipient = {
  id: number;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SendGratitudeModal({ open, onOpenChange }: Props) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Debounce the search query so we don't hammer the server on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const searchEnabled =
    open &&
    isAuthenticated &&
    !recipient &&
    debouncedQuery.length >= MIN_QUERY &&
    debouncedQuery.length <= MAX_QUERY;

  const searchResults = trpc.gratitude.searchUsers.useQuery(
    { query: debouncedQuery },
    { enabled: searchEnabled, staleTime: 15_000 }
  );

  const sendMutation = trpc.gratitude.send.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
      // Refresh the Gratitude tab live: power meter, per-person share,
      // full-power count, and the Sent journal all change on send.
      utils.gratitude.myOverview.invalidate();
      utils.gratitude.myJournal.invalidate();
      window.setTimeout(() => {
        setSent(false);
        setRecipient(null);
        setQuery("");
        setDebouncedQuery("");
        onOpenChange(false);
      }, 1600);
    },
  });

  // Focus the search input when the modal opens, or the message box once a
  // recipient has been picked.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      if (recipient) messageRef.current?.focus();
      else searchInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [open, recipient]);

  // Reset state whenever the modal closes so opening it again is a clean slate.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setDebouncedQuery("");
    setRecipient(null);
    setMessage("");
    setSent(false);
    sendMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sendMutation is stable enough; including it causes extra resets
  }, [open]);

  function handleTriggerAuth() {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return true;
    }
    return false;
  }

  function handleSubmit() {
    if (handleTriggerAuth()) return;
    if (!recipient?.handle) return;
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE) return;
    sendMutation.mutate({
      recipientHandle: recipient.handle,
      message: trimmed,
      sourceType: "profile",
    });
  }

  const results = searchResults.data ?? [];
  const searchErrored = Boolean(searchResults.error);
  const sendError = sendMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0d2818] border border-[#7dd87d]/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#7dd87d]">
            <Sparkles className="w-4 h-4" />
            Send gratitude
          </DialogTitle>
          <DialogDescription className="text-white/70 text-sm">
            Gratitude is how we distribute appreciation in the Game. Pick
            someone who has shown up for you and tell them why.
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-6 text-center text-sm text-white/80">
            <p className="mb-4">Sign in to send gratitude.</p>
            <Button
              type="button"
              onClick={() => {
                // Preserve where the user was so OAuth lands them back
                // on the same page after sign-in instead of "/".
                const returnTo = window.location.pathname + window.location.search;
                sessionStorage.setItem("returnTo", returnTo);
                window.location.href = getLoginUrl(returnTo);
              }}
              className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] font-semibold"
            >
              Sign in
            </Button>
          </div>
        ) : sent ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-amber-300" />
            </div>
            <p className="text-amber-300 font-semibold">Sent to @{recipient?.handle}</p>
            <p className="text-white/60 text-xs mt-1">They will see it in their profile.</p>
          </div>
        ) : !recipient ? (
          <div className="space-y-3">
            <label className="block">
              <span className="sr-only">Search for a person by name or handle</span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or handle..."
                  maxLength={MAX_QUERY}
                  className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/70 focus-visible:ring-[#7dd87d]/40"
                />
              </div>
            </label>

            <div className="min-h-[9rem] max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03]">
              {debouncedQuery.length < MIN_QUERY ? (
                <p className="text-xs text-white/70 p-4 text-center">
                  Type at least {MIN_QUERY} characters to start searching.
                </p>
              ) : searchResults.isLoading ? (
                <p className="text-xs text-white/70 p-4 text-center inline-flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                </p>
              ) : searchErrored ? (
                <p className="text-xs text-red-400 p-4 text-center">
                  Could not search right now. Try again in a moment.
                </p>
              ) : results.length === 0 ? (
                <p className="text-xs text-white/70 p-4 text-center">
                  No one matches "{debouncedQuery}". Try a different spelling or
                  their @handle.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {results.map((r) => {
                    const label = r.displayName || r.name || r.handle || "Unnamed";
                    const initials = label.trim().slice(0, 2).toUpperCase();
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setRecipient(r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#7dd87d]/10 focus-visible:bg-[#7dd87d]/10 outline-none"
                        >
                          <Avatar className="w-8 h-8">
                            {r.avatarUrl ? (
                              <AvatarImage src={r.avatarUrl} alt="" />
                            ) : null}
                            <AvatarFallback className="bg-[#1a472a] text-[#7dd87d] text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white font-medium truncate">
                              {label}
                            </span>
                            {r.handle ? (
                              <span className="block text-[11px] text-white/70 truncate">
                                @{r.handle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-[#7dd87d]/30 bg-[#7dd87d]/5 px-3 py-2">
              <Avatar className="w-9 h-9">
                {recipient.avatarUrl ? <AvatarImage src={recipient.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-[#1a472a] text-[#7dd87d] text-xs">
                  {(recipient.displayName || recipient.name || recipient.handle || "??")
                    .trim()
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-white font-medium truncate">
                  {recipient.displayName || recipient.name || recipient.handle}
                </span>
                {recipient.handle ? (
                  <span className="block text-[11px] text-white/70 truncate">
                    @{recipient.handle}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => setRecipient(null)}
                className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Change
              </button>
            </div>

            <label className="block">
              <span className="text-xs text-white/70 mb-1 block">
                Your reason for gratitude
              </span>
              <textarea
                ref={messageRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are you grateful for?"
                rows={4}
                maxLength={MAX_MESSAGE}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/70 outline-none focus:border-[#7dd87d]/50 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-white/70">
                  {message.length}/{MAX_MESSAGE}
                </span>
                <span className="text-[10px] text-white/70">
                  {message.trim().length < MIN_MESSAGE
                    ? `At least ${MIN_MESSAGE} characters`
                    : "Looks good"}
                </span>
              </div>
            </label>

            {sendError ? (
              <p className="text-red-400 text-xs" role="alert">
                {sendError}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white/70 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={message.trim().length < MIN_MESSAGE || sendMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#1a472a] font-semibold disabled:opacity-50"
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send gratitude
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
