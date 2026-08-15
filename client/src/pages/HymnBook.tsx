/**
 * Hymn Book: community song submissions and seasonal vote.
 * Players submit one song per season, vote on submissions, and the
 * highest-voted song is added to the Hymn Book.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAudio, PLAYLIST } from "@/contexts/AudioContext";
import { Music, ListMusic, Loader2, Plus, CheckCircle2, Play, Pause, Vote, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import { ShareButton } from "@/components/ShareButton";
import { toSlug } from "@/utils/songSlug";
import { isIos } from "@/lib/platform";

export default function HymnBook() {
  const { isAuthenticated } = useAuth();
  const audio = useAudio();
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
  // Voting is optimistic: the tap moves the vote in the UI instantly, and we
  // roll back if the server disagrees. Before this, a failed vote (expired
  // session, network drop) did NOTHING visible, which read as "the Vote
  // button doesn't work".
  const vote = trpc.songs.vote.useMutation({
    onMutate: async ({ submissionId }) => {
      await Promise.all([utils.songs.list.cancel(), utils.songs.myVote.cancel()]);
      const prevList = utils.songs.list.getData(undefined);
      const prevVote = utils.songs.myVote.getData();
      const prevId = prevVote?.submissionId ?? null;
      utils.songs.myVote.setData(undefined, { submissionId });
      utils.songs.list.setData(undefined, (old) =>
        old?.map((r) =>
          r.id === submissionId
            ? { ...r, voteCount: r.voteCount + 1 }
            : r.id === prevId
              ? { ...r, voteCount: Math.max(0, r.voteCount - 1) }
              : r,
        ),
      );
      return { prevList, prevVote };
    },
    onError: (_err, _vars, rollback) => {
      if (rollback) {
        utils.songs.list.setData(undefined, rollback.prevList);
        utils.songs.myVote.setData(undefined, rollback.prevVote);
      }
    },
    onSettled: () => {
      utils.songs.list.invalidate();
      utils.songs.myVote.invalidate();
    },
  });

  const [form, setForm] = useState({ title: "", artist: "", audioUrl: "", description: "" });
  const [submitted, setSubmitted] = useState(false);

  // Deep-link handler: ?song=<slug> selects + plays the matching track
  // and scrolls to its row, so shared hymn links land on the right song.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = new URLSearchParams(window.location.search).get("song");
    if (!slug) return;
    const idx = PLAYLIST.findIndex((s) => toSlug(s.title) === slug);
    if (idx < 0) return;
    audio.playSong(idx);
    requestAnimationFrame(() => {
      const row = document.getElementById(`hymn-${slug}`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // Strip the query so a refresh doesn't re-trigger.
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageTransition>
      <SEO
        title="Hymn Book: Community Song Submissions"
        description="Submit your songs to add to the Hymns of the ReGeneration. Each season the highest voted community song joins the Hymn Book and the musician receives 3,333 $ReGen."
        image="/og/hymn-book.webp"
        url="/hymn-book"
      />
      {/* overflow-x-hidden + max-w-full guard the page against the
          NowPlayingPanel range inputs, long song titles, and any other
          inner child that could otherwise push past the viewport edge
          and produce a sideways scroll that hides the bottom-right FAB. */}
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0d2818] text-white py-16 px-4">
        <div className="container max-w-3xl mx-auto min-w-0">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30 mb-4">
              <Music className="w-4 h-4 text-[#7dd87d]" />
              <span className="text-[#7dd87d] text-sm font-semibold">Hymns of the ReGeneration</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Add Your Voice
            </h1>
            <p className="text-white/85 text-base md:text-lg max-w-xl mx-auto leading-relaxed safe-prose">
              Submit your songs to add to the Hymns of the ReGeneration. Each season,
              the highest voted community song joins the Hymn Book. The musician
              receives <span className="text-[#7dd87d] font-semibold">3,333 $ReGen</span>.
            </p>
          </div>

          {/* Now-playing player + full track list. Spotify-style: a
              persistent now-playing panel with album art, a seek bar, and
              transport controls, followed by a tappable track list. Players
              land here when they tap the note in the command menu or the
              "Playlist" item in the mobile More tab. */}
          <section className="bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 rounded-3xl p-4 md:p-6 mb-12 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
            <NowPlayingPanel />

            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2 flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#7dd87d]" /> Up Next
              </h2>
              <ul>
                {PLAYLIST.map((song, i) => {
                  const isCurrent = audio.currentIndex === i;
                  const showPause = isCurrent && audio.isPlaying;
                  return (
                    <li
                      key={song.src}
                      id={`hymn-${toSlug(song.title)}`}
                      className={`group flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors scroll-mt-24 ${
                        isCurrent ? "bg-[#7dd87d]/10" : "hover:bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrent) {
                            audio.togglePlay();
                          } else {
                            audio.playSong(i);
                          }
                        }}
                        aria-label={showPause ? `Pause ${song.title}` : `Play ${song.title}`}
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCurrent
                            ? "bg-[#7dd87d] text-[#0d2818]"
                            : "bg-[#1a472a] text-[#7dd87d] group-hover:bg-[#7dd87d]/30"
                        }`}
                      >
                        {showPause ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isCurrent) audio.playSong(i); else audio.togglePlay(); }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className={`flex items-center gap-2 text-sm font-semibold truncate ${isCurrent ? "text-[#7dd87d]" : "text-white"}`}>
                          {song.title}
                          {showPause && <EqualizerBars />}
                        </span>
                        {song.artist && (
                          <span className="block text-white/60 text-xs truncate">{song.artist}</span>
                        )}
                      </button>
                      <ShareButton
                        where="hymn_book_row"
                        title={`${song.title}: Hymns of the ReGeneration`}
                        text={`Listen to ${song.title}${song.artist ? ` by ${song.artist}` : ""} on ReGen Civics.`}
                        url={`/hymn-book?song=${toSlug(song.title)}`}
                        variant="soft"
                        label=""
                        className="!min-h-0 !px-2 !py-1 text-xs text-white/60 hover:text-white bg-transparent border-0"
                      />
                      <span className="text-white/30 text-xs tabular-nums pr-1">{String(i + 1).padStart(2, "0")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Submission form */}
          <section id="add-your-voice" className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-12">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#7dd87d]" /> Submit your song
            </h2>
            <p className="text-white/60 text-sm mb-4">
              One submission per player per season. Host your audio anywhere public
              (SoundCloud, Bandcamp, your own site) and paste the link.
            </p>

            {/* Anonymity + treasury callout (Fixes 15 + 26): every player who
                submits sees the same explanation up front, so there's no
                surprise about how attribution and revenue work. */}
            <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-xl p-4 mb-5 text-sm text-white/85 leading-relaxed space-y-2">
              <p>
                <strong className="text-[#7dd87d]">Hymns of the ReGeneration is a community songbook.</strong>{" "}
                When your song is selected for the book, the movement buys it from you.
                Songs in the book are titled by the author but credited to "Hymns of the ReGeneration", the
                people's book, free and open. All streaming revenue goes to the community treasury.
              </p>
              <p>
                Submissions are anonymous. Your name appears nowhere on the song page; the artist field stays
                "Hymns of the ReGeneration."
              </p>
            </div>

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
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
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

            {/* Voting errors surface here instead of failing silently. */}
            {vote.error && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 mb-4 text-sm text-red-200">
                {vote.error.data?.code === "UNAUTHORIZED" ? (
                  <>
                    Your session expired.{" "}
                    <a href="/api/auth/login" className="text-[#7dd87d] underline">Sign in again</a>{" "}
                    to vote.
                  </>
                ) : (
                  <>Your vote did not go through. {vote.error.message}</>
                )}
              </div>
            )}

            {list.isLoading ? (
              <p className="text-white/60">Loading…</p>
            ) : (list.data?.length ?? 0) === 0 ? (
              <p className="text-white/60">No submissions yet. Be the first.</p>
            ) : (
              <ul className="space-y-3">
                {list.data!.map((row) => {
                  const isMyVote = myVote.data?.submissionId === row.id;
                  const isVoting = vote.isPending && vote.variables?.submissionId === row.id;
                  return (
                    <li
                      key={row.id}
                      className={`bg-white/5 border rounded-2xl p-4 md:p-5 transition-colors ${
                        isMyVote ? "border-[#7dd87d]/60" : "border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2 min-w-0">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{row.title}</p>
                          {row.artist && <p className="text-white/70 text-sm truncate">{row.artist}</p>}
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
                        {isAuthenticated ? (
                          <button
                            onClick={() => vote.mutate({ submissionId: row.id })}
                            disabled={vote.isPending || isMyVote}
                            aria-label={isMyVote ? `Your vote is on ${row.title}` : `Vote for ${row.title}`}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 min-h-[36px] rounded-full transition-colors ${
                              isMyVote
                                ? "bg-[#7dd87d] text-[#0d2818] cursor-default"
                                : "bg-white/10 text-white hover:bg-[#7dd87d]/30 active:bg-[#7dd87d]/40"
                            }`}
                          >
                            {isVoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Vote className="w-3.5 h-3.5" />}
                            {isMyVote ? "Your vote" : "Vote"}
                          </button>
                        ) : (
                          <a
                            href="/api/auth/login"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 text-white hover:bg-[#7dd87d]/30 transition-colors"
                          >
                            <Vote className="w-3.5 h-3.5" />
                            Sign in to vote
                          </a>
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

/** Format seconds as m:ss. */
function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Three little animated bars to mark the track that is currently playing. */
function EqualizerBars() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
      <span className="hymn-eq-bar" style={{ animationDelay: "0ms" }} />
      <span className="hymn-eq-bar" style={{ animationDelay: "150ms" }} />
      <span className="hymn-eq-bar" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

/**
 * NowPlayingPanel: the Spotify-style transport at the top of the Hymn Book.
 * Album art, current track + artist, a drag-friendly seek bar with elapsed /
 * total time, prev / play-pause / next controls (with a buffering spinner),
 * and volume. All state comes from the shared AudioContext so playback
 * continues seamlessly across pages, and the context mirrors everything to
 * the Media Session API so the lock screen shows the same hymn.
 *
 * iOS specifics: Apple makes HTMLMediaElement.volume read-only, so a volume
 * slider is a dead control there. `muted` IS settable, so iOS gets a working
 * mute button plus a pointer at the hardware buttons.
 */
function NowPlayingPanel() {
  const audio = useAudio();
  const song = audio.currentSong;
  const dur = isFinite(audio.duration) ? audio.duration : 0;
  const iosVolume = isIos();

  // Seek-bar dragging: while the thumb is held, show the drag position
  // instead of live playback time, and only commit the seek on release.
  // Without this, 'timeupdate' (4x/s) yanks the thumb out from under the
  // finger mid-drag, which is the single biggest "cheap player" tell.
  const [dragTime, setDragTime] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const shownTime = dragTime ?? Math.min(audio.currentTime, dur || 0);
  const pct = dur > 0 ? Math.min(100, (shownTime / dur) * 100) : 0;
  const volPct = audio.muted ? 0 : Math.round(audio.volume * 100);
  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragTime !== null) audio.seek(dragTime);
    setDragTime(null);
  };

  const showSpinner = audio.isBuffering && audio.isPlaying;

  return (
    <div className="flex flex-col gap-5">
      <style>{`
        @keyframes hymnEq {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .hymn-eq-bar {
          width: 3px; height: 100%;
          background: currentColor; border-radius: 2px;
          animation: hymnEq 0.9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hymn-eq-bar { animation: none; height: 60%; }
        }
        /* Range styling: a slim 6px track inside a 28px-tall input, so the
           touch target is finger-sized without the bar looking chunky. The
           filled portion comes from the --fill custom property. */
        .hymn-range {
          -webkit-appearance: none; appearance: none;
          height: 28px; background: transparent; cursor: pointer; outline: none;
          touch-action: none;
        }
        .hymn-range:focus-visible { outline: 2px solid #7dd87d; outline-offset: 4px; border-radius: 9999px; }
        .hymn-range::-webkit-slider-runnable-track {
          height: 6px; border-radius: 9999px;
          background: linear-gradient(to right, #7dd87d var(--fill, 0%), rgba(255,255,255,0.15) var(--fill, 0%));
        }
        .hymn-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; margin-top: -5px; border-radius: 50%;
          background: #fff; border: 2px solid #7dd87d;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .hymn-range::-moz-range-track {
          height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.15);
        }
        .hymn-range::-moz-range-progress {
          height: 6px; border-radius: 9999px; background: #7dd87d;
        }
        .hymn-range::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; border: 2px solid #7dd87d; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
      `}</style>

      {/* Art + title */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#1a472a] via-[#13311f] to-[#7dd87d]/40 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-[#7dd87d]/30 shadow-lg">
          <Music className={`w-9 h-9 text-[#7dd87d] ${audio.isPlaying ? "animate-pulse" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest mb-1 flex items-center gap-2 text-[#7dd87d]">
            {audio.isPlaying ? <>Now Playing <EqualizerBars /></> : "Paused"}
          </p>
          <p className="text-lg md:text-2xl font-bold text-white truncate" style={{ fontFamily: "var(--font-display)" }}>
            {song?.title ?? "—"}
          </p>
          <p className="text-white/60 text-sm truncate">{song?.artist ?? "Hymns of the ReGeneration"}</p>
        </div>
        <span className="hidden md:block text-white/60 text-xs tabular-nums flex-shrink-0 self-start pt-1">
          {audio.currentIndex + 1} / {audio.playlist.length}
        </span>
      </div>

      {/* Seek bar */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] tabular-nums text-white/60 w-10 text-right">{fmtTime(shownTime)}</span>
        <input
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={shownTime}
          onPointerDown={() => { draggingRef.current = true; }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            if (draggingRef.current) setDragTime(t);
            else audio.seek(t); // keyboard arrows seek directly
          }}
          className="hymn-range flex-1"
          style={{ "--fill": `${pct}%` } as CSSProperties}
          aria-label="Seek"
          aria-valuetext={`${fmtTime(shownTime)} of ${fmtTime(dur)}`}
          disabled={dur <= 0}
        />
        <span className="text-[11px] tabular-nums text-white/60 w-10">{fmtTime(dur)}</span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-7">
        <button
          type="button"
          onClick={audio.prevSong}
          aria-label="Previous track"
          className="text-white/80 hover:text-[#7dd87d] transition-colors p-2 -m-2"
        >
          <SkipBack className="w-6 h-6" fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={audio.togglePlay}
          aria-label={audio.isPlaying ? "Pause" : "Play"}
          className="w-14 h-14 rounded-full bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] flex items-center justify-center shadow-lg transition-colors"
        >
          {showSpinner ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : audio.isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 translate-x-0.5" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          onClick={audio.nextSong}
          aria-label="Next track"
          className="text-white/80 hover:text-[#7dd87d] transition-colors p-2 -m-2"
        >
          <SkipForward className="w-6 h-6" fill="currentColor" />
        </button>
      </div>

      {/* Volume. Mute works everywhere, including iOS; the level slider only
          renders where the browser actually honors it. */}
      <div className="flex items-center gap-3 justify-center">
        <button
          type="button"
          onClick={audio.toggleMute}
          aria-label={audio.muted ? "Unmute" : "Mute"}
          aria-pressed={audio.muted}
          className="text-white/60 hover:text-white transition-colors p-2 -m-2 flex-shrink-0"
        >
          {audio.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        {iosVolume ? (
          <span className="text-xs text-white/60">Use your device buttons to change volume</span>
        ) : (
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={audio.muted ? 0 : audio.volume}
            onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
            className="hymn-range w-32"
            style={{ "--fill": `${volPct}%` } as CSSProperties}
            aria-label="Volume"
          />
        )}
      </div>
    </div>
  );
}
