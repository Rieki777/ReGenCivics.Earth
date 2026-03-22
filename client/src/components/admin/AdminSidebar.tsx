import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Building2, Handshake, UserCheck,
  TrendingUp, FileText, Globe2, Shield, Megaphone, Search,
  BarChart3, Image, Gamepad2, Settings, ChevronLeft, ChevronRight,
  ScrollText, Wallet, Map, ClipboardList, Video, Calendar
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Ecosystem',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'applications', label: 'Applications', icon: Building2 },
      { id: 'alliance', label: 'Alliance', icon: Handshake },
      { id: 'roles', label: 'Players', icon: UserCheck },
    ]
  },
  {
    label: 'Fund',
    items: [
      { id: 'investors', label: 'Investors', icon: TrendingUp },
      { id: 'lois', label: 'LOIs', icon: FileText },
      { id: 'crowdpooling', label: 'Crowd Pooling', icon: Globe2 },
    ]
  },
  {
    label: 'Community',
    items: [
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'recordings', label: 'Recordings', icon: Video },
      { id: 'moderation', label: 'Forum', icon: Shield },
      { id: 'quests', label: 'Quests', icon: ScrollText },
      { id: 'newsletter', label: 'Newsletter', icon: Megaphone },
      { id: 'broadcast', label: 'Broadcast', icon: Search },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'banners', label: 'Banners', icon: Image },
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
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
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

  return (
    <aside className={`flex-shrink-0 flex flex-col bg-[#0a1f14] border-r border-white/10 transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        {!collapsed && <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">Admin</span>}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title="Toggle sidebar [ "
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <div className="px-3 py-1 text-xs font-semibold text-white/30 uppercase tracking-wider">{group.label}</div>
            )}
            {group.items.map(item => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-green-600/20 text-green-400 border-r-2 border-green-400' : 'text-white/60 hover:text-white hover:bg-white/5'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
