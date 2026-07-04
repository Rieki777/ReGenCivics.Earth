interface BulkActionBarProps {
  selectedCount: number
  entityType: 'applications' | 'inquiries' | 'players'
  onAction: (action: string) => void
  onClear: () => void
  busy?: boolean
}

type BulkAction = { id: string; label: string; tone?: 'default' | 'danger' }

export function BulkActionBar({ selectedCount, entityType, onAction, onClear, busy = false }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  const actions: Record<string, BulkAction[]> = {
    applications: [
      { id: 'move-reviewed', label: 'Move to Reviewed' },
      { id: 'approve', label: 'Approve' },
      { id: 'reject', label: 'Reject', tone: 'danger' },
      { id: 'export-csv', label: 'Export CSV' },
    ],
    inquiries: [
      { id: 'mark-reviewed', label: 'Mark Reviewed' },
      { id: 'archive', label: 'Archive' },
    ],
    players: [
      { id: 'verify', label: 'Verify Selected' },
      { id: 'unverify', label: 'Unverify Selected' },
    ],
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0d2818] border border-green-500/30 rounded-xl px-5 py-3 shadow-xl z-50">
      <span className="text-sm text-white/70">{selectedCount} selected</span>
      <div className="w-px h-4 bg-white/20" />
      {actions[entityType].map(action => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={busy}
          className={`text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            action.tone === 'danger' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'
          }`}
        >
          {action.label}
        </button>
      ))}
      <button onClick={onClear} disabled={busy} className="text-sm text-white/60 hover:text-white/80 ml-2 disabled:opacity-50">Clear</button>
    </div>
  )
}
