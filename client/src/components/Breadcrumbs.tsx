import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-white/50 mb-4">
      <ol className="flex items-center gap-1 flex-wrap">
        <li>
          <Link href="/" className="hover:text-[#7dd87d] transition-colors inline-flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-white/30" />
            {crumb.href && i < crumbs.length - 1 ? (
              <Link href={crumb.href} className="hover:text-[#7dd87d] transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white/70">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
