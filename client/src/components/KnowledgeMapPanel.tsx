/**
 * C9: Knowledge Map Panel
 * Displays curated / pinned index posts for a forum category.
 * Shown at the top of CommunityCategory pages.
 */
import { BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

interface Props {
  categoryId: number;
  categoryName?: string;
}

export default function KnowledgeMapPanel({ categoryId, categoryName }: Props) {
  const { data: entries = [], isLoading } = trpc.knowledgeMap.listByCategory.useQuery(
    { categoryId },
    { staleTime: 5 * 60 * 1000 }
  );

  if (isLoading || entries.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-[#7dd87d]/25 bg-[#0d2818]/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-[#7dd87d]" />
        <span className="text-sm font-semibold text-[#7dd87d]">
          Knowledge Map{categoryName ? `: ${categoryName}` : ""}
        </span>
        <span className="text-xs text-white/60 ml-1">Essential reading</span>
      </div>

      <ul className="space-y-2">
        {entries.map((entry) => {
          const href = entry.postId
            ? `/community/post/${entry.postId}`
            : (entry.url ?? "#");
          const isExternal = !entry.postId && !!entry.url;

          return (
            <li key={entry.id} className="group flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-[#7dd87d]/60 flex-shrink-0 group-hover:text-[#7dd87d] transition-colors" />
              <div className="min-w-0">
                {isExternal ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/80 hover:text-[#7dd87d] transition-colors inline-flex items-center gap-1"
                  >
                    {entry.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link
                    href={href}
                    className="text-sm text-white/80 hover:text-[#7dd87d] transition-colors"
                  >
                    {entry.title}
                  </Link>
                )}
                {entry.summary && (
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed line-clamp-1">
                    {entry.summary}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
