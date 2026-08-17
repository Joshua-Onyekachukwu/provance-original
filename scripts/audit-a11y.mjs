#!/usr/bin/env node
/**
 * audit-a11y.mjs — repeatable accessibility audit of the app + admin
 * surfaces (keyboard nav / focus visibility, accessible names, form
 * labels, image alt, and a WCAG contrast sample), the sibling of
 * audit-responsive.mjs.
 *
 * What it does:
 *   1. Boots `vite` in mock mode (VITE_USE_MOCK=true forced) on a
 *      dedicated port with --strictPort.
 *   2. Launches headless Chromium (Playwright), signs in as the seeded
 *      mock admin, disables mock noise injection, and walks the full
 *      /app/* and /app/admin/* route inventory (plus the landing sample
 *      report surfaces) at desktop 1280.
 *   3. On every page it runs two probes:
 *        - an in-page structural probe that fails on:
 *            NO-NAME      — interactive element (button/link/input/
 *                           select/textarea/role=button) with no
 *                           accessible name (aria-label / aria-labelledby
 *                           / title / text / value / associated label),
 *            IMG-NO-ALT   — <img> without an alt attribute,
 *            NO-LABEL     — form control with no label / aria / title,
 *            CONTRAST     — text whose computed color vs nearest opaque
 *                           background falls under WCAG AA (4.5:1 body /
 *                           3:1 large) — advisory (design tokens), capped
 *                           and deduped per page.
 *        - a real-keyboard Tab-cycle probe (Playwright keyboard, so
 *          :focus-visible actually matches) that records every visible
 *          focus stop lacking an outline or ring:
 *            FOCUS-HIDDEN — keyboard focus reached an element with no
 *                           visible focus indicator.
 *   4. Prints a PASS/FAIL table per route and exits non-zero on any
 *      structural issue (no-name / img-no-alt / no-label / focus-hidden).
 *      Contrast findings are printed as advisory only.
 *
 * Usage:
 *   npm run audit:a11y                       # full walk (app + admin)
 *   AUDIT_ROUTES=uploads,security npm run audit:a11y   # quick subset
 *   AUDIT_PORT=4321 npm run audit:a11y      # port override
 *
 * Requires: npm deps installed (playwright) + `npx playwright install
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

// App + admin surfaces (the /app/* and /app/admin/* inventory from
// audit-responsive.mjs, plus the landing sample-report surfaces).
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

const PUBLIC_ROUTES = ['/', '/sample-report', '/signin'];

const ALL_ROUTES = [...APP_ROUTES, ...ADMIN_ROUTES, ...PUBLIC_ROUTES];

// One viewport — a11y findings are largely width-independent and a full
// multi-viewport walk would triple runtime for little signal.
const VIEWPORT = { name: 'desktop-1280', width: 1280, height: 800 };

const SETTLE_MS = 900;

/**
 * In-page structural probe (dependency-free, runs in the browser).
 * Returns { structural: [..], contrast: [..] }.
 */
function probeStructure() {
  const issues = { structural: [], contrast: [] };
  const push = (kind, label, detail) => issues.structural.push(`${kind}:${label} (${detail})`);

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const tagLabel = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return `${el.tagName.toLowerCase()}.${(cls.split(' ')[0] || '').replace(/[^a-zA-Z0-9_-]/g, '') || 'no-cls'}`;
  };

  // 1. Images without alt
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    if (!img.hasAttribute('alt')) push('img-no-alt', tagLabel(img), 'no alt attribute');
  }

  // 2. Accessible names on interactive elements
  const controlSel =
    'button, a[href], input, select, textarea, [role="button"], [role="checkbox"], [role="switch"], [role="radio"], [tabindex]:not([tabindex="-1"])';
  const nameOf = (el) => {
    const label = el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ')
        .trim();
      if (text) return text;
    }
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || el.getAttribute('role') === 'button' || tag === 'a') {
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) return txt;
      const ariaLabelInner = el.querySelector('[aria-label]');
      if (ariaLabelInner) return ariaLabelInner.getAttribute('aria-label').trim();
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const type = el.type || 'text';
      if (tag === 'input' && ['submit', 'button', 'reset'].includes(type)) {
        const v = (el.value || '').trim();
        if (v) return v;
      }
      const wrapped = el.closest('label');
      if (wrapped && wrapped.textContent.trim()) return wrapped.textContent.trim();
      const id = el.id;
      if (id) {
        const l = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (l && l.textContent.trim()) return l.textContent.trim();
      }
      const ph = el.getAttribute('placeholder');
      if (ph && ph.trim()) return ph.trim();
    }
    return '';
  };

  for (const el of document.querySelectorAll(controlSel)) {
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!visible(el)) continue;
    if (!nameOf(el)) push('no-name', tagLabel(el), el.tagName.toLowerCase());
  }

  // 3. Form controls without label / aria / title
  const formSel =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea';
  for (const el of document.querySelectorAll(formSel)) {
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!visible(el)) continue;
    if (
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('title')
    )
      continue;
    const id = el.id;
    let labelled = false;
    if (id) labelled = !!document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (!labelled && el.closest('label')) labelled = true;
    if (!labelled) push('no-label', tagLabel(el), `${el.tagName.toLowerCase()}[${el.type || ''}]`);
  }

  // 4. Contrast sample (advisory). NOTE: Tailwind v4 emits oklch() for its
  //    default palette, so palette-based colors (rose/sky/amber …) don't
  //    parse as rgba() here. When an element's OWN background is set but
  //    unparseable we cannot measure it — we skip the element rather than
  //    fall through to a false ancestor reading. When the own background is
  //    semi-transparent rgba, we composite it over the nearest opaque layer
  //    below (so glass buttons / 90% parchment tiles measure truthfully).
  const parseColor = (str) => {
    const m = /rgba?\(([^)]+)\)/.exec(str);
    if (!m) return null;
    const parts = m[1].split(',').map((s) => Number(s.trim()));
    if (parts.length < 3) return null;
    const alpha = parts.length === 4 ? parts[3] : 1;
    return [parts[0], parts[1], parts[2], alpha];
  };
  const lum = ([r, g, b]) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  // Returns the effective opaque background an element's text sits on, or
  // null when it can't be resolved (own bg unparseable, or a gradient stops
  // the walk). Semi-transparent rgba layers are composited bottom-up.
  const resolveBg = (el) => {
    const layers = []; // { rgb: [r,g,b], alpha } from element upward
    let p = el;
    while (p && p !== document.documentElement) {
      const s = getComputedStyle(p);
      if (s.backgroundImage !== 'none') break; // gradient — can't resolve further
      const raw = s.backgroundColor;
      if (raw && raw !== 'rgba(0, 0, 0, 0)' && raw !== 'transparent') {
        const c = parseColor(raw);
        if (c) layers.push({ rgb: [c[0], c[1], c[2]], alpha: c[3] });
        else return null; // own bg set but unparseable (oklch etc.) — can't measure
      }
      p = p.parentElement;
    }
    if (!layers.length) return null;
    // Composite from the bottom-most opaque layer upward.
    let rgb = layers[layers.length - 1].rgb.slice();
    let alpha = layers[layers.length - 1].alpha;
    for (let i = layers.length - 2; i >= 0; i -= 1) {
      const { rgb: top, alpha: a } = layers[i];
      rgb = [
        Math.round(top[0] * a + rgb[0] * (1 - a)),
        Math.round(top[1] * a + rgb[1] * (1 - a)),
        Math.round(top[2] * a + rgb[2] * (1 - a)),
      ];
      alpha = a + alpha * (1 - a);
    }
    return alpha >= 1 ? rgb : null;
  };

  const seen = new Set();
  let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (checked >= 350) break;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.tagName === 'svg' || el.tagName === 'path') continue;
    if (!visible(el)) continue;
    const directText = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ');
    if (!directText) continue;
    const s = getComputedStyle(el);
    const color = parseColor(s.color);
    const bg = resolveBg(el);
    if (!color || !bg) continue;
    const fontSize = parseFloat(s.fontSize) || 16;
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = fontSize >= 24 || (fontSize >= 18.66 && bold);
    const threshold = large ? 3.0 : 4.5;
    const r = ratio(color, bg);
    if (r < threshold) {
      const key = `${s.color}|${JSON.stringify(bg)}|${directText.slice(0, 20)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const text = directText.slice(0, 32);
      issues.contrast.push(
        `contrast:${r.toFixed(2)}:1 ${large ? '(large)' : ''} "${text}" ${s.color} on rgb(${bg.join(',')})`,
      );
    }
    checked += 1;
  }
  issues.contrast = issues.contrast.slice(0, 15);

  return issues;
}

// ---------------------------------------------------------------------------
// Vite dev server lifecycle (same direct-binary pattern as the responsive
// audit and scripts/smoke.sh).
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
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Real-keyboard Tab cycle: every visible focus stop must show an outline
 * or ring. Returns focus-stop issues as [{ el, name }].
 */
async function probeFocus(page) {
  const stops = [];
  for (let i = 0; i < 45; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      // Chromium puts keyboard focus inside the shadow DOM of date/time
      // widgets, so the host never matches :focus-visible and shows no
      // computed outline — the native field highlight IS the visible
      // indicator. Skip native-widget inputs.
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (el.tagName.toLowerCase() === 'input' && ['date', 'time', 'datetime-local', 'month', 'week'].includes(type)) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null; // off-screen stop
      const s = getComputedStyle(el);
      const hasOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const hasRing = s.boxShadow !== 'none' && s.boxShadow !== 'none, none';
      if (hasOutline || hasRing) return null; // visible indicator — fine
      const name =
        el.getAttribute('aria-label') ||
        (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) ||
        el.getAttribute('placeholder') ||
        el.tagName.toLowerCase();
      return { el: `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className.split(' ')[0] || '' : '').replace(/[^a-zA-Z0-9_-]/g, '')}`, name };
    });
    if (info) stops.push(`focus-hidden:${info.el} ("${info.name}")`);
    if (stops.length >= 8) break;
  }
  return stops;
}

async function auditRoute(page, route, failures) {
  let loadError = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(SETTLE_MS);
  } catch (error) {
    loadError = error.message.split('\n')[0];
  }

  if (loadError) {
    failures.push({ route, issues: [`load-failed: ${loadError}`] });
    console.log(`FAIL  ${route} — ${loadError}`);
    return;
  }

  const { structural, contrast } = await page.evaluate(probeStructure);
  const focus = await probeFocus(page);
  const structuralAll = [...structural, ...focus];

  if (structuralAll.length > 0) {
    failures.push({ route, issues: structuralAll });
    console.log(`FAIL  ${route}`);
    for (const issue of structuralAll.slice(0, 12)) console.log(`        - ${issue}`);
  } else {
    console.log(`PASS  ${route}`);
  }
  for (const c of contrast) console.log(`  advisory ${route}: ${c}`);
}

async function main() {
  const subset = (process.env.AUDIT_ROUTES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const routes = subset.length
    ? ALL_ROUTES.filter((route) => subset.some((needle) => route.includes(needle)))
    : ALL_ROUTES;

  console.log(`audit:a11y — ${routes.length} routes (vite mock mode on :${PORT})`);
  if (subset.length) console.log(`  (subset: ${subset.join(', ')})`);

  const vite = await bootVite();
  let browser;
  const failures = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
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
      console.error(`sign-in failed: ${error.message.split('\n')[0]}`);
      await context.close();
      process.exit(2);
    }
    for (const route of routes) {
      await auditRoute(page, route, failures);
    }
    await context.close();
  } finally {
    if (browser) await browser.close();
    vite.kill('SIGKILL');
  }

  const total = routes.length;
  const failed = failures.length;
  console.log(`\n${total - failed}/${total} routes structurally clean`);

  if (failed > 0) {
    console.error(`\n${failed} route(s) failed the a11y gate (names/labels/alt/focus):`);
    for (const f of failures) {
      console.error(`  ${f.route}: ${f.issues.slice(0, 8).join(' | ')}`);
    }
    console.error('  contrast findings are advisory — review separately.');
    process.exit(1);
  }
  console.log('\na11y audit passed — no missing names/labels/alt or hidden keyboard focus stops');
  console.log('  (contrast advisory output above, if any)');
  process.exit(0);
}

main().catch((error) => {
  console.error(`\naudit:a11y script error: ${error.message}`);
  process.exit(1);
});
