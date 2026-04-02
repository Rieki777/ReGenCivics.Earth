interface BulkActionBarProps {
  selectedCount: number
  entityType: 'applications' | 'inquiries' | 'players'
  onAction: (action: string) => void
  onClear: () => void
}

export function BulkActionBar({ selectedCount, entityType, onAction, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  const actions: Record<string, { id: string; label: string }[]> = {
    applications: [
      { id: 'move-reviewed', label: 'Move to Reviewed' },
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
          className="text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          {action.label}
        </button>
      ))}
      <button onClick={onClear} className="text-sm text-white/60 hover:text-white/60 ml-2">Clear</button>
    </div>
  )
}
