/**
 * AdminOverviewSkeleton — loading placeholder for the admin overview dashboard.
 *
 * Mirrors the layout of the full page: 6 KPI cards, 2 panel rects,
 * 4 attention cards, 5 activity rows.
 */
export default function AdminOverviewSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading admin dashboard">
      {/* 6 KPI skeleton cards */}
      <div>
        <div className="h-[14px] w-36 animate-pulse rounded bg-stone-light/50 mb-5" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl bg-stone-light/50 h-[120px]" />
          ))}
        </div>
      </div>

      {/* 2 Panel skeletons (Queue + Health) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-pulse rounded-3xl bg-stone-light/50 h-[200px]" />
        <div className="animate-pulse rounded-3xl bg-stone-light/50 h-[200px]" />
      </div>

      {/* 4 Attention card skeletons */}
      <div>
        <div className="h-[14px] w-36 animate-pulse rounded bg-stone-light/50 mb-5" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-stone-light/50 h-[120px]" />
          ))}
        </div>
      </div>

      {/* 5 Activity row skeletons (wrapped in card) */}
      <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="h-[14px] w-36 animate-pulse rounded bg-stone-light/50 mb-5" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-stone-light/50 h-[48px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
