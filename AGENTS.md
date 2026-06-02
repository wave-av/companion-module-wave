# AGENTS.md — wave-av/companion-module-wave

Agent contract for this repo. Inherits the org default (<https://github.com/wave-av/.github/blob/main/AGENTS.md>) and the [repo-governance standard](https://github.com/wave-av/wave-foundation/blob/master/frameworks/repo-governance/governance-matrix.md).

## ⚠️ Grounding rule (Phase F)

Before adding an action, feedback, or variable that targets any WAVE repo:

1. Read [`wave-foundation/frameworks/platform-registry/state.json`](https://github.com/wave-av/wave-foundation/blob/master/frameworks/platform-registry/state.json).
2. If the target repo / endpoint / event is not in `state.json`, **do not add the action**. The previous README for this module made up actions for products that did not exist — the registry exists to prevent that recurring.
3. When adding a real action, update this module's `capabilities.json` in the same PR (the `validate-capabilities` workflow enforces this).

Apply the four grounding rules from [`wave-foundation/frameworks/platform-registry/AGENT-GROUNDING.md`](https://github.com/wave-av/wave-foundation/blob/master/frameworks/platform-registry/AGENT-GROUNDING.md).

## Build and test

- `npm install`
- `npm run typecheck`
- `npm test`

## Rules

- Branch and open a PR; never push to the default branch. All required gates must pass before merge.
- No secrets in commits — secret-scan is a required gate and will block.
- Conventional Commit titles (lowercase subject — the `Semantic PR Title` gate rejects capital first letters); update `CHANGELOG.md` (`Unreleased`) for user-facing changes.
- Match the existing code conventions; keep files focused (~200-500 lines).
- v0.1 is **scaffold only**. Do not add fake actions to "look complete" — that's the failure mode this rebuild fixes.

## Security

Report vulnerabilities via the [Security Policy](https://github.com/wave-av/.github/blob/main/SECURITY.md) (security@wave.online) — never in a public issue.
