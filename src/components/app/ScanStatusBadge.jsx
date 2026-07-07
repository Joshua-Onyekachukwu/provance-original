import { getScanStatusMeta } from './scanPresentation.js'

export default function ScanStatusBadge({ status }) {
  const meta = getScanStatusMeta(status)

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${meta.badge}`}
    >
      {meta.label}
    </span>
  )
}

