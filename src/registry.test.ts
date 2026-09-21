// Tests for the platform-registry grounding helpers. These are stdlib-only
// (node:test + node:assert) so they run on bare CI without an extra test runner.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { parseState, allowedRepoTargets, resolveRegistryState } from './registry.ts';

describe('parseState', () => {
  it('accepts a minimal valid state.json', () => {
    const parsed = parseState({
      generatedAt: '2026-06-02T00:00:00.000Z',
      capabilities: [{ repo: 'wave-av/wave-desktop', version: '0.2.0', lifecycle: 'alpha' }],
    });
    assert.equal(parsed.capabilities.length, 1);
    assert.equal(parsed.capabilities[0].repo, 'wave-av/wave-desktop');
    assert.equal(parsed.generatedAt, '2026-06-02T00:00:00.000Z');
  });

  it('drops entries without a repo string', () => {
    const parsed = parseState({
      generatedAt: 'x',
      capabilities: [{}, { repo: 'wave-av/ok' }, { repo: 42 }, null, 'not-an-object'],
    });
    assert.equal(parsed.capabilities.length, 1);
    assert.equal(parsed.capabilities[0].repo, 'wave-av/ok');
  });

  it('treats missing capabilities array as empty (no throw)', () => {
    const parsed = parseState({ generatedAt: 'x' });
    assert.equal(parsed.capabilities.length, 0);
  });

  it('throws on non-object input', () => {
    assert.throws(() => parseState(null), /not an object/);
    assert.throws(() => parseState('hello'), /not an object/);
  });

  it('defaults generatedAt when missing', () => {
    const parsed = parseState({ capabilities: [] });
    assert.equal(parsed.generatedAt, 'unknown');
  });
});

describe('allowedRepoTargets', () => {
  it('includes alpha/beta/ga; excludes sunsetting/archived', () => {
    const state = {
      generatedAt: 'x',
      capabilities: [
        { repo: 'a', lifecycle: 'alpha' as const },
        { repo: 'b', lifecycle: 'beta' as const },
        { repo: 'c', lifecycle: 'ga' as const },
        { repo: 'd', lifecycle: 'sunsetting' as const },
        { repo: 'e', lifecycle: 'archived' as const },
      ],
    };
    const allowed = allowedRepoTargets(state);
    assert.deepEqual([...allowed].sort(), ['a', 'b', 'c']);
  });

  it('includes capabilities with no lifecycle (permissive default)', () => {
    const state = { generatedAt: 'x', capabilities: [{ repo: 'no-lifecycle' }] };
    assert.ok(allowedRepoTargets(state).has('no-lifecycle'));
  });
});

/**
 * Starts a throwaway HTTP server on an ephemeral port for the duration of
 * `fn`, then tears it down. No real network calls — this is what makes the
 * "reachable" and "unreachable" states testable without a live registry.
 */
async function withServer(
  handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
  fn: (url: string) => Promise<void>,
): Promise<void> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  try {
    await fn(`http://127.0.0.1:${port}/state.json`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('resolveRegistryState (the 3-state contract: unconfigured / loaded / unreachable)', () => {
  it('(a) no URL configured -> scaffold-unconfigured, distinct from unreachable', async () => {
    const result = await resolveRegistryState(undefined);
    assert.equal(result.mode, 'scaffold-unconfigured');
  });

  it('(a) a blank/whitespace-only URL also resolves to scaffold-unconfigured', async () => {
    const result = await resolveRegistryState('   ');
    assert.equal(result.mode, 'scaffold-unconfigured');
  });

  it('(b) URL configured and reachable -> state is fetched and parsed', async () => {
    await withServer(
      (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            generatedAt: '2026-09-21T00:00:00.000Z',
            capabilities: [{ repo: 'wave-av/ok', lifecycle: 'ga' }],
          }),
        );
      },
      async (url) => {
        const result = await resolveRegistryState(url);
        assert.equal(result.mode, 'loaded');
        assert.ok(result.mode === 'loaded');
        if (result.mode === 'loaded') {
          assert.equal(result.state.generatedAt, '2026-09-21T00:00:00.000Z');
          assert.equal(result.state.capabilities.length, 1);
          assert.equal(result.state.capabilities[0]?.repo, 'wave-av/ok');
        }
      },
    );
  });

  it('(c) URL configured but 404s -> scaffold-unreachable, distinct from (a), process does not throw', async () => {
    await withServer(
      (_req, res) => {
        res.writeHead(404);
        res.end('not found');
      },
      async (url) => {
        const result = await resolveRegistryState(url);
        assert.equal(result.mode, 'scaffold-unreachable');
        assert.ok(result.mode === 'scaffold-unreachable');
        if (result.mode === 'scaffold-unreachable') {
          assert.match(result.error, /404/);
        }
      },
    );
  });

  it(
    '(c) URL configured but times out -> scaffold-unreachable via the 5s AbortController, process does not throw',
    { timeout: 15_000 },
    async () => {
      await withServer(
        () => {
          // Never respond — exercises the real 5s abort-timeout path.
        },
        async (url) => {
          const result = await resolveRegistryState(url);
          assert.equal(result.mode, 'scaffold-unreachable');
        },
      );
    },
  );

  it('rejects malformed URLs as scaffold-unreachable instead of throwing out of the module', async () => {
    const result = await resolveRegistryState('not a url');
    assert.equal(result.mode, 'scaffold-unreachable');
  });
});
