/**
 * ProfileForumPosts
 * Displays a user's forum activity in the profile section.
 * Uses tRPC to load posts for the given userId.
 */
import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { Link } from "wouter";

interface ProfileForumPostsProps {
  userId: number;
}

export function ProfileForumPosts({ userId }: ProfileForumPostsProps) {
  const { data: profile, isLoading } = trpc.forum.userProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );
  const posts = profile?.recentPosts;

  if (isLoading) {
    return (
      <div className="py-8 text-center text-white/70 text-sm">Loading forum activity...</div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="py-8 text-center text-white/70 text-sm">
        No forum posts yet. Start a conversation in the community!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.slice(0, 10).map((post: any) => (
        <Card key={post.id} className="bg-white/5 border border-white/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-[#7dd87d] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <Link href={`/community/post/${post.id}`}>
                  <p className="text-white font-medium hover:text-[#7dd87d] transition-colors line-clamp-2 cursor-pointer">
                    {post.title || post.content?.slice(0, 80)}
                  </p>
                </Link>
                <p className="text-white/70 text-xs mt-1">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
