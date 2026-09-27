#!/usr/bin/env bash
# ponytail: warm every page route once so dev compiles it up front instead of
# on first click. Turbopack then rebuilds warmed entries on each change.
# API routes are skipped on purpose: a GET to one may have side effects.
set -u
PORT="${PORT:-4444}"
BASE="http://localhost:$PORT"

# Route paths straight from the filesystem: no list to keep in sync.
routes=$(cd src/app && find . -name page.tsx \
  | sed -E -e 's|^\./||' -e 's|page\.tsx$||' -e 's|\([^)]*\)/||g' -e 's|/$||' \
  | sed -E 's|^|/|' | sort -u)

# Wait for the server (up to 2 min).
for _ in $(seq 120); do
  curl -sf -o /dev/null "$BASE/api/version" && break
  sleep 1
done

# Serial on purpose: parallel warmup races Turbopack's _buildManifest writes
# and floods the log with ENOENT .tmp errors.
for r in $routes; do
  curl -s -o /dev/null -m 180 -H 'x-warmup: 1' "$BASE$r"
done
echo "[warm-routes] warmed:" $routes
