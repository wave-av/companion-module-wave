// Fetch and validate the platform-registry state.json.
//
// The registry URL is supplied by the operator via Companion config — this
// module ships with no built-in registry endpoint. Failure modes are
// **soft**: if no URL is configured, or a configured registry can't be
// reached, the module continues in scaffold mode rather than crashing the
// Companion process. See `resolveRegistryState` for the state machine that
// tells those two cases apart.

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

export async function fetchState(url: string): Promise<RegistryState> {
  // Guard against a malformed config value reaching fetch() as a throw that
  // looks different from every other soft-failure mode.
  new URL(url);
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

/**
 * The three states a Companion instance can be in with respect to the
 * platform-registry, kept distinct on purpose:
 *
 * - `scaffold-unconfigured` — no registry URL is set. This is a deliberate,
 *   expected state (v0.1 ships with no default), not a failure.
 * - `loaded` — a URL is configured and the registry was fetched + parsed.
 * - `scaffold-unreachable` — a URL is configured but the fetch/parse failed
 *   (network error, non-2xx, timeout, bad JSON). Still soft-fails to
 *   scaffold mode, but this must be logged distinctly from "unconfigured" so
 *   an operator can tell "I forgot to set it" apart from "it's set but
 *   broken."
 */
export type RegistryLoadResult =
  | { mode: 'scaffold-unconfigured' }
  | { mode: 'loaded'; state: RegistryState }
  | { mode: 'scaffold-unreachable'; error: string };

export async function resolveRegistryState(
  url: string | undefined | null,
): Promise<RegistryLoadResult> {
  const trimmed = url?.trim();
  if (!trimmed) {
    return { mode: 'scaffold-unconfigured' };
  }
  try {
    const state = await fetchState(trimmed);
    return { mode: 'loaded', state };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { mode: 'scaffold-unreachable', error };
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
