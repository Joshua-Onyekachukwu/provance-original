import { TEAM_IDS, getTeamMeta } from './scanPresentation.js'

/**
 * TeamFilter — pill-chip team scoping for the workspace surfaces (scan
 * ledger, queue, reports). Shows "All teams" plus one chip per workspace
 * team with a live count; selection is a controlled value + onChange pair.
 */
export default function TeamFilter({ counts = {}, value = 'all', onChange, label = 'Team' }) {
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0)

  const options = [
    { id: 'all', name: 'All teams', count: total },
    ...TEAM_IDS.map((id) => {
      const meta = getTeamMeta(id)
      return { id, name: meta.short, count: counts[id] || 0, fullName: meta.name }
    }),
  ]

  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-1.5">
      <span className="pr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
        {label}
      </span>
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.fullName || option.name}
            onClick={() => onChange(option.id)}
            className={`ui-focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? 'border-charcoal bg-charcoal text-parchment'
                : 'border-stone-light bg-parchment text-charcoal-mid hover:border-charcoal/30 hover:text-charcoal'
            }`}
          >
            {option.name}
            <span className={`tabular-nums ${active ? 'text-parchment/60' : 'text-charcoal-light'}`}>
              {option.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
