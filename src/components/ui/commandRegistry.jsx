/**
 * commandRegistry.jsx — CommandRegistryProvider component.
 *
 * Holds the page-scoped command registry used by the CommandPalette. Wraps
 * the app shell (palette + routed pages) so pages can contribute their own
 * ⌘K commands while mounted.
 *
 * Hooks + context live in './commandRegistryContext.js' to keep fast refresh
 * working (components and non-components in separate files).
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { CommandRegistryContext } from './commandRegistryContext'

/**
 * Provider — holds the registry and re-renders consumers when a command is
 * registered or unregistered. `register` is a stable callback (safe to put in
 * effect deps) and returns an unregister function.
 */
export default function CommandRegistryProvider({ children }) {
  const [version, setVersion] = useState(0)
  const registeredRef = useRef([])

  const register = useCallback((items) => {
    const byId = new Map()
    for (const item of items) byId.set(item.id, item)
    // Override any existing command with the same id (last registration wins).
    registeredRef.current = [
      ...registeredRef.current.filter((item) => !byId.has(item.id)),
      ...items,
    ]
    setVersion((v) => v + 1)
    return () => {
      registeredRef.current = registeredRef.current.filter((item) => !byId.has(item.id))
      setVersion((v) => v + 1)
    }
  }, [])

  const registry = useMemo(
    () => ({ commands: registeredRef.current, register }),
    // `version` re-creates the memo after each mutation so `commands` is fresh;
    // `register` is stable and must not appear in the returned object's deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, register],
  )

  return (
    <CommandRegistryContext.Provider value={registry}>{children}</CommandRegistryContext.Provider>
  )
}
