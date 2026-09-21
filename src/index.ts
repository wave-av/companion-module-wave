// companion-module-wave entry point.
//
// v0.1 ships an empty action / feedback / variable surface on purpose — the
// host application (`wave-av/wave-desktop`) exposes no localhost control plane
// yet, so there is nothing legitimate to wire up. Adding fake actions is the
// exact failure mode the platform-registry rebuild is correcting.
//
// On init() (and on every configUpdated()) we resolve the platform-registry
// state from the operator-configured `registryUrl` and surface the current
// platform state to the user via a status message + log line. This module
// ships with no built-in registry endpoint — if `registryUrl` is left blank
// the module runs in scaffold mode deliberately, distinct from a configured
// URL that's merely unreachable. Once `wave-desktop` lands its control
// surface, v0.2 will wire real actions here.

import {
  InstanceBase,
  InstanceStatus,
  runEntrypoint,
  type SomeCompanionConfigField,
} from '@companion-module/base';
import { resolveRegistryState, type RegistryState } from './registry.js';

interface WaveConfig {
  registryUrl?: string;
  desktopHost: string; // intentionally unused in v0.1; reserved for v0.2
  desktopPort: number;
}

class WaveInstance extends InstanceBase<WaveConfig> {
  private state: RegistryState | null = null;

  async init(config: WaveConfig): Promise<void> {
    await this.loadRegistry(config);
    this.setActionDefinitions({});
    this.setFeedbackDefinitions({});
    this.setVariableDefinitions([]);
  }

  async destroy(): Promise<void> {
    this.state = null;
  }

  async configUpdated(config: WaveConfig): Promise<void> {
    this.log('debug', `config update received (host=${config.desktopHost}:${config.desktopPort})`);
    await this.loadRegistry(config);
  }

  /**
   * Resolves the platform-registry state from config.registryUrl and maps
   * each of the three states (unconfigured / loaded / unreachable) to a
   * distinct log line + status, per the module's soft-failure contract.
   */
  private async loadRegistry(config: WaveConfig): Promise<void> {
    const url = config.registryUrl?.trim();
    if (url) {
      this.updateStatus(InstanceStatus.Connecting, `fetching platform-registry state.json from ${url}`);
    }

    const result = await resolveRegistryState(url);
    switch (result.mode) {
      case 'scaffold-unconfigured': {
        this.state = null;
        this.log(
          'info',
          'no platform-registry URL configured; dynamic capability discovery is disabled — running in scaffold mode',
        );
        this.updateStatus(
          InstanceStatus.Ok,
          'v0.1 scaffold (no registry configured) — set a registry URL to enable capability discovery',
        );
        break;
      }
      case 'loaded': {
        this.state = result.state;
        const repos = result.state.capabilities.length;
        const gen = result.state.generatedAt;
        this.log('info', `platform-registry loaded: ${repos} repos (generated ${gen})`);
        this.updateStatus(
          InstanceStatus.Ok,
          `v0.1 scaffold (registry: ${repos} repos) — actions land in v0.2`,
        );
        break;
      }
      case 'scaffold-unreachable': {
        this.state = null;
        this.log(
          'warn',
          `platform-registry is configured but unreachable: ${result.error}; module is running in scaffold mode`,
        );
        this.updateStatus(
          InstanceStatus.UnknownWarning,
          'platform-registry unreachable; module is running in scaffold mode',
        );
        break;
      }
    }
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
        id: 'registryUrl',
        label: 'Platform-registry state.json URL',
        width: 12,
        default: '',
        tooltip:
          'Raw URL to your platform-registry state.json. Leave blank to run in scaffold mode (dynamic capability discovery disabled).',
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
