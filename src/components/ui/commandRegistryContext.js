/**
 * commandRegistryContext.js — page-scoped command registry hooks + context.
 *
 * Kept separate from the <CommandRegistryProvider> component so React fast
 * refresh works (components and non-component exports live in their own
 * files, matching the Toast.jsx / useToast.js split).
 *
 * Usage (in a page component):
 *   const commands = useMemo(() => [ { id, group, label, hint, keywords, icon, onSelect } ], [deps])
 *   useRegisterCommands(commands, [commands])
 *
 * Commands registered by a page show up in ⌘K while that page is mounted and
 * disappear on unmount. Page commands override base palette items with the
 * same `id`. Wrap the app shell (palette + routed pages) in
 * <CommandRegistryProvider> from './CommandRegistryProvider'.
 */

import { createContext, useContext, useEffect, useRef } from 'react'

export const CommandRegistryContext = createContext(null)

/**
 * Read the registry from context (null when no provider is present).
 */
export function useCommandRegistry() {
  return useContext(CommandRegistryContext)
}

/**
 * Subscribe a page's commands to the registry for as long as the page is
 * mounted. Re-registers whenever `deps` change — pass the commands array
 * (memoized) or the values they close over.
 */
export function useRegisterCommands(items, deps = []) {
  const registry = useContext(CommandRegistryContext)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const register = registry?.register
    if (!register) return undefined
    return register(itemsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry?.register, ...deps])

  return registry
}
