/**
 * useMockData.js — React hook for loading mock data with realistic state transitions.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useMockData(mockApiFunction, params)
 *
 * State machine:
 *   Initial:     { data: null, loading: true,  error: null }
 *   Success:     { data,       loading: false, error: null }
 *   Error:       { data: null, loading: false, error: 'message' }
 *   Refetching:  { data: prev, loading: true,  error: null }
 *
 * refetch() reloads from the same source, preserving previous data while loading.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export default function useMockData(mockFn, params = null) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  })

  const paramsRef = useRef(params)
  paramsRef.current = params

  const isMountedRef = useRef(true)
  const fetchIdRef = useRef(0)

  const execute = useCallback(
    async (isRefetch = false) => {
      fetchIdRef.current += 1
      const thisFetchId = fetchIdRef.current

      if (!isRefetch) {
        setState({ data: null, loading: true, error: null })
      } else {
        setState((prev) => ({ data: prev.data, loading: true, error: null }))
      }

      try {
        const result = await mockFn(paramsRef.current)

        if (!isMountedRef.current || thisFetchId !== fetchIdRef.current) {
          return
        }

        setState({ data: result, loading: false, error: null })
      } catch (err) {
        if (!isMountedRef.current || thisFetchId !== fetchIdRef.current) {
          return
        }

        setState({
          data: null,
          loading: false,
          error: err.message || 'An unexpected error occurred.',
        })
      }
    },
    [mockFn],
  )

  const refetch = useCallback(() => {
    execute(true)
  }, [execute])

  useEffect(() => {
    isMountedRef.current = true
    execute(false)

    return () => {
      isMountedRef.current = false
    }
  }, [execute])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
  }
}
