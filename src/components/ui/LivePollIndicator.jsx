// ---------------------------------------------------------------------------
// LivePollIndicator
//
// Pulsing emerald dot + mono "auto-refreshing" label. The single shared
// signal that a surface is tracking worker progress through a live poll loop
// (queue / processing scans exist) — every auto-refreshing surface renders
// THIS component, so the pulse animation, copy, and tone stay consistent by
// construction instead of being hand-rolled per page.
//
// Props:
//   onRefresh   optional tap-to-refresh handler. When provided, a small
//               refresh icon button renders beside the dot and calls it —
//               the affordance for "force a poll tick now" instead of waiting
//               out the 5s cadence. Wire it to the surface's resource
//               `refresh` (useResource / useMockData), NOT `reload`/`refetch`:
//               refresh is the silent in-place swap that never blanks the
//               panel. Without onRefresh the indicator stays a pure status
//               atom.
//
// Takes NO other props: whether it shows is decided by the caller's poll
// gate, so the component itself stays a small presentational atom. The
// canonical placement is the Card `actions` slot:
//
//   <Card
//     title="Verification ledger"
//     actions={live ? <LivePollIndicator onRefresh={scans.refresh} /> : null}
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
// readers (the refresh button sits OUTSIDE the live region so it is a normal
// interactive control). The pulse is Tailwind `animate-ping` on the halo dot
// — decorative only, the label carries the meaning.
//
// Rules for future live surfaces: (1) import from the ui barrel
// ('../../components/ui') — never re-create a dot; (2) gate it on the same
// predicate the poll runs under; (3) keep the "auto-refreshing" label copy
// (a different label would break the shared visual language).
// ---------------------------------------------------------------------------

export default function LivePollIndicator({ onRefresh }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1">
      <span
        role="status"
        aria-label="Auto-refreshing — tracking worker progress"
        className="inline-flex items-center gap-1.5"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700">
          auto-refreshing
        </span>
      </span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh now"
          title="Refresh now"
          className="grid h-5 w-5 place-items-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
