/**
 * Breadcrumb, simple path navigation for nested pages.
 * Usage: <Breadcrumb items={[{ label: 'Community', href: '/community' }, { label: 'Land Projects' }]} />
 */
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[#1a472a]/50 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#1a472a]/30" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-[#1a472a] transition-colors">{item.label}</Link>
          ) : (
            <span className="text-[#1a472a]/80 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
