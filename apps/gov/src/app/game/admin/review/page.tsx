"use client";

import { Shield } from "lucide-react";
import { ClaimReviewList } from "@/components/claim/ClaimReviewList";
import { useRequireAuth } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function AdminReviewPage() {
  const { ready, authenticated } = useRequireAuth();
  const { isAdmin, loading } = useCurrentUser();
  if (!ready || loading) return <div className="text-white/55 text-center py-12">Loading...</div>;
  if (!authenticated) return <div className="text-white/55 text-center py-12">Sign in required.</div>;
  if (!isAdmin) return <div className="text-white/55 text-center py-12">Admin access required.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#7dd87d]" />
        <h1 className="text-2xl font-bold text-white">Claim Review</h1>
      </div>
      <p className="text-white/60 text-sm">Review submitted historical contribution claims and confirm, adjust, or flag the tier.</p>
      <ClaimReviewList />
    </div>
  );
}
