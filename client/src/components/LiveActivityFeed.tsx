/**
 * LiveActivityFeed — polls for recent forum posts every 30s.
 * Shows a compact scrolling list of the latest community activity.
 */
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { MessageCircle, Zap } from "lucide-react";

function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LiveActivityFeed() {
  const { data } = trpc.forum.posts.useInfiniteQuery(
    { limit: 6 },
    {
      getNextPageParam: () => undefined,
      refetchInterval: 30_000, // re-poll every 30 seconds
      staleTime: 20_000,
    }
  );

  const posts = data?.pages[0]?.posts ?? [];

  if (posts.length === 0) return null;

  return (
    <div className="glass-panel border border-[#7dd87d]/20 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dd87d] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#7dd87d]" />
        </span>
        <Zap className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm tracking-wide uppercase">Live Community</h3>
      </div>

      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/community/post/${post.id}`}
              className="flex items-start gap-3 group"
            >
              <MessageCircle className="w-4 h-4 text-[#7dd87d]/60 mt-0.5 flex-shrink-0 group-hover:text-[#7dd87d] transition-colors" />
              <div className="min-w-0">
                <p className="text-white/85 text-sm leading-snug line-clamp-1 group-hover:text-white transition-colors">
                  {post.title}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {post.authorName} · {timeAgo(post.createdAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/community"
        className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#7dd87d]/70 hover:text-[#7dd87d] transition-colors"
      >
        See all discussions →
      </Link>
    </div>
  );
}
