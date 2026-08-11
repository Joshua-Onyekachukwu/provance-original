#!/usr/bin/env node
/**
 * audit-responsive.mjs — repeatable responsive layout gate (768px tablet /
 * 1280px desktop), the permanent CI successor to the one-off browser passes.
 *
 * What it does:
 *   1. Boots `vite` in mock mode (VITE_USE_MOCK=true is forced so ambient
 *      shell env can't flip it) on a dedicated port with --strictPort.
 *   2. Launches headless Chromium (Playwright), and for each viewport
 *      (768×1024, 1280×800):
 *        - signs in as the seeded mock admin (founder.admin@provance.local),
 *        - disables mock noise injection (localStorage provance.mock.noisy.v1)
 *          so error states can't flake the audit,
 *        - walks the full route inventory (public + /app/* + /app/admin/*,
 *          including the dynamic report routes with a real mock scan id).
 *   3. On every page it evaluates an in-page probe that fails on:
 *        - PAGE-OVERFLOW   — documentElement.scrollWidth exceeds clientWidth
 *                            by more than 2px (the page is wider than the
 *                            viewport — the classic grid/table regression),
 *        - CLIPPED         — a visible in-flow element's right edge extends
 *                            past the viewport (or it is wider than the
 *                            viewport) and it is NOT inside an intentionally
 *                            horizontal-scrollable container. Fixed/absolute
 *                            elements (drawers, modals) and SVG internals are
 *                            exempt; overflow:hidden containers are NOT exempt
 *                            — that is exactly the clipping bug class the
 *                            overflow-hidden → overflow-x-auto sweep fixed.
 *   4. Prints a PASS/FAIL table per route/viewport and exits non-zero on any
 *      issue, so CI fails on the regression class, not just on crashes.
 *
 * Usage:
 *   npm run audit:responsive          # full walk (52 routes × 2 viewports)
 *   AUDIT_ROUTES=uploads,analytics npm run audit:responsive   # quick subset
 *   AUDIT_PORT=4321 npm run audit:responsive                  # port override
 *
 * Requires: npm deps installed (playwright) + `npx playwright install
 * chromium`. CI installs the browser with `npx playwright install --with-deps
 * chromium`.
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const PORT = Number(process.env.AUDIT_PORT || 4399);
const BASE = `http://127.0.0.1:${PORT}`;

const ADMIN_EMAIL = 'founder.admin@provance.local';
const ADMIN_PASSWORD = 'test-password-123';
const NOISE_STORAGE_KEY = 'provance.mock.noisy.v1';

// ---------------------------------------------------------------------------
// Route inventory — every route the SPA renders, with mock ids for dynamic
// routes. New pages must be added here to stay under the gate.
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/product',
  '/methodology',
  '/pricing',
  '/security',
  '/sample-report',
  '/sample-report/print',
  '/benchmark',
  '/docs',
  '/resources',
  '/privacy',
  '/terms',
  '/cookies',
  '/waitlist',
  '/signin',
  '/accept-invite',
  '/reset-password',
  '/reset-password/confirm',
  '/ui-kit',
];

const APP_ROUTES = [
  '/app',
  '/app/uploads',
  '/app/reports',
  '/app/reports/scan_001',
  '/app/reports/scan_001/print',
  '/app/account',
  '/app/activity',
  '/app/queue',
  '/app/history',
  '/app/organization',
  '/app/billing',
  '/app/api-keys',
  '/app/webhooks',
  '/app/docs',
  '/app/security',
  '/app/notifications',
  '/app/help',
  '/app/access-denied',
  '/app/team',
];

const ADMIN_ROUTES = [
  '/app/admin',
  '/app/admin/waitlist',
  '/app/admin/users',
  '/app/admin/organizations',
  '/app/admin/jobs',
  '/app/admin/reports',
  '/app/admin/analytics',
  '/app/admin/monitoring',
  '/app/admin/feature-flags',
  '/app/admin/roles',
  '/app/admin/audit-logs',
  '/app/admin/settings',
];

const ALL_ROUTES = [...PUBLIC_ROUTES, ...APP_ROUTES, ...ADMIN_ROUTES];

const VIEWPORTS = [
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

// Settle time after each navigation: mock API delays run up to ~600ms and
// chart panels animate in — reading layout mid-transition would flake.
const SETTLE_MS = 1100;

/**
 * In-page probe. Returns an array of issue strings; empty = clean page.
 * Kept dependency-free so it runs inside the browser context.
 */
function probeLayout() {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const issues = [];

  const overflowX = doc.scrollWidth - vw;
  if (overflowX > 2) issues.push(`page-overflow:+${overflowX}px`);

  const isInsideScrollable = (el) => {
    let p = el.parentElement;
    while (p) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX)) return true;
      if (p.tagName.toLowerCase() === 'svg') return true; // svg clips its own children
      p = p.parentElement;
    }
    return false;
  };

  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (seen.has(el)) continue;
    seen.add(el);

    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    if (style.position === 'fixed' || style.position === 'absolute') continue; // off-canvas/modal allowed

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (isInsideScrollable(el)) continue;

    if (rect.width > vw + 2 || rect.right > vw + 2) {
      const cls = typeof el.className === 'string' ? el.className : '';
      const label = `${el.tagName.toLowerCase()}.${(cls.split(' ')[0] || '').replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const detail = `left=${Math.round(rect.left)} right=${Math.round(rect.right)} w=${Math.round(rect.width)}`;
      issues.push(`clipped:${label} (${detail})`);
    }
  }

  // Dedupe + cap so one broken panel can't flood the report.
  const unique = [...new Set(issues)];
  return unique.slice(0, 25);
}

// ---------------------------------------------------------------------------
// Vite dev server lifecycle (same direct-binary pattern as scripts/smoke.sh —
// the job PID must be the server process itself for reliable cleanup on every
// OS, including Windows cmd-shim situations).
// ---------------------------------------------------------------------------
async function bootVite() {
  const child = spawn(
    process.execPath,
    [
      resolve(ROOT, 'node_modules/vite/bin/vite.js'),
      '--port',
      String(PORT),
      '--strictPort',
    ],
    {
      cwd: ROOT,
      env: { ...process.env, VITE_USE_MOCK: 'true' },
      stdio: 'ignore',
    },
  );
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  child.kill('SIGKILL');
  throw new Error(`vite never answered on :${PORT}`);
}

async function signIn(page) {
  await page.goto(`${BASE}/signin`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => window.location.pathname.startsWith('/app'),
    null,
    { timeout: 20_000 },
  );
  // Let the dashboard (and its poll) settle before the first audit.
  await page.waitForTimeout(SETTLE_MS);
}

async function auditRoute(page, route, viewport, failures) {
  let loadError = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(SETTLE_MS);
  } catch (error) {
    loadError = error.message.split('\n')[0];
  }

  if (loadError) {
    failures.push({ route, viewport: viewport.name, issues: [`load-failed: ${loadError}`] });
    console.log(`FAIL  [${viewport.name}] ${route} — ${loadError}`);
    return;
  }

  const issues = await page.evaluate(probeLayout);
  if (issues.length > 0) {
    failures.push({ route, viewport: viewport.name, issues });
    console.log(`FAIL  [${viewport.name}] ${route}`);
    for (const issue of issues) console.log(`        - ${issue}`);
  } else {
    console.log(`PASS  [${viewport.name}] ${route}`);
  }
}

async function main() {
  // ── Optional quick subset (AUDIT_ROUTES=uploads,analytics) ────────────────
  const subset = (process.env.AUDIT_ROUTES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const routes = subset.length
    ? ALL_ROUTES.filter((route) =>
        subset.some((needle) => route.includes(needle)),
      )
    : ALL_ROUTES;

  console.log(`audit:responsive — ${routes.length} routes × ${VIEWPORTS.length} viewports (vite mock mode on :${PORT})`);
  if (subset.length) console.log(`  (subset: ${subset.join(', ')})`);

  const vite = await bootVite();
  let browser;
  const failures = [];

  try {
    browser = await chromium.launch({ headless: true });
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      // Noise off from the very first script run — before any route loads.
      await context.addInitScript((key) => {
        try {
          window.localStorage.setItem(key, '0');
        } catch {
          /* storage unavailable — page still renders */
        }
      }, NOISE_STORAGE_KEY);

      const page = await context.newPage();
      try {
        await signIn(page);
      } catch (error) {
        console.error(`sign-in failed at ${viewport.name}: ${error.message.split('\n')[0]}`);
        await context.close();
        continue;
      }
      for (const route of routes) {
        await auditRoute(page, route, viewport, failures);
      }
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    vite.kill('SIGKILL');
  }

  const total = routes.length * VIEWPORTS.length;
  const failed = failures.length;
  console.log(`\n${total - failed}/${total} page audits clean`);

  if (failed > 0) {
    console.error(`\n${failed} page(s) failed the responsive gate (768/1280):`);
    console.error('  overflow/clipped regression — fix the layout or add a scroll container.');
    process.exit(1);
  }
  console.log('\nresponsive audit passed — no page-level overflow or clipped in-flow elements at 768/1280');
  process.exit(0);
}

main().catch((error) => {
  console.error(`\naudit:responsive script error: ${error.message}`);
  process.exit(1);
});
