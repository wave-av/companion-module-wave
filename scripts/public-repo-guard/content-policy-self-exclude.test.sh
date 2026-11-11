#!/usr/bin/env bash
# Regression: content-policy must scan files next to the scanner, not the whole
# scripts/public-repo-guard/ directory. Synthetic BLOCK strings only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/public-repo-guard/content-policy.sh"
fail=0

# Build BLOCK shapes at runtime so this test file itself does not match.
zeros="$(python3 -c 'print("0" * 32)')"
BLOCK_CF="account_id = \"${zeros}\""

run_policy() {
  local tree="$1"
  (
    cd "$tree"
    unset GUARD_PRIVATE_REPOS || true
    bash "$SCRIPT" .
  )
}

expect_block() {
  local name="$1" tree="$2"
  local rc=0
  out="$(run_policy "$tree" 2>&1)" || rc=$?
  if (( rc == 0 )) || [[ "$out" == *"content policy OK"* ]]; then
    echo "FAIL: $name: expected BLOCK, gate exited 0"
    fail=$((fail + 1))
  else
    echo "PASS: $name: gate blocked"
  fi
}

expect_ok() {
  local name="$1" tree="$2"
  local rc=0
  out="$(run_policy "$tree" 2>&1)" || rc=$?
  if (( rc != 0 )) || [[ "$out" != *"content policy OK"* ]]; then
    echo "FAIL: $name: expected OK, rc=$rc"
    printf '%s\n' "$out" | tail -n 20
    fail=$((fail + 1))
  else
    echo "PASS: $name: gate clean"
  fi
}

WORKDIR="$(mktemp -d)"
trap 'rm -rf -- "$WORKDIR"' EXIT

t="$WORKDIR/plain-block"
mkdir -p "$t"
printf '%s\n' "$BLOCK_CF" >"$t/leak.txt"
expect_block "plain BLOCK hit" "$t"

t="$WORKDIR/scanner-dir-hide"
mkdir -p "$t/scripts/public-repo-guard"
cp "$SCRIPT" "$t/scripts/public-repo-guard/content-policy.sh"
printf '%s\n' "$BLOCK_CF" >"$t/scripts/public-repo-guard/hidden.txt"
expect_block "scanner directory must not hide BLOCK hits" "$t"

t="$WORKDIR/scanner-dir-dotenv"
mkdir -p "$t/scripts/public-repo-guard"
cp "$SCRIPT" "$t/scripts/public-repo-guard/content-policy.sh"
printf 'FOO=bar\n' >"$t/scripts/public-repo-guard/.env"
expect_block "scanner directory must not hide committed .env" "$t"

t="$WORKDIR/gitleaks-toml-hide"
mkdir -p "$t"
printf '%s\n' "$BLOCK_CF" >"$t/.gitleaks.toml"
expect_block ".gitleaks.toml must not hide BLOCK hits" "$t"

expect_ok "live tree" "$ROOT"

if (( fail > 0 )); then
  echo "content-policy-self-exclude.test.sh: ${fail} failure(s)"
  exit 1
fi
echo "content-policy-self-exclude.test.sh: all passed"
