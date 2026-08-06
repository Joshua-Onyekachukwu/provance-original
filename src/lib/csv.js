/**
 * csv.js — shared CSV export helpers.
 *
 * Extracted from the Waitlist page's local buildCsv so every admin surface
 * (waitlist, audit logs, future exports) uses one quoting/escaping contract:
 * every cell is quoted and embedded quotes are doubled.
 */

/**
 * buildCsv — serialize headers + rows to a CSV string.
 *
 * @param {string[]} headers — column names
 * @param {Array<Array<string|number|null|undefined>>} rows — one array of cells per row
 */
export function buildCsv(headers, rows) {
  const headerLine = headers.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
  const lines = rows.map((row) =>
    row
      .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
      .join(','),
  )
  return [headerLine, ...lines].join('\n')
}

/**
 * downloadCsv — trigger a browser download of a CSV string.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
