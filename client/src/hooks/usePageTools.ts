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
        { icon: 'Calculator', label: 'Calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/community':
      if (isAuthenticated) {
        tools.push({ icon: 'PenLine', label: 'New Post', action: () => window.location.href = '/community/new' });
      }
      tools.push(
        { icon: 'Search', label: 'Search', action: () => window.dispatchEvent(new CustomEvent('open-command-palette')) },
      );
      break;
    case '/land':
      tools.push(
        { icon: 'Clipboard', label: 'Apply', action: () => window.location.href = '/apply' },
        { icon: 'Calculator', label: 'Calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/play':
      // Badges event only works on /quest where QuestBadges is mounted
      break;
    case '/crowd-pooling':
      tools.push(
        { icon: 'Calculator', label: 'Calculator', action: () => window.location.href = '/calculator' },
      );
      break;
    case '/profile':
      if (isAuthenticated) {
        tools.push(
          { icon: 'Settings', label: 'Settings', action: () => window.location.href = '/profile?tab=settings' },
        );
      }
      break;
  }

  return tools;
}
