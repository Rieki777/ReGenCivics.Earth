/**
 * usePageTools - returns tool buttons based on the current route.
 * Used by CommandPanel to show page-specific actions.
 */
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

export interface PageTool {
  icon: string;
  label: string;
  action: () => void;
  /**
   * Optional canonical href. Set on any tool whose action navigates to a
   * specific route. The hook uses it to filter out tools that would
   * navigate to the current page and to dedupe by destination.
   */
  href?: string;
}

export function usePageTools(): PageTool[] {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const path = '/' + location.split('/')[1];

  const tools: PageTool[] = [];

  switch (path) {
    case '/quest':
      tools.push(
        { icon: 'BarChart3', label: 'Progress', action: () => window.dispatchEvent(new CustomEvent('open-quest-progress')) },
        { icon: 'Award', label: 'Badges', action: () => window.dispatchEvent(new CustomEvent('open-quest-badges')) },
        { icon: 'Image', label: 'Gallery', action: () => window.dispatchEvent(new CustomEvent('open-quest-gallery')) },
        { icon: 'Calculator', label: 'Calculator', href: '/calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/community':
      if (isAuthenticated) {
        tools.push({ icon: 'PenLine', label: 'New Post', href: '/community/new', action: () => window.location.href = '/community/new' });
      }
      tools.push(
        { icon: 'Search', label: 'Search', action: () => window.dispatchEvent(new CustomEvent('open-command-palette')) },
      );
      break;
    case '/land':
      tools.push(
        { icon: 'Clipboard', label: 'Apply', href: '/apply', action: () => window.location.href = '/apply' },
        { icon: 'Calculator', label: 'Calculator', href: '/calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/play':
      // Badges event only works on /quest where QuestBadges is mounted
      break;
    case '/crowd-pooling':
      tools.push(
        { icon: 'Calculator', label: 'Calculator', href: '/calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/profile':
      if (isAuthenticated) {
        tools.push(
          { icon: 'Settings', label: 'Settings', href: '/profile?tab=settings', action: () => window.location.href = '/profile?tab=settings' },
        );
      }
      break;
  }

  // Filter + dedupe: never suggest navigating to the route the user is
  // already on, and never show the same destination twice. Compare by
  // pathname only so trailing search/hash on either side doesn't matter.
  const currentPath = location.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  const seen = new Set<string>();
  return tools.filter((t) => {
    if (t.href) {
      const dest = t.href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
      if (dest === currentPath) return false;
      if (seen.has(dest)) return false;
      seen.add(dest);
    }
    return true;
  });
}
