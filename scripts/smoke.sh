#!/usr/bin/env bash
# Smoke-test the built app (dist/) before it ships:
#   - boots `vite preview`
#   - curls key routes and fails on any non-200 / empty shell / missing #root
#   - verifies the hashed JS bundle referenced by index.html actually serves
# Curl cannot run the client-side session, so /app is verified as the SPA
# shell it serves before React guards/redirects it — a 404 or empty shell
# there is still a real regression this gate catches.
#
# Usage: bash scripts/smoke.sh   (PORT env overrides the port, default 4173)
set -euo pipefail

PORT="${PORT:-4173}"
BASE="http://127.0.0.1:${PORT}"
ROUTES=(/ /benchmark /app /app/admin)

# 1. Boot the preview server detached from this shell. The vite binary is
#    launched via node directly rather than `npm run preview`: npm goes
#    through a cmd shim on Windows whose grandchild node process can't be
#    tracked by its job PID (MSYS PID ≠ Windows PID), which leaks a stray
#    preview server. Launching the binary directly makes the job PID the
#    server process itself, so a plain `kill` cleans it up on every OS.
node node_modules/vite/bin/vite.js preview --port "${PORT}" --strictPort >/tmp/vite-preview.log 2>&1 &
PREVIEW_PID=$!
cleanup() {
  kill "${PREVIEW_PID}" 2>/dev/null || true
  pkill -P "${PREVIEW_PID}" 2>/dev/null || true
}
trap cleanup EXIT

# 2. Wait up to 60s for it to answer.
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "${BASE}/"; then
    break
  fi
  sleep 1
done
curl -sf -o /dev/null "${BASE}/" \
  || { echo "::error::vite preview never answered on :${PORT} (see /tmp/vite-preview.log)" >&2; exit 1; }

# 3. Every route must return 200 with the SPA shell (root mount present).
SHELL_HTML=""
for route in "${ROUTES[@]}"; do
  html="$(curl -sf "${BASE}${route}")" \
    || { echo "::error::${route} did not return 200" >&2; exit 1; }
  [ -n "${html}" ] || { echo "::error::${route} returned an empty body" >&2; exit 1; }
  printf '%s' "${html}" | grep -q '<div id="root">' \
    || { echo "::error::${route} missing #root mount — blank-page regression" >&2; exit 1; }
  SHELL_HTML="${html}"
  echo "OK ${route} ($(printf '%s' "${html}" | wc -c) bytes)"
done

# 4. The hashed JS bundle must exist and serve — the classic blank-page cause.
asset="$(printf '%s' "${SHELL_HTML}" | grep -oE '/assets/[^"]+\.js' | head -1)"
[ -n "${asset}" ] || { echo "::error::No JS bundle referenced in built index.html" >&2; exit 1; }
curl -sf -o /dev/null "${BASE}${asset}" \
  || { echo "::error::Bundle ${asset} missing from preview — blank-page cause" >&2; exit 1; }
echo "OK bundle ${asset}"

echo "Smoke test passed — ${#ROUTES[@]} routes + bundle served on :${PORT}"
