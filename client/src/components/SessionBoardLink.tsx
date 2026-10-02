/**
 * The link to a week's live session board, shown under that week wherever the
 * Season's schedule is listed (Rye, 2026-10-01, ADR-68). Weeks without a board
 * (Selection Day) render nothing.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { hasSessionBoard, sessionBoardHref } from "@shared/sessionBoard";

export function SessionBoardLink({ week, status, className = "" }: { week: number | null | undefined; status?: string | null; className?: string }) {
  if (week == null || !hasSessionBoard(week)) return null;
  const live = status === "live";
  const done = status === "completed";
  return (
    <Link
      href={sessionBoardHref(week)}
      className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold underline-offset-2 hover:underline ${
        live ? "text-[#d4a574] hover:text-[#e8c194]" : "text-[#7dd87d] hover:text-[#9de89d]"
      } ${className}`}
    >
      {live ? "Live now: open the session board" : done ? `Week ${week}'s board and notes` : `Week ${week}'s live session board`}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
