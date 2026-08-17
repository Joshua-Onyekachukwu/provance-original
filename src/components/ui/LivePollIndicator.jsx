// ---------------------------------------------------------------------------
// LivePollIndicator
//
// Pulsing emerald dot + mono "auto-refreshing" label. The single shared
// signal that a surface is tracking worker progress through a live poll loop
// (queue / processing scans exist) — every auto-refreshing surface renders
// THIS component, so the pulse animation, copy, and tone stay consistent by
// construction instead of being hand-rolled per page.
//
// Takes NO props: whether it shows is decided by the caller's poll gate, so
// the component itself stays a pure presentational atom. The canonical
// placement is the Card `actions` slot:
//
//   <Card
//     title="Verification ledger"
//     actions={live ? <LivePollIndicator /> : null}
//     ...
//   />
//
// Gating contract (what `live` means): the SAME predicate the 5s poll loop
// runs under — e.g. `hasActiveScanWork(scans.data)` (any scan queued or
// processing), `queueNeedsPolling`, or `scanNeedsPolling(selectedScan)`.
// The indicator must appear exactly while the poll is active and vanish the
// moment it stops (queue drains / scan completes), so it tracks worker
// progress truthfully.
//
// A11y: `role="status"` + aria-label announce the live update to screen
// readers. The pulse is Tailwind `animate-ping` on the halo dot — decorative
// only, the label carries the meaning.
//
// Rules for future live surfaces: (1) import from the ui barrel
// ('../../components/ui') — never re-create a dot; (2) gate it on the same
// predicate the poll runs under; (3) keep the "auto-refreshing" label copy
// (a different label would break the shared visual language).
// ---------------------------------------------------------------------------

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
