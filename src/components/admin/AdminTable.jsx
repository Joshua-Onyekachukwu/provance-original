import { useMemo, useCallback, useState } from 'react'
import AppStatePanel from '../app/AppStatePanel.jsx'

function SkeletonRow({ columns }) {
  return (
    <tr className="animate-pulse border-b border-stone-light">
      {columns.map((col, index) => (
        <td key={index} className="px-4 py-4">
          <div className="h-4 rounded bg-stone-light/60" style={{ width: col.width || '80%' }} />
        </td>
      ))}
    </tr>
  )
}

function EmptyState({ message = 'No results found.', isFiltered = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-light bg-parchment">
        <svg className="h-7 w-7 text-charcoal-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          {isFiltered ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          )}
        </svg>
      </div>
      <p className="font-serif text-lg text-charcoal">
        {isFiltered ? 'No results match your filters' : 'No data yet'}
      </p>
      <p className="mt-1 text-sm text-charcoal-mid">{message}</p>
    </div>
  )
}

export default function AdminTable({
  columns = [],
  data = [],
  loading = false,
  error = '',
  emptyMessage = 'No data available.',
  filteredEmptyMessage = 'No results match your current filters or search.',
  onRowClick = null,
  onSort = null,
  onFilterChange = null,
  onSelectionChange = null,
  onPageChange = null,
  page = 1,
  pageSize = 20,
  total = 0,
  selectedIds = [],
  bulkActions = null,
  filterValue = '',
  filterPlaceholder = 'Filter…',
}) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showPagination = total > pageSize

  const handleSort = useCallback(
    (key) => {
      const nextDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
      setSortKey(key)
      setSortDir(nextDir)
      onSort?.(key, nextDir)
    },
    [sortKey, sortDir, onSort],
  )

  const allSelected = useMemo(
    () => data.length > 0 && data.every((row) => selectedIds.includes(row.id)),
    [data, selectedIds],
  )

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(data.map((row) => row.id))
    }
  }

  function handleSelectRow(id) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((sid) => sid !== id)
      : [...selectedIds, id]
    onSelectionChange?.(next)
  }

  if (error) {
    return (
      <AppStatePanel
        label="Error"
        title="Could not load data"
        description={error}
        variant="error"
      />
    )
  }

  const isFiltered = filterValue.length > 0
  const hasData = !loading && data.length > 0
  const showEmpty = !loading && data.length === 0
  const hasSelection = selectedIds.length > 0

  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm">
      {/* Filter row */}
      {(onFilterChange || filterValue !== undefined) && (
        <div className="border-b border-stone-light px-4 py-3">
          <input
            type="search"
            value={filterValue}
            onChange={(event) => onFilterChange?.(event.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            className="w-full max-w-xs rounded-xl border border-stone-light bg-parchment px-4 py-2 text-sm text-charcoal placeholder:text-charcoal-light focus:border-charcoal focus:outline-none focus:ring-1 focus:ring-charcoal/20"
          />
        </div>
      )}

      {/* Bulk action bar */}
      {hasSelection && bulkActions && (
        <div className="flex items-center gap-3 border-b border-charcoal/10 bg-charcoal/5 px-4 py-3">
          <span className="text-sm font-medium text-charcoal">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left" role="table">
          <thead>
            <tr className="border-b border-stone-light">
              {onSelectionChange && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-stone-light text-charcoal focus:ring-charcoal/20"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light ${
                    col.sortable ? 'cursor-pointer select-none hover:text-charcoal' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-[10px]">
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} columns={columns} />
              ))}

            {hasData &&
              data.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-stone-light/60 transition ${
                    onRowClick ? 'cursor-pointer hover:bg-parchment' : ''
                  } ${selectedIds.includes(row.id) ? 'bg-charcoal/5' : ''}`}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      onRowClick(row)
                    }
                  }}
                >
                  {onSelectionChange && (
                    <td className="w-10 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select row ${row.id}`}
                        className="h-4 w-4 rounded border-stone-light text-charcoal focus:ring-charcoal/20"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-4 text-sm text-charcoal"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Empty states */}
      {showEmpty && (
        <EmptyState
          message={isFiltered ? filteredEmptyMessage : emptyMessage}
          isFiltered={isFiltered}
        />
      )}

      {/* Pagination */}
      {showPagination && hasData && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-light px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal-mid">
              Page {page} of {totalPages}
            </span>
            <select
              value={pageSize}
              onChange={(event) =>
                onPageChange?.(1, Number(event.target.value))
              }
              className="rounded-lg border border-stone-light bg-parchment px-2 py-1 text-xs text-charcoal"
              aria-label="Page size"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange?.(page - 1, pageSize)}
              disabled={page <= 1}
              className="rounded-lg border border-stone-light px-3 py-1.5 text-sm text-charcoal transition hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = index + 1
              } else if (page <= 3) {
                pageNum = index + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + index
              } else {
                pageNum = page - 2 + index
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange?.(pageNum, pageSize)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    pageNum === page
                      ? 'bg-charcoal text-parchment'
                      : 'border border-stone-light text-charcoal hover:border-charcoal'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => onPageChange?.(page + 1, pageSize)}
              disabled={page >= totalPages}
              className="rounded-lg border border-stone-light px-3 py-1.5 text-sm text-charcoal transition hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
