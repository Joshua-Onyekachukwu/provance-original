/**
 * clipboard.js — tiny clipboard + shareable-URL helpers.
 *
 * Shared by the TeamFilter "Copy link" affordance and the API Keys page's
 * token copy, so one-click copy behaves the same everywhere:
 *
 *   copyText — prefers the async Clipboard API, falls back to a hidden
 *              textarea + document.execCommand('copy') for non-secure
 *              contexts (http, iframes, older browsers), returns a boolean.
 *   shareableUrl — absolute URL for the current pathname + search, used to
 *              share a filtered view (?team=, ?state=, ?from=, ?to=) as one
 *              link.
 */

/**
 * Absolute URL for a pathname + search, e.g. '/app/history' + '?team=…'.
 * `excludeKeys` (optional) drops query keys from the shared link — TeamFilter
 * uses it to strip the dev-only demo params (?state= / ?noisy=) so a copied
 * link always opens the live view, never a forced loading/empty/error state.
 */
export function shareableUrl(pathname, search, excludeKeys = []) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  let qs = search ? String(search).replace(/^\?/, '') : ''
  if (excludeKeys.length > 0) {
    const params = new URLSearchParams(qs)
    for (const key of excludeKeys) params.delete(key)
    qs = params.toString()
  }
  return `${origin}${pathname}${qs ? `?${qs}` : ''}`
}

/**
 * Copies `text` to the clipboard. Returns true on success (either path),
 * false when neither the Clipboard API nor the legacy fallback works.
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permissions denied / non-secure context — fall through to the legacy path.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    // Legacy path is deprecated — browsers may have dropped execCommand
    // entirely (jsdom never had it); treat absence as a failed copy.
    if (typeof document.execCommand !== 'function') {
      document.body.removeChild(textarea)
      return false
    }
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
