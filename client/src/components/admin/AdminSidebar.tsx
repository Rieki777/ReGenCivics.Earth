import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import {
  LayoutDashboard, Users, Building2, Handshake, UserCheck,
  TrendingUp, FileText, Globe2, Shield, Megaphone, Search,
  BarChart3, Image, Gamepad2, Settings, ChevronLeft, ChevronRight,
  ScrollText, Wallet, Map, ClipboardList, Video, Calendar, Coins, Award, Scissors,
  GitFork
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

// route items navigate to a real page instead of switching an in-page tab.
export type NavItem = { id: string; label: string; icon: typeof LayoutDashboard; route?: string }
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Ecosystem',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'applications', label: 'Applications', icon: Building2 },
      { id: 'alliance', label: 'Alliance', icon: Handshake },
      { id: 'roles', label: 'Players', icon: UserCheck },
      { id: 'citizenship-tiers', label: 'Citizenship Tiers', icon: Award },
    ]
  },
  {
    label: 'Fund',
    items: [
      { id: 'investors', label: 'Investors', icon: TrendingUp },
      { id: 'loi', label: 'LOIs', icon: FileText },
      { id: 'crowdpooling', label: 'Crowd Pooling', icon: Globe2 },
      { id: 'seeds-claims', label: 'SEEDS Claims', icon: Coins },
    ]
  },
  {
    label: 'Community',
    items: [
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'recordings', label: 'Recordings', icon: Video },
      { id: 'role-holders', label: 'Role Holders', icon: Handshake },
      { id: 'call-tasks', label: 'Tasks', icon: ScrollText },
      { id: 'edited-cuts', label: 'Edited Cuts', icon: Scissors },
      { id: 'moderation', label: 'Forum', icon: Shield, route: '/admin/moderation' },
      { id: 'newsletter', label: 'Newsletter', icon: Megaphone },
      { id: 'broadcast', label: 'Broadcast', icon: Search },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'banners', label: 'Banners', icon: Image },
      { id: 'governance-forks', label: 'Governance Forks', icon: GitFork, route: '/admin/governance-forks' },
      { id: 'custom-games', label: 'Custom Games', icon: Gamepad2 },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'audit-log', label: 'Audit Log', icon: ClipboardList },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
]

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  /** Mobile drawer state, owned by Admin.tsx (the hamburger lives in its header). */
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

/** Shared nav list. `large` renders 44px touch rows for the mobile drawer. */
function NavList({ activeTab, onSelect, collapsed, large }: {
  activeTab: string
  onSelect: (item: NavItem) => void
  collapsed: boolean
  large?: boolean
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-2">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-semibold text-white/70 uppercase tracking-wider">{group.label}</div>
          )}
          {group.items.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-3 px-3 text-sm transition-colors ${large ? 'min-h-11 py-2.5' : 'py-2'} ${
                  active ? 'bg-green-600/20 text-green-400 border-r-2 border-green-400' : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={large ? 18 : 16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function AdminSidebar({ activeTab, onTabChange, mobileOpen = false, onMobileOpenChange }: AdminSidebarProps) {
  const [, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('admin_sidebar_collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const select = (item: NavItem) => {
    if (item.route) { navigate(item.route) } else { onTabChange(item.id) }
    onMobileOpenChange?.(false)
  }

  return (
    <>
      {/* Desktop: static, collapsible aside. Hidden on phones, where the same
          nav renders as an overlay drawer so content gets the full width. */}
      <aside className={`hidden md:flex flex-shrink-0 flex-col bg-[#0a1f14] border-r border-white/10 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          {!collapsed && <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">Admin</span>}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title="Toggle sidebar [ "
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <NavList activeTab={activeTab} onSelect={select} collapsed={collapsed} />
      </aside>

      {/* Mobile: left drawer via the base Sheet (portal, focus trap, Esc, swipe
          scrim). 44px rows, safe-area padding, closes on select. */}
      <Sheet open={mobileOpen} onOpenChange={(open) => onMobileOpenChange?.(open)}>
        <SheetContent
          side="left"
          className="md:hidden w-72 max-w-[85vw] p-0 flex flex-col bg-[#0a1f14] border-white/10 text-white [&>button]:text-white/80 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="p-3 border-b border-white/10 text-left">
            <SheetTitle className="text-sm font-semibold text-white/70 uppercase tracking-wider">Admin</SheetTitle>
            <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          </SheetHeader>
          <NavList activeTab={activeTab} onSelect={select} collapsed={false} large />
        </SheetContent>
      </Sheet>
    </>
  )
}
