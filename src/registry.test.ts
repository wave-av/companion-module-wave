// Tests for the platform-registry grounding helpers. These are stdlib-only
// (node:test + node:assert) so they run on bare CI without an extra test runner.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, allowedRepoTargets } from './registry.ts';

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
