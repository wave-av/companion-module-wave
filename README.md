# companion-module-wave

[Bitfocus Companion](https://bitfocus.io/companion) module for **WAVE**.

> **Alpha — scaffolding only.** This module is registry-aligned but the action
> surface is intentionally empty until the host application
> (`wave-av/wave-desktop`) exposes a local control plane. See
> [Roadmap](#roadmap) below for what needs to land before actions / feedbacks /
> variables can be implemented.

## What WAVE actually is

WAVE is an **open protocol + one API** for live signal — not a single product.
Companion controls the **operator console** (`wave-desktop`, an Electron
on-prem app), which is the WAVE Protocol Plane's Layer 0.

The platform map this module grounds against:

| Layer | Repo | Lifecycle |
|---|---|---|
| 0 — Operator | [`wave-av/wave-desktop`](https://github.com/wave-av/wave-desktop) | alpha |
| 1 — Edge | [`wave-av/wave-clip-engine`](https://github.com/wave-av/wave-clip-engine) | beta |
| 2 — Bridges | [`wave-av/wave-transports`](https://github.com/wave-av/wave-transports) | beta |
| 3 — Local | [`wave-av/wave-flash`](https://github.com/wave-av/wave-flash) | beta |
| (SDK) | [`wave-av/sdk`](https://github.com/wave-av/sdk) | beta |
| (MCP) | [`wave-av/mcp-server`](https://github.com/wave-av/mcp-server) | beta |
| (Foundation) | [`wave-av/wave-foundation`](https://github.com/wave-av/wave-foundation) | ga |

This list is generated from
[`wave-foundation/frameworks/platform-registry/state.json`](https://github.com/wave-av/wave-foundation/blob/master/frameworks/platform-registry/state.json),
the single source of truth for what's real. If something isn't here, it isn't
shippable by this module.

## ⚠️ Erratum — previous README

The previous README claimed 12 actions for "WAVE Cloud Switcher", "Camera
Control", "Replay Engine", and "Ghost Producer". **None of those products
exist.** Earlier descriptions were written months before the platform was
built, and the registry exposed the drift. This rebuild corrects it. The
canonical platform shape lives in `state.json`; if an agent (or human) tries
to add an action for a product not in `state.json`, the foundation
`validate-capabilities` workflow will fail the PR.

## Roadmap

### v0.1 — scaffold (this rebuild)

- ✅ Companion v3 module manifest + package.json
- ✅ TypeScript scaffold (`src/index.ts`) that loads, prints version, idles
- ✅ Registry grounding — module fetches `state.json` on `init()` and rejects
  configuration that targets a repo not in the registry
- ✅ `capabilities.json` registered in the platform-registry
- ✅ No fake actions / feedbacks / variables

### v0.2 — minimum useful surface (blocked on `wave-desktop` local control plane)

- ⏳ `desktop.monitor.connect` — bind a feed to wave-monitor (slug-addressed)
- ⏳ `desktop.monitor.disconnect`
- ⏳ Variable: `auth.signed_in` (boolean, polled)
- ⏳ Feedback: `monitor.connected` (true when feed is active)

These can't be implemented yet because `wave-desktop` exposes no localhost
HTTP / WebSocket control plane today. The companion-module is a Companion
process (Node.js running outside the Electron sandbox), so it needs a
network-addressable surface — IPC is not enough. **The dependency on
wave-desktop adding that surface is tracked as a follow-up.**

### v0.3 — multiviewer + plugins

Pending Phase D landing for `wave-monitor`, `wave-multiviewer`,
`obs-wave-plugin`, `vmix-wave-integration` — once those capabilities.json
files are merged, their exposed control surfaces become legal action sources
here.

## For maintainers

- Every PR that adds an action / feedback / variable MUST verify the target
  surface appears in `state.json` (the `validate-capabilities` workflow does
  this automatically on PR open).
- Read `AGENTS.md` before touching the module — it documents the grounding
  contract.

## License

[MIT](./LICENSE)
