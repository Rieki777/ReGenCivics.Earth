#!/usr/bin/env bash
# =============================================================================
# audit-cdn-images.sh
# Scans the codebase for all assets.regencivics.earth URLs and checks which
# ones return 404 (or other errors). Run this before any deployment.
#
# Usage:
#   cd /path/to/regen-civics-clean
#   bash scripts/audit-cdn-images.sh
#
# Requirements: curl
# =============================================================================

set -euo pipefail

CDN_BASE="https://assets.regencivics.earth"
SRC_DIR="client/src"
FAIL=0
PASS=0
SKIP=0

# Bold/color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}=== ReGen Civics CDN Image Audit ===${RESET}"
echo -e "Scanning ${SRC_DIR} for assets.regencivics.earth URLs..."
echo ""

# Extract all unique CDN URLs (excluding video mp4s unless you want those too)
URLS=$(grep -r "assets\.regencivics\.earth" "$SRC_DIR" \
  | grep -o "https://assets\.regencivics\.earth/[^\"' >)]*" \
  | grep -v "/quests$" \
  | sort -u)

# Track results
declare -a BROKEN=()
declare -a OK=()

while IFS= read -r url; do
  # Skip template URLs (contain ${...})
  if [[ "$url" == *'${'* ]]; then
    ((SKIP++)) || true
    echo -e "  ${YELLOW}SKIP${RESET}  $url  (template — checked at runtime)"
    continue
  fi

  # Use curl HEAD request; follow redirects; 5s timeout
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" \
    --max-time 5 \
    --retry 2 \
    -L \
    -A "Mozilla/5.0 CDN-Audit/1.0" \
    -I "$url" 2>/dev/null || echo "ERR")

  if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "206" ]]; then
    ((PASS++)) || true
    echo -e "  ${GREEN}OK  ${RESET} [$HTTP_CODE]  $url"
    OK+=("$url")
  elif [[ "$HTTP_CODE" == "ERR" ]]; then
    ((FAIL++)) || true
    echo -e "  ${RED}FAIL${RESET} [NET]  $url"
    BROKEN+=("$url")
  else
    ((FAIL++)) || true
    echo -e "  ${RED}FAIL${RESET} [$HTTP_CODE]  $url"
    BROKEN+=("$url")
  fi
done <<< "$URLS"

echo ""
echo -e "${CYAN}=== Results ===${RESET}"
echo -e "  ${GREEN}OK:${RESET}     $PASS"
echo -e "  ${RED}BROKEN:${RESET} $FAIL"
echo -e "  ${YELLOW}SKIPPED:${RESET} $SKIP (runtime templates)"

if [[ ${#BROKEN[@]} -gt 0 ]]; then
  echo ""
  echo -e "${RED}Broken URLs (need fixing):${RESET}"
  for url in "${BROKEN[@]}"; do
    # Try to find which file(s) use this URL
    FILES=$(grep -rl "$url" "$SRC_DIR" 2>/dev/null | tr '\n' ' ' || echo "unknown")
    echo "  $url"
    echo "    → used in: $FILES"
  done
  echo ""
  echo -e "${YELLOW}Fix options for each broken URL:${RESET}"
  echo "  1. Upload the image to Cloudflare R2 at assets.regencivics.earth"
  echo "  2. Replace the CDN URL with a local path: /images/<folder>/<name>.png"
  echo "     (put the file in client/public/images/<folder>/)"
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}All CDN images are reachable. You're good to deploy.${RESET}"
echo ""
