// Fetch and validate the platform-registry state.json.
//
// The Companion module pins to `wave-foundation@v1` (the moving major tag) so
// it picks up registry updates without a module release. Failure modes are
// **soft** — if the registry can't be reached, the module continues in
// scaffold mode rather than crashing the Companion process.

const STATE_URL =
  'https://raw.githubusercontent.com/wave-av/wave-foundation/v1/frameworks/platform-registry/state.json';

const FETCH_TIMEOUT_MS = 5000;

export interface Capability {
  repo: string;
  version?: string;
  lifecycle?: 'alpha' | 'beta' | 'ga' | 'sunsetting' | 'archived';
  planeLayer?: number | null;
  tags?: string[];
}

export interface RegistryState {
  generatedAt: string;
  capabilities: Capability[];
}

export async function fetchState(url: string = STATE_URL): Promise<RegistryState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    const raw = (await res.json()) as unknown;
    return parseState(raw);
  } finally {
    clearTimeout(timer);
  }
}

export function parseState(raw: unknown): RegistryState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('state.json is not an object');
  }
  const obj = raw as Record<string, unknown>;
  const generatedAt = typeof obj.generatedAt === 'string' ? obj.generatedAt : 'unknown';
  const capsRaw = Array.isArray(obj.capabilities) ? obj.capabilities : [];
  const capabilities: Capability[] = [];
  for (const c of capsRaw) {
    if (!c || typeof c !== 'object') continue;
    const repo = (c as Record<string, unknown>).repo;
    if (typeof repo !== 'string') continue;
    capabilities.push(c as Capability);
  }
  return { generatedAt, capabilities };
}

/**
 * Returns the set of repos a Companion action is allowed to target. If the
 * caller tries to bind an action to a repo outside this set, the module
 * refuses — that's the runtime side of the platform-registry grounding rule.
 */
export function allowedRepoTargets(state: RegistryState): Set<string> {
  return new Set(
    state.capabilities
      .filter((c) => c.lifecycle !== 'archived' && c.lifecycle !== 'sunsetting')
      .map((c) => c.repo),
  );
}
