/**
 * Personalized feed strip on /community (Phase 2): For You, Following, and
 * My Threads tabs for signed-in members. Signed-out visitors keep the
 * chronological page below (Latest is the whole rest of the page).
 *
 * Every ranking factor shown in the ⓘ tooltip is a real fired boost from
 * shared/forumFeed.ts — the explanation and the scorer share constants.
 */
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { MessageCircle, Info, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { FEED_REASON_LABELS, type FeedTab } from '@shared/forumFeed';
import { decodeEntities } from '@/utils/sanitize';

const TABS: { key: Exclude<FeedTab, 'latest'>; label: string }[] = [
  { key: 'for_you', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'my_threads', label: 'My Threads' },
];

const TAB_STORAGE_KEY = 'regen_feed_tab';

function firedReasons(post: any): string[] {
  const reasons: string[] = [];
  if (Number(post.whyCategoryAffinity) > 0.05) reasons.push(FEED_REASON_LABELS.category_affinity);
  if (Number(post.whyAuthorAffinity) > 0.05) reasons.push(FEED_REASON_LABELS.author_affinity);
  if (Number(post.whyTagAffinity) > 0.05) reasons.push(FEED_REASON_LABELS.tag_affinity);
  if (Number(post.whySameBioregion) === 1) reasons.push(FEED_REASON_LABELS.same_bioregion);
  if (Number(post.whyFollowed) === 1) reasons.push(FEED_REASON_LABELS.followed);
  if (Number(post.whySensing) === 1) reasons.push(FEED_REASON_LABELS.sensing_can_act);
  if (Number(post.whyNeverRead) === 1) reasons.push(FEED_REASON_LABELS.unread_never);
  if (Number(post.whyNewReplies) === 1) reasons.push(FEED_REASON_LABELS.unread_new_replies);
  return reasons;
}

function FeedRow({ post, showWhy }: { post: any; showWhy: boolean }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const unread = Number(post.unreadReplies ?? 0);
  const neverRead = Number(post.whyNeverRead ?? 0) === 1;
  const reasons = useMemo(() => (showWhy ? firedReasons(post) : []), [post, showWhy]);

  return (
    <div className="relative flex items-center gap-2 p-3 bg-white/70 rounded-xl border border-[#1a472a]/10 hover:border-[#7dd87d]/40 hover:bg-[#f0f7f0] transition-all group">
      {neverRead && <span className="w-2 h-2 rounded-full bg-[#4a7c59] flex-shrink-0" aria-label="Unread" />}
      <Link href={`/community/post/${post.id}`} className="flex-1 min-w-0">
        <span className={`block text-sm text-[#1a472a] truncate group-hover:text-[#4a7c59] ${neverRead || unread > 0 ? 'font-bold' : 'font-medium'}`}>
          {decodeEntities(post.title)}
        </span>
        <span className="block text-xs text-[#1a472a]/60 truncate">
          {post.authorName} · {post.categoryName}
          {post.bioregionName ? ` · ${post.bioregionName}` : ''}
        </span>
      </Link>
      {unread > 0 && !neverRead && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#7dd87d]/30 text-[#1a472a] flex-shrink-0">
          {unread} new
        </span>
      )}
      <span className="flex items-center gap-1 text-xs text-[#1a472a]/60 flex-shrink-0">
        <MessageCircle className="w-3 h-3" /> {post.replyCount ?? 0}
      </span>
      {showWhy && reasons.length > 0 && (
        <span className="relative flex-shrink-0">
          <button
            aria-label="Why this post is here"
            aria-expanded={whyOpen}
            onClick={() => setWhyOpen(!whyOpen)}
            onBlur={() => setTimeout(() => setWhyOpen(false), 150)}
            className="p-1 text-[#1a472a]/40 hover:text-[#4a7c59] transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {whyOpen && (
            <span className="absolute right-0 top-full mt-1 z-20 w-56 bg-[#1a472a] text-white text-xs rounded-lg p-3 shadow-xl block">
              <span className="block font-semibold mb-1">Here because</span>
              {reasons.map((r) => (
                <span key={r} className="block text-white/85">· {r}</span>
              ))}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function CommunityFeedTabs() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Exclude<FeedTab, 'latest'>>(() => {
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored === 'for_you' || stored === 'following' || stored === 'my_threads') return stored;
    } catch { /* ignore */ }
    return 'for_you';
  });

  const query = trpc.forumFeed.feed.useInfiniteQuery(
    { tab, limit: 10 },
    {
      enabled: !!user,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 60 * 1000,
    }
  );

  if (!user) return null;

  const posts = query.data?.pages.flatMap((p) => p.posts) ?? [];
  const selectTab = (t: Exclude<FeedTab, 'latest'>) => {
    setTab(t);
    try { localStorage.setItem(TAB_STORAGE_KEY, t); } catch { /* ignore */ }
  };

  const EMPTY_COPY: Record<string, string> = {
    for_you: 'Your feed fills in as you read, react, and post. The sections below are a good place to begin.',
    following: 'Follow people, categories, or your bioregion and their new conversations land here.',
    my_threads: 'Threads you start or reply to gather here, newest activity first.',
  };

  return (
    <div className="mb-8 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[#7dd87d]" />
        <h2 className="text-lg font-bold text-[#1a472a]">Your Feed</h2>
        <div className="flex gap-1.5 ml-2" role="tablist" aria-label="Feed view">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => selectTab(t.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-[#1a472a] text-white'
                  : 'bg-white/70 text-[#4a7c59] border border-[#7dd87d]/30 hover:bg-[#f0f7f0]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-white/60 rounded-xl border border-[#1a472a]/10 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-[#1a472a]/70 bg-white/60 rounded-xl border border-[#1a472a]/10 p-4">
          {EMPTY_COPY[tab]}
        </p>
      ) : (
        <div className="grid gap-2">
          {posts.map((post: any) => (
            <FeedRow key={post.id} post={post} showWhy={tab === 'for_you'} />
          ))}
          {query.hasNextPage && (
            <button
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="text-xs font-semibold text-[#4a7c59] hover:text-[#1a472a] py-2 transition-colors"
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
