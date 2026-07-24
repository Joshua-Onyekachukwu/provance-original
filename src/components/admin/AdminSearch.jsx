import { useEffect, useRef, useState } from 'react'

export default function AdminSearch({
  placeholder = 'Search…',
  scope = null,
  onSearch,
  initialValue = '',
  className = '',
}) {
  const [value, setValue] = useState(initialValue)
  const debounceRef = useRef(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  function handleChange(event) {
    const nextValue = event.target.value
    setValue(nextValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onSearch?.(nextValue)
    }, 300)
  }

  function handleClear() {
    setValue('')
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onSearch?.('')
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg
          className="h-4 w-4 text-charcoal-light"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-stone-light bg-parchment py-3 pl-11 pr-10 text-sm text-charcoal placeholder:text-charcoal-light focus:border-charcoal focus:outline-none focus:ring-1 focus:ring-charcoal/20"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-charcoal-light hover:text-charcoal"
          aria-label="Clear search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {scope && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-light bg-parchment px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
            {scope}
          </span>
        </div>
      )}
    </div>
  )
}
