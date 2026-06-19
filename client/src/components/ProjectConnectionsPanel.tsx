/**
 * ProjectConnectionsPanel
 * Displays "Needs Each Other" and "Similar Projects" cross-links for a forum post.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeftRight, Copy } from "lucide-react";

interface Props {
  postId: number;
}

export function ProjectConnectionsPanel({ postId }: Props) {
  const { data: connections, isLoading } = trpc.projectConnections.forPost.useQuery({ postId });

  if (isLoading || !connections || connections.length === 0) return null;

  const needsEach = connections.filter(c => c.connectionType === "needs_each_other");
  const similar = connections.filter(c => c.connectionType === "similar");

  function otherPostId(c: { postAId: number; postBId: number }) {
    return c.postAId === postId ? c.postBId : c.postAId;
  }

  return (
    <div className="mt-6 p-4 rounded-xl border border-[#e8e4de] bg-[#f8f5f0]">
      <h3
        className="text-sm font-bold text-[#1a472a] mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Related Projects
      </h3>

      {needsEach.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-[#4a7c59] font-bold mb-1.5 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3" /> Needs Each Other
          </p>
          <div className="space-y-1">
            {needsEach.map(c => (
              <div key={c.id}>
                <Link
                  href={`/community/post/${otherPostId(c)}`}
                  className="text-sm text-[#4a7c59] hover:underline"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Thread #{otherPostId(c)}
                </Link>
                {c.note && (
                  <p className="text-[#1a472a]/80 text-xs mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                    {c.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {similar.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#4a7c59] font-bold mb-1.5 flex items-center gap-1">
            <Copy className="w-3 h-3" /> Similar Projects
          </p>
          <div className="space-y-1">
            {similar.map(c => (
              <div key={c.id}>
                <Link
                  href={`/community/post/${otherPostId(c)}`}
                  className="text-sm text-[#4a7c59] hover:underline"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Thread #{otherPostId(c)}
                </Link>
                {c.note && (
                  <p className="text-[#1a472a]/80 text-xs mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                    {c.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
