/**
 * ProfileActivityTimeline
 * Wraps the QuestJournal for the profile page.
 * State owned by PlayerProfile.tsx.
 */
import React, { lazy, Suspense } from "react";
import { TaoSpinner } from "@/components/TaoSpinner";

// QuestJournal is defined inline in PlayerProfile.tsx
// This component acts as a boundary wrapper to be used in the profile sections

interface ProfileActivityTimelineProps {
  children?: React.ReactNode;
}

export function ProfileActivityTimeline({ children }: ProfileActivityTimelineProps) {
  return (
    <Suspense fallback={<TaoSpinner size={40} />}>
      <div className="space-y-4">{children}</div>
    </Suspense>
  );
}
