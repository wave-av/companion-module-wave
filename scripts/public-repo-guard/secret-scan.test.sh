#!/usr/bin/env bash
# Regression: .github/.secret-allowlist must not wipe every grep -n hit.
# Synthetic secret-shaped strings only. Never live credentials.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCANNER="$ROOT/scripts/public-repo-guard/secret-scan.sh"
fail=0
# Matches sk-[A-Za-z0-9]{20} without being a real token. Built at runtime so
# this file does not itself trip the live scan.
FAKE="sk-$(python3 -c 'print("a" * 20)')"

run_scan() {
  local tree="$1"
  (
    cd "$tree"
    bash scripts/public-repo-guard/secret-scan.sh
  )
}

expect_block() {
  local name="$1" tree="$2"
  local rc=0
  out="$(run_scan "$tree" 2>&1)" || rc=$?
  if (( rc == 0 )) || [[ "$out" == *"secret-scan clean"* ]]; then
    echo "FAIL: $name - expected block, scan exited 0"
    fail=$((fail + 1))
  else
    echo "PASS: $name - scan blocked"
  fi
}

expect_clean() {
  local name="$1" tree="$2"
  local rc=0
  out="$(run_scan "$tree" 2>&1)" || rc=$?
  if (( rc != 0 )) || [[ "$out" != *"secret-scan clean"* ]]; then
    echo "FAIL: $name - expected clean, rc=$rc"
    printf '%s\n' "$out" | tail -n 20
    fail=$((fail + 1))
  else
    echo "PASS: $name - scan clean"
  fi
}

make_tree() {
  local tree="$1"
  mkdir -p "$tree/scripts/public-repo-guard" "$tree/.github"
  cp "$SCANNER" "$tree/scripts/public-repo-guard/secret-scan.sh"
  printf 'const x = "%s";\n' "$FAKE" >"$tree/app.js"
}

WORKDIR="$(mktemp -d)"
trap 'rm -rf -- "$WORKDIR"' EXIT

t="$WORKDIR/no-allowlist"
make_tree "$t"
expect_block "secret-shaped line is blocked" "$t"

t="$WORKDIR/colon-allowlist"
make_tree "$t"
printf ':\n' >"$t/.github/.secret-allowlist"
expect_block "colon allowlist must not hide hits" "$t"

t="$WORKDIR/js-ext-allowlist"
make_tree "$t"
printf '.js\n' >"$t/.github/.secret-allowlist"
expect_block "short extension allowlist must not hide hits" "$t"

t="$WORKDIR/path-allowlist"
make_tree "$t"
printf 'app.js\n' >"$t/.github/.secret-allowlist"
expect_clean "exact path allowlist still suppresses that file" "$t"

t="$WORKDIR/content-allowlist"
make_tree "$t"
printf '%s\n' "$FAKE" >"$t/.github/.secret-allowlist"
expect_clean "long content needle still suppresses that hit" "$t"

if (( fail > 0 )); then
  echo "secret-scan.test.sh: ${fail} failure(s)"
  exit 1
fi
echo "secret-scan.test.sh: all passed"
