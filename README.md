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
| 1 — Edge | clip rendering | beta |
| 2 — Bridges | SRT/RTMP/NDI transports | beta |
| 3 — Local | local capture | beta |
| (SDK) | [`wave-av/sdk`](https://github.com/wave-av/sdk) | beta |
| (MCP) | [`wave-av/mcp-server`](https://github.com/wave-av/mcp-server) | beta |
| (Foundation) | [`wave-av/wave-foundation`](https://github.com/wave-av/wave-foundation) | ga |

This list is generated from a platform-registry `state.json` — the single
source of truth for what's real. If something isn't here, it isn't shippable
by this module.

## Configuration

| Field | Required | Default | Behavior |
|---|---|---|---|
| **Platform-registry state.json URL** (`registryUrl`) | No | _(blank)_ | Raw URL to a platform-registry `state.json`. |

This module ships with **no built-in registry URL** — there is no default
endpoint baked into the code. What `registryUrl` is set to controls which of
three states the module reports on `init()` and every config save, each
logged distinctly:

- **Not configured** — `registryUrl` is blank. The module deliberately runs
  in **scaffold mode**: it logs that dynamic capability discovery is
  disabled because no registry URL is set, and reports status `Ok`. This is
  the expected out-of-the-box state, not a failure.
- **Configured and reachable** — the registry is fetched (5s timeout) and
  parsed; the module logs how many capabilities loaded and reports status
  `Ok`.
- **Configured but unreachable** — network error, non-2xx, timeout, or bad
  JSON. The module logs a distinct warning naming the configured URL and the
  failure, reports status `UnknownWarning`, and falls back to scaffold mode.
  This never crashes the Companion process — the failure is soft by design.

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

---

<!-- wave-standard-footer -->
<sub><b><a href="https://wave.online">wave.online</a></b> &nbsp;·&nbsp; <a href="https://docs.wave.online">Docs</a> &nbsp;·&nbsp; <a href="https://dev.wave.online">Developers</a> &nbsp;·&nbsp; <a href="https://agents.wave.online">For agents</a></sub>
