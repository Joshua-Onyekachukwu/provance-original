/**
 * index.js — the Backend seam (Backend seam design, Phase 1 stub).
 *
 * This directory is where the boot-time adapter selection will live once the
 * extraction phases land:
 *
 *   const base = USE_MOCK ? new MockBackend() : new HttpBackend()
 *   export const backend = USE_BETTER_AUTH ? new BetterAuthBackend(base) : base
 *
 * Phase 1 ships the interface manifest only — api.js is untouched and its
 * dispatch ladder stays exactly where it is until Phase 2 extracts
 * HttpBackend. The manifest is re-exported here so the seam's consumers (the
 * parity guard today, the adapters in later phases) import from one place.
 */
export { BACKEND_INTERFACE, BACKEND_INTERFACE_METHODS } from './interface.js'
