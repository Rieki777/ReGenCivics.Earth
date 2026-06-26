import { useRecentPages } from '@/hooks/useRecentPages'
import { useFavoritePages } from '@/hooks/useFavoritePages'
import { Star, Clock } from 'lucide-react'
import { Link } from 'wouter'

export function RecentFavoritesTab() {
  const recentPages = useRecentPages()
  const { favorites, toggle, isFavorite } = useFavoritePages()

  return (
    <div className="space-y-3 py-2">
      {/* Favorites section */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1.5">
          <Star className="w-3 h-3" /> Favorites
        </h3>
        {favorites.length === 0 ? (
          <p className="text-[11px] text-white/50 pl-4">No favorites yet. Star a recent page below.</p>
        ) : (
          <ul className="space-y-0.5">
            {favorites.map(fav => (
              <li key={fav.path} className="flex items-center gap-1.5">
                <button
                  onClick={() => toggle(fav.path, fav.title)}
                  className="text-yellow-400 hover:text-yellow-300 p-1 flex-shrink-0"
                  aria-label={`Remove ${fav.title} from favorites`}
                >
                  <Star className="w-3 h-3 fill-current" />
                </button>
                <Link
                  href={fav.path}
                  className="text-xs text-white/70 hover:text-[#7dd87d] truncate transition-colors"
                >
                  {fav.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent section */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Recent
        </h3>
        {recentPages.length === 0 ? (
          <p className="text-[11px] text-white/50 pl-4">No recent pages yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {recentPages.map(page => (
              <li key={page.path} className="flex items-center gap-1.5">
                <button
                  onClick={() => toggle(page.path, page.title)}
                  className={`p-1 flex-shrink-0 transition-colors ${
                    isFavorite(page.path)
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-white/20 hover:text-yellow-400'
                  }`}
                  aria-label={`${isFavorite(page.path) ? 'Remove' : 'Add'} ${page.title} ${isFavorite(page.path) ? 'from' : 'to'} favorites`}
                >
                  <Star className={`w-3 h-3 ${isFavorite(page.path) ? 'fill-current' : ''}`} />
                </button>
                <Link
                  href={page.path}
                  className="text-xs text-white/70 hover:text-[#7dd87d] truncate transition-colors flex-1"
                >
                  {page.title}
                </Link>
                <span className="text-[9px] text-white/20 flex-shrink-0">
                  {new Date(page.visitedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
