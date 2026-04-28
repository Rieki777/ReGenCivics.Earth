/**
 * UserHandle: shared display of @handle text used everywhere a user is referenced.
 *
 * Props accept either a full user/profile object with `handle` field or a raw string.
 * Renders nothing if no handle is set (e.g., legacy users not yet backfilled).
 */
import { Link } from "wouter";

type Props = {
  handle?: string | null;
  className?: string;
  /** Wrap in a Link to /profile/{handle}. Default true. */
  link?: boolean;
};

export function UserHandle({ handle, className = "", link = true }: Props) {
  if (!handle) return null;
  const display = `@${handle}`;
  const cls = `text-xs text-white/70 hover:text-[#7dd87d] transition-colors ${className}`;
  if (link) {
    return (
      <Link href={`/profile/${handle}`} className={cls}>
        {display}
      </Link>
    );
  }
  return <span className={cls}>{display}</span>;
}
