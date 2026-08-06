/**
 * popoverOrigin.js — shared transform-origin math for origin-aware popovers.
 *
 * The "Kowalski" treatment: anchored panels scale from the trigger element's
 * screen position so the entrance feels like it grows out of where the user
 * asked for it. The computed origin is clamped to safe percentages so the
 * panel never scales off-screen.
 *
 * Used by both the Popover primitive and the CommandPalette (a portal modal)
 * so the math can't drift between them.
 */
export function computeTransformOrigin(rect) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const originX = ((rect.left + rect.width / 2) / viewportWidth) * 100
  const originY = ((rect.top + rect.height / 2) / viewportHeight) * 100
  return {
    x: Math.min(90, Math.max(10, originX)),
    y: Math.min(80, Math.max(15, originY)),
  }
}
