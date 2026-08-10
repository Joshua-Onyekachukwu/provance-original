/**
 * DemoStateBanner — dev-only floating control for forcing the `?state=`
 * loading / empty / error surfaces on any page, so each page's state
 * presentation can be reviewed and screenshotted without relying on the
 * mock's random error injection.
 *
 * Renders nothing in production builds (import.meta.env.DEV === false).
 *
 * Usage:
 *   const { demoState, selectDemoState } = useDemoStateControl()
 *   <DemoStateBanner demoState={demoState} onSelect={selectDemoState} />
 *
 * The control itself only writes the `?state=` query param — pages are
 * responsible for honoring it via useDemoState() / withDemoOverride() or
 * their own force branches.
 */
export default function DemoStateBanner({ demoState, onSelect }) {
  if (!import.meta.env.DEV) return null

  const options = [
    { value: null, label: 'Live' },
    { value: 'loading', label: 'Loading' },
    { value: 'empty', label: 'Empty' },
    { value: 'error', label: 'Error' },
  ]

  return (
    <div
      role="group"
      aria-label="Demo state controls"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-charcoal/15 bg-charcoal/95 py-1.5 pl-4 pr-1.5 text-parchment shadow-[0_16px_40px_rgba(26,26,26,0.35)] backdrop-blur"
    >
      <span className="pr-2 font-mono text-[10px] uppercase tracking-[0.18em] text-parchment/50">
        Demo state
      </span>
      {options.map((option) => {
        const active = demoState === option.value
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-parchment/40 ${
              active
                ? 'bg-parchment text-charcoal'
                : 'text-parchment/60 hover:bg-white/10 hover:text-parchment'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
