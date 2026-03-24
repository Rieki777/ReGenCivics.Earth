/**
 * useContextualCTA - Determines the contextual action for Smart Nav slot 4
 * Checks priority list: profile completion > path primary action > engagement nudge > fallback
 */

import { trpc } from "@/lib/trpc";

export interface CtaSlot {
  path: string;
  icon: string; // lucide icon name
  label: string;
}

interface UseContextualCTAParams {
  user: any | null;
  userPath: string | null;
}

export function useContextualCTA({ user, userPath }: UseContextualCTAParams): CtaSlot | null {
  // Only query when user is logged in
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: myApps } = trpc.applications.myApplications.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: questCompletions } = trpc.quest.myCompletions.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) return null;

  // Priority 1: Profile completion (need name + bio + avatar)
  if (profile) {
    const filledFields = [profile.displayName, profile.bio, profile.avatarUrl].filter(Boolean).length;
    if (filledFields < 3) {
      return { path: "/profile/edit", icon: "UserCircle", label: "Profile" };
    }
  }

  // Priority 2: Path-specific primary action
  const effectivePath = userPath || profile?.path;

  if (effectivePath === "investor") {
    // Check if LOI submitted - if no applications with type containing "loi" or "investor"
    const hasLoi = myApps?.some((a: any) => a.type === "loi" || a.type === "investor");
    if (!hasLoi) {
      return { path: "/loi", icon: "PenLine", label: "Submit LOI" };
    }
  }

  if (effectivePath === "land_project" || effectivePath === "land") {
    const hasApp = myApps && myApps.length > 0;
    if (!hasApp) {
      return { path: "/apply", icon: "Clipboard", label: "Apply" };
    }
  }

  if (effectivePath === "ally") {
    const hasApp = myApps && myApps.length > 0;
    if (!hasApp) {
      return { path: "/apply", icon: "Clipboard", label: "Apply" };
    }
  }

  if (effectivePath === "player") {
    const hasCompletions = questCompletions && questCompletions.length > 0;
    if (!hasCompletions) {
      return { path: "/quest", icon: "Sparkles", label: "First Quest" };
    }
  }

  // Priority 3: Engagement nudge (skip for now, no lastVisit tracking for /community)

  // Priority 4: No contextual action
  return null;
}
