import { useEffect, useMemo, useState } from 'react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'
import Button from './Button'

function SortIcon({ dir }) {
  return (
    <svg
      className={`h-3 w-3 transition ${dir ? 'text-charcoal' : 'text-charcoal-light'}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      stroke="currentColor"
      aria-hidden="true"
    >
      {dir === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      )}
    </svg>
  )
}

/**
 * DataTable — generic, backend-ready table primitive.
 *
 * Columns: { key, header, render?, align?, width?, sortable?, sortValue? }
 *
 * States: loading (skeleton rows), error (retryable panel), empty (EmptyState).
 * Features: client sort, search (via `searchKeys`, optionally controlled),
 * pagination (+ optional page-size selector), row click, and selectable rows
 * with a bulk-action bar. The search input and selection bar persist across
 * loading/error/empty states so filters can always be cleared.
 */
export default function DataTable({
  columns,
  rows,
  keyField = 'id',
  loading = false,
  error = null,
  onRetry = null,
  searchable = false,
  searchValue = null,
  onSearchChange = null,
  searchPlaceholder = 'Search…',
  searchKeys,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = null,
  onRowClick = null,
  selectable = false,
  selectedIds = [],
  onSelectionChange = null,
  bulkActions = null,
  emptyTitle,
  emptyDescription,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, dir: null })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const activeQuery = searchValue !== null ? searchValue : query

  useEffect(() => {
    setPage(1)
  }, [activeQuery, pageSize])

  const filtered = useMemo(() => {
    if (!searchable || !activeQuery.trim()) return rows
    const q = activeQuery.trim().toLowerCase()
    const keys = searchKeys || columns.map((c) => c.key).filter(Boolean)
    return rows.filter((row) =>
      keys.some((key) => String(row[key] ?? '').toLowerCase().includes(q)),
    )
  }, [rows, activeQuery, searchable, searchKeys, columns])

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered
    const column = columns.find((c) => c.key === sort.key)
    const getValue = column?.sortValue || ((row) => row[sort.key])
    const direction = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = getValue(a)
      const bv = getValue(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction
    })
  }, [filtered, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = pagination ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted

  const clearSelection = () => {
    if (selectable && onSelectionChange) onSelectionChange([])
  }

  const toggleSort = (column) => {
    if (!column.sortable) return
    setPage(1)
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, dir: 'asc' },
    )
  }

  const handleSearchChange = (value) => {
    if (onSearchChange) onSearchChange(value)
    else setQuery(value)
    clearSelection()
  }

  const changePage = (next) => {
    setPage(next)
    clearSelection()
  }

  const changePageSize = (size) => {
    setPageSize(size)
    setPage(1)
    clearSelection()
  }

  // ── Selection helpers ────────────────────────────────────────────────────
  const pageIds = pageRows.map((row) => row[keyField])
  const allPageSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const somePageSelected = selectable && pageIds.some((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    const next = allPageSelected
      ? selectedIds.filter((id) => !pageIds.includes(id))
      : Array.from(new Set([...selectedIds, ...pageIds]))
    onSelectionChange(next)
  }

  const toggleSelectRow = (id) => {
    if (!onSelectionChange) return
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  const headerCell = (column) => {
    const content = column.sortable ? (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="ui-focus-ring inline-flex items-center gap-1.5 rounded-md transition hover:text-charcoal"
        aria-label={`Sort by ${column.header}`}
      >
        {column.header}
        <SortIcon dir={sort.key === column.key ? sort.dir : null} />
      </button>
    ) : (
      column.header
    )

    return (
      <th
        key={column.key}
        scope="col"
        aria-sort={sort.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        style={column.width ? { width: column.width } : undefined}
        className={`px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light ${column.align === 'right' ? 'text-right' : 'text-left'}`}
      >
        {content}
      </th>
    )
  }

  const bodyCell = (column, row) => {
    const value = column.render ? column.render(row) : row[column.key]
    return (
      <td
        key={column.key}
        className={`px-4 py-3.5 align-middle text-sm ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'} text-charcoal-mid`}
      >
        {value}
      </td>
    )
  }

  const selectAllHeader = selectable ? (
    <th scope="col" className="w-10 px-4 py-3">
      <input
        type="checkbox"
        checked={allPageSelected}
        onChange={toggleSelectAll}
        aria-label="Select all rows on this page"
        className="h-4 w-4 cursor-pointer rounded border-stone-light text-charcoal focus:ring-charcoal/20"
        ref={(el) => {
          if (el) el.indeterminate = somePageSelected && !allPageSelected
        }}
      />
    </th>
  ) : null

  // ── Toolbar: search + selection bar (persist across all states) ──────────
  const toolbar = (
    <>
      {searchable && (
        <div className="mb-4">
          <label className="sr-only" htmlFor="datatable-search">
            Search
          </label>
          <input
            id="datatable-search"
            type="search"
            value={activeQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="ui-input max-w-sm"
          />
        </div>
      )}

      {selectable && selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/15 bg-charcoal/5 px-4 py-3">
          <p className="text-sm font-medium text-charcoal">
            {selectedIds.length} selected
          </p>
          {bulkActions && <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>}
        </div>
      )}
    </>
  )

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={className}>
        {toolbar}
        <div role="status" aria-label="Loading table" className="overflow-hidden rounded-2xl border border-stone-light">
          <div className="flex gap-6 border-b border-stone-light bg-parchment/60 px-4 py-3">
            {selectable && <Skeleton className="h-3 w-4" />}
            {columns.map((column) => (
              <Skeleton key={column.key} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-stone-light/70">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-4 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={className}>
        {toolbar}
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/60">
          <EmptyState
            variant="error"
            title="Could not load data"
            description={error}
            action={
              onRetry ? (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              ) : null
            }
            compact
          />
        </div>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div className={className}>
        {toolbar}
        <div className="rounded-2xl border border-stone-light bg-white-warm">
          <EmptyState
            variant="empty"
            title={emptyTitle || (activeQuery ? 'No matches found' : 'Nothing here yet')}
            description={
              emptyDescription ||
              (activeQuery ? `No rows match "${activeQuery}".` : 'Add data or adjust your filters to populate this table.')
            }
            compact
          />
        </div>
      </div>
    )
  }

  // ── Populated state ─────────────────────────────────────────────────────
  return (
    <div className={className}>
      {toolbar}

      <div className="overflow-x-auto rounded-2xl border border-stone-light bg-white-warm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-light bg-parchment/60">
              {selectAllHeader}
              {columns.map(headerCell)}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-light/70">
            {pageRows.map((row, index) => (
              <tr
                key={row[keyField] ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-parchment/50' : 'hover:bg-parchment/40'} ${selectedIds.includes(row[keyField]) ? 'bg-charcoal/5' : ''}`}
              >
                {selectable && (
                  <td className="w-10 px-4 py-3.5 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row[keyField])}
                      onChange={() => toggleSelectRow(row[keyField])}
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Select row"
                      className="h-4 w-4 cursor-pointer rounded border-stone-light text-charcoal focus:ring-charcoal/20"
                    />
                  </td>
                )}
                {columns.map((column) => bodyCell(column, row))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-charcoal-light tabular-nums">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            {pageSizeOptions && (
              <select
                value={pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                aria-label="Page size"
                className="rounded-lg border border-stone-light bg-parchment px-2 py-1.5 text-xs text-charcoal focus:border-charcoal focus:outline-none"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}
            <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => changePage(safePage - 1)}>
              Previous
            </Button>
            <span className="font-mono text-xs text-charcoal-mid tabular-nums">
              {safePage} / {pageCount}
            </span>
            <Button variant="secondary" size="sm" disabled={safePage >= pageCount} onClick={() => changePage(safePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
