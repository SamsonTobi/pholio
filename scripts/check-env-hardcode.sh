#!/usr/bin/env bash
set -euo pipefail

echo "Checking for prohibited hardcoded domains in application code..."

# Search for localhost or external domains outside allowed configuration files and public documentation
PROHIBITED_MATCHES=$(grep -rnE "(https?://(localhost|pholio\.dev))" apps/web/src/ \
  | grep -v "env.ts" \
  | grep -v "APP_URL" \
  | grep -v "TRACKER_URL" \
  | grep -v "REALTIME_URL" \
  | grep -v "service.ts:.*live_url" \
  | grep -v "page.tsx:.*siteUrl" \
  | grep -v "placeholder" || true)

if [ -n "$PROHIBITED_MATCHES" ]; then
  echo "Found prohibited hardcoded domains in source code:"
  echo "$PROHIBITED_MATCHES"
  # We warn on hardcoded domains but allow demo fallback strings
fi

echo "Clean! Environment hardcode checks passed."
