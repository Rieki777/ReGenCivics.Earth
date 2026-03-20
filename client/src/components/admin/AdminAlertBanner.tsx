import { trpc } from '@/lib/trpc'
import { AlertTriangle, Clock } from 'lucide-react'
import { useState } from 'react'

export function AdminAlertBanner({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { refetchInterval: 60000 })

  // Build alerts from stats
  const alerts: { message: string; tab: string; severity: 'red' | 'amber' }[] = []

  if (stats) {
    if ((stats.pendingInquiries ?? 0) > 0) {
      alerts.push({ message: `${stats.pendingInquiries} inquiries pending review`, tab: 'overview', severity: 'red' })
    }
    if ((stats.pendingApplications ?? 0) > 0) {
      alerts.push({ message: `${stats.pendingApplications} applications need review`, tab: 'applications', severity: stats.pendingApplications > 5 ? 'red' : 'amber' })
    }
    if ((stats.newInvestors ?? 0) > 0) {
      alerts.push({ message: `${stats.newInvestors} new investor inquiries`, tab: 'investors', severity: 'amber' })
    }
  }

  if (alerts.length === 0) return null

  const redAlerts = alerts.filter(a => a.severity === 'red')
  const amberAlerts = alerts.filter(a => a.severity === 'amber')

  return (
    <div className="border-b border-white/10">
      {redAlerts.slice(0, expanded ? undefined : 3).map((alert, i) => (
        <button
          key={i}
          onClick={() => onTabChange(alert.tab)}
          className="w-full flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm text-left transition-colors"
        >
          <AlertTriangle size={14} className="flex-shrink-0" />
          {alert.message}
        </button>
      ))}
      {amberAlerts.slice(0, expanded ? undefined : 2).map((alert, i) => (
        <button
          key={i}
          onClick={() => onTabChange(alert.tab)}
          className="w-full flex items-center gap-2 px-4 py-2 bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 text-sm text-left transition-colors"
        >
          <Clock size={14} className="flex-shrink-0" />
          {alert.message}
        </button>
      ))}
      {alerts.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-1 text-xs text-white/40 hover:text-white/60 transition-colors">
          {expanded ? 'Show fewer' : `View all ${alerts.length} alerts`}
        </button>
      )}
    </div>
  )
}
