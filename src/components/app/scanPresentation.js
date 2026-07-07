export const SCAN_STATUS_META = {
  awaiting_upload: {
    label: 'Awaiting upload',
    badge: 'bg-stone-light text-charcoal',
    tone: 'text-charcoal-mid',
  },
  queued: {
    label: 'Queued',
    badge: 'bg-sky-50 text-sky-700',
    tone: 'text-sky-700',
  },
  processing: {
    label: 'Processing',
    badge: 'bg-sky-50 text-sky-700',
    tone: 'text-sky-700',
  },
  complete: {
    label: 'Complete',
    badge: 'bg-emerald-50 text-emerald-700',
    tone: 'text-emerald-700',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-rose-50 text-rose-700',
    tone: 'text-rose-700',
  },
}

export function getScanStatusMeta(status) {
  return SCAN_STATUS_META[status] || SCAN_STATUS_META.awaiting_upload
}

export function formatScanTimestamp(value) {
  if (!value) return 'Not available'

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function getVerdictLabel(scan) {
  return scan?.result_payload?.verdict?.display_label || 'Pending'
}

