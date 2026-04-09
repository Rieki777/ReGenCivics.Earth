/**
 * Hymn Book: community song submissions and seasonal vote.
 * Players submit one song per season, vote on submissions, and the
 * highest-voted song is added to the Hymn Book.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Music, ListMusic, Vote, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";

export default function HymnBook() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const list = trpc.songs.list.useQuery(undefined, { staleTime: 60_000 });
  const myVote = trpc.songs.myVote.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const submit = trpc.songs.submit.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
      setForm({ title: "", artist: "", audioUrl: "", description: "" });
      setSubmitted(true);
    },
  });
  const vote = trpc.songs.vote.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
      utils.songs.myVote.invalidate();
    },
  });

  const [form, setForm] = useState({ title: "", artist: "", audioUrl: "", description: "" });
  const [submitted, setSubmitted] = useState(false);

  return (
    <PageTransition>
      <SEO
        title="Hymn Book: Community Song Submissions"
        description="Submit your songs to add to the Hymns of the ReGeneration. Each season the highest voted community song joins the Hymn Book and the musician receives 3,333 $ReGen."
        image="/og/hymn-book.webp"
        url="/hymn-book"
      />
      <div className="min-h-screen bg-[#0d2818] text-white py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30 mb-4">
              <Music className="w-4 h-4 text-[#7dd87d]" />
              <span className="text-[#7dd87d] text-sm font-semibold">Hymns of the ReGeneration</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Add Your Voice
            </h1>
            <p className="text-white/85 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Submit your songs to add to the Hymns of the ReGeneration. Each season,
              the highest voted community song joins the Hymn Book. The musician
              receives <span className="text-[#7dd87d] font-semibold">3,333 $ReGen</span>.
            </p>
          </div>

          {/* Submission form */}
          <section id="add-your-voice" className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-12">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#7dd87d]" /> Submit your song
            </h2>
            <p className="text-white/60 text-sm mb-4">
              One submission per player per season. Host your audio anywhere public
              (SoundCloud, Bandcamp, your own site) and paste the link.
            </p>

            {!isAuthenticated ? (
              <p className="text-white/70 text-sm">
                <a href="/api/auth/login" className="text-[#7dd87d] underline">Sign in</a> to submit a song.
              </p>
            ) : submitted ? (
              <div className="flex items-center gap-2 text-[#7dd87d]">
                <CheckCircle2 className="w-5 h-5" />
                <span>Submission received. Good luck this season.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit.mutate({
                    title: form.title,
                    artist: form.artist || undefined,
                    audioUrl: form.audioUrl,
                    description: form.description || undefined,
                  });
                }}
                className="space-y-3"
              >
                <input
                  required
                  maxLength={200}
                  placeholder="Song title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-base text-white placeholder-white/60 focus:border-[#7dd87d] focus:outline-none"
                />
                <input
                  maxLength={200}
                  placeholder="Artist or contributor (optional)"
                  value={form.artist}
                  onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-base text-white placeholder-white/60 focus:border-[#7dd87d] focus:outline-none"
                />
                <input
                  required
                  type="url"
                  maxLength={500}
                  placeholder="Public audio link (https://...)"
                  value={form.audioUrl}
                  onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-base text-white placeholder-white/60 focus:border-[#7dd87d] focus:outline-none"
                />
                <textarea
                  maxLength={1000}
                  rows={3}
                  placeholder="A few words about the song (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-base text-white placeholder-white/60 focus:border-[#7dd87d] focus:outline-none"
                />
                {submit.error && (
                  <p className="text-red-300 text-sm">{submit.error.message}</p>
                )}
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#6bc86b] text-[#0d2818] font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
                >
                  {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                  Submit Song
                </button>
              </form>
            )}
          </section>

          {/* Submissions list / vote */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-[#7dd87d]" /> This season's submissions
            </h2>

            {list.isLoading ? (
              <p className="text-white/60">Loading…</p>
            ) : (list.data?.length ?? 0) === 0 ? (
              <p className="text-white/60">No submissions yet. Be the first.</p>
            ) : (
              <ul className="space-y-3">
                {list.data!.map((row) => {
                  const isMyVote = myVote.data?.submissionId === row.id;
                  return (
                    <li
                      key={row.id}
                      className={`bg-white/5 border rounded-2xl p-4 md:p-5 transition-colors ${
                        isMyVote ? "border-[#7dd87d]/60" : "border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{row.title}</p>
                          {row.artist && <p className="text-white/55 text-sm truncate">{row.artist}</p>}
                          {row.submittedByName && (
                            <p className="text-white/65 text-xs">submitted by {row.submittedByName}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[#7dd87d] font-bold tabular-nums">{row.voteCount}</p>
                          <p className="text-white/65 text-[10px] uppercase tracking-wider">votes</p>
                        </div>
                      </div>
                      {row.description && (
                        <p className="text-white/65 text-sm mb-3">{row.description}</p>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <a
                          href={row.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#7dd87d] hover:text-white"
                        >
                          <Music className="w-3.5 h-3.5" /> Listen
                        </a>
                        {isAuthenticated && (
                          <button
                            onClick={() => vote.mutate({ submissionId: row.id })}
                            disabled={vote.isPending || isMyVote}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                              isMyVote
                                ? "bg-[#7dd87d] text-[#0d2818] cursor-default"
                                : "bg-white/10 text-white hover:bg-[#7dd87d]/30"
                            }`}
                          >
                            <Vote className="w-3.5 h-3.5" />
                            {isMyVote ? "Your vote" : "Vote"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-white/65 text-xs text-center mt-6">
              One vote per player per season. You can move your vote at any time before the season closes.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
