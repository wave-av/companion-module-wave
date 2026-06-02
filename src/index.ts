// companion-module-wave entry point.
//
// v0.1 ships an empty action / feedback / variable surface on purpose — the
// host application (`wave-av/wave-desktop`) exposes no localhost control plane
// yet, so there is nothing legitimate to wire up. Adding fake actions is the
// exact failure mode the platform-registry rebuild is correcting.
//
// On init() we fetch `state.json` from wave-foundation@v1 and surface the
// current platform state to the user via a status message + log line. Once
// `wave-desktop` lands its control surface, v0.2 will wire real actions here.

import {
  InstanceBase,
  InstanceStatus,
  runEntrypoint,
  type SomeCompanionConfigField,
} from '@companion-module/base';
import { fetchState, type RegistryState } from './registry.js';

interface WaveConfig {
  desktopHost: string; // intentionally unused in v0.1; reserved for v0.2
  desktopPort: number;
}

class WaveInstance extends InstanceBase<WaveConfig> {
  private state: RegistryState | null = null;

  async init(config: WaveConfig): Promise<void> {
    this.updateStatus(InstanceStatus.Connecting, 'fetching platform-registry state.json');
    try {
      this.state = await fetchState();
      const repos = this.state.capabilities.length;
      const gen = this.state.generatedAt;
      this.log('info', `platform-registry loaded: ${repos} repos (generated ${gen})`);
      this.updateStatus(
        InstanceStatus.Ok,
        `v0.1 scaffold (registry: ${repos} repos) — actions land in v0.2`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log('warn', `could not load platform-registry state.json: ${message}`);
      this.updateStatus(
        InstanceStatus.UnknownWarning,
        'platform-registry unreachable; module is running in scaffold mode',
      );
    }
    this.setActionDefinitions({});
    this.setFeedbackDefinitions({});
    this.setVariableDefinitions([]);
  }

  async destroy(): Promise<void> {
    this.state = null;
  }

  async configUpdated(config: WaveConfig): Promise<void> {
    // No-op in v0.1 — config fields are reserved for v0.2.
    this.log('debug', `config update received (host=${config.desktopHost}:${config.desktopPort})`);
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return [
      {
        type: 'static-text',
        id: 'info',
        label: 'About',
        width: 12,
        value:
          'WAVE Companion module v0.1 is a registry-grounded scaffold. Actions / feedbacks / variables land in v0.2 once wave-desktop exposes a local control plane. See the repo README Roadmap.',
      },
      {
        type: 'textinput',
        id: 'desktopHost',
        label: 'wave-desktop host (reserved for v0.2)',
        width: 8,
        default: '127.0.0.1',
      },
      {
        type: 'number',
        id: 'desktopPort',
        label: 'wave-desktop port (reserved for v0.2)',
        width: 4,
        default: 31415,
        min: 1,
        max: 65535,
      },
    ];
  }
}

runEntrypoint(WaveInstance, []);
