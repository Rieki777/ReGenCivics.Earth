"use client";

import { useParams } from "next/navigation";
import { ClaimReviewDetail } from "@/components/claim/ClaimReviewDetail";
import { useRequireAuth } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function AdminReviewDetailPage() {
  const { ready, authenticated } = useRequireAuth();
  const { isAdmin, loading } = useCurrentUser();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  if (!ready || loading) return <div className="text-white/55 text-center py-12">Loading...</div>;
  if (!authenticated) return <div className="text-white/55 text-center py-12">Sign in required.</div>;
  if (!isAdmin) return <div className="text-white/55 text-center py-12">Admin access required.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <ClaimReviewDetail id={id} />
    </div>
  );
}
