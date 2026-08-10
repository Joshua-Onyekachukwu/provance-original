/**
 * better-auth.ts — CJS stub for the ESM-only `better-auth` package.
 *
 * The e2e specs boot the real AppModule graph, which imports
 * better-auth.config.ts → `better-auth` (ESM). ts-jest's CJS transform cannot
 * parse the package, so the e2e jest config maps the import here — the e2e
 * specs never exercise the better-auth provider itself (the flag is off and
 * the /ok contract is unit-tested separately).
 */
export function betterAuth(): unknown {
  return {};
}
