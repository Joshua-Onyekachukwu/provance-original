/**
 * LivePollIndicator — pulsing emerald dot + "auto-refreshing" label.
 *
 * Rendered only while a 5s poll loop is active (queued / processing scans
 * exist), so users can see the surface is tracking worker progress. Shared by
 * the dashboard ledger + queue panels, the Queue page, and the report detail
 * pane.
 */
export default function LivePollIndicator() {
  return (
    <span
      role="status"
      aria-label="Auto-refreshing — tracking worker progress"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700">
        auto-refreshing
      </span>
    </span>
  )
}
