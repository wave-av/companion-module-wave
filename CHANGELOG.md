# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — Phase G rebuild

### Changed
- **README rewritten** — removed claims of "WAVE Cloud Switcher", "Camera
  Control", "Replay Engine", "Ghost Producer" and the 12 fake actions. Those
  products do not exist; the previous README predated the platform build-out.
- Module is now **registry-grounded** — on `init()` it fetches
  `wave-foundation/frameworks/platform-registry/state.json` and surfaces the
  current platform topology.

### Added
- TypeScript scaffold (`src/index.ts`, `src/registry.ts`) using
  `@companion-module/base` v1.11+.
- `companion/manifest.json` (Companion v3 manifest format).
- `capabilities.json` registering this module in the platform-registry.
- `tsconfig.json`, `package.json`, stdlib `node:test` test suite.
- AGENTS.md grounding rule pointing at `state.json`.

### Removed
- All previously-claimed actions (`switch_source`, `trigger_transition`,
  `fade_to_black`, `toggle_keyer`, `recall_preset`, `mark_poi`,
  `start_stream`, `stop_stream`, `start_recording`, `stop_recording`,
  `trigger_macro`, `ghost_producer_toggle`). None were ever implemented.

### Roadmap follow-ups
- v0.2 actions are blocked on `wave-desktop` adding a localhost control plane
  (HTTP or WebSocket). Tracked as a wave-desktop feature follow-up.
