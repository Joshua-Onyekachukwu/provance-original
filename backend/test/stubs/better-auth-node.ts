/**
 * better-auth-node.ts — CJS stub for `better-auth/node` (see better-auth.ts).
 * The controller delegates to toNodeHandler only when USE_BETTER_AUTH is on,
 * which no e2e spec enables.
 */
export function toNodeHandler(): () => void {
  return () => {};
}
