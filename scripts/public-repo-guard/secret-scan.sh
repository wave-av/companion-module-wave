#!/usr/bin/env bash
# Foundation secret-scan (fail-closed, allowlist-aware).
#
# Mirrors the `_checks.yml` secret-scan step so the allowlist contract can be
# regression-tested locally. Lines tagged "pragma: allowlist secret" are
# skipped. `.github/.secret-allowlist` may suppress an exact file path or a
# 16+ character content needle. Short needles such as ":" or ".js" must not
# hide every `file:line:content` hit.
set -euo pipefail

HITS=$(grep -rIEn '(sk-[A-Za-z0-9]{20}|sk_(live|test)_[A-Za-z0-9]{20}|npm_[A-Za-z0-9]{30}|sbp_[a-f0-9]{40}|github_pat_[A-Za-z0-9_]{40}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30}|AIzaSy[A-Za-z0-9_-]{20}|xai-[A-Za-z0-9]{40}|xoxb-[A-Za-z0-9-]+|-----BEGIN [A-Z ]*PRIVATE KEY)' \
    --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist . | grep -v 'allowlist secret' || true)

if [ -n "$HITS" ] && [ -f .github/.secret-allowlist ]; then
  HITS=$(printf '%s\n' "$HITS" | awk '
    FNR==NR {
      raw=$0
      gsub(/\r/, "", raw)
      if (raw ~ /^[[:space:]]*$/ || raw ~ /^#/) next
      a[++n]=raw
      next
    }
    {
      line=$0
      if (line == "") next
      path=line
      sub(/:[0-9]+:.*$/, "", path)
      norm=path
      sub(/^\.\//, "", norm)
      content=line
      sub(/^[^:]+:[0-9]+:/, "", content)
      skip=0
      for (i=1; i<=n; i++) {
        e=a[i]
        if (e==path || e==norm || e=="./" norm) { skip=1; break }
        if (length(e)>=16 && index(content, e)>0) { skip=1; break }
      }
      if (!skip) print line
    }
  ' .github/.secret-allowlist -)
fi

if [ -n "$HITS" ]; then
  echo "::error::secret-like pattern found — do not commit credentials"
  echo "$HITS"
  exit 1
fi
echo "secret-scan clean"
