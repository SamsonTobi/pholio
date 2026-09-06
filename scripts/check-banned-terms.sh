#!/usr/bin/env bash
set -e

echo "Checking for banned P-word in apps/, packages/, workers/..."

# Search for the banned word case-insensitively
FOUND=$(grep -rnI --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist -i "portfolio" apps/ packages/ workers/ || true)

if [ -n "$FOUND" ]; then
  echo "Error: Banned P-word found in code:"
  echo "$FOUND"
  exit 1
fi

echo "Clean! No banned terms found."
