import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { trpc } from '@/lib/trpc'

export function ActivitySparkline() {
  const { data: applications } = trpc.applications.list.useQuery()

  // Build last 7 days data from applications
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const label = date.toLocaleDateString('en', { weekday: 'short' })
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime()
    const dayEnd = dayStart + 86400000
    const count = (applications ?? []).filter(a => {
      const t = new Date((a as any).createdAt).getTime()
      return t >= dayStart && t < dayEnd
    }).length
    return { label, count }
  })

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-sm font-medium text-white/60 mb-3">Applications (last 7 days)</h3>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={last7Days}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7dd87d" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7dd87d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#0a1f14', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
          <Area type="monotone" dataKey="count" stroke="#7dd87d" fill="url(#sparkGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
