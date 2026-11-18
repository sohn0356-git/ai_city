import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldLoader } from '../src/worldClient.mjs';
const snapshot = {
  schemaVersion: 1,
  players: [{ id: 'p001', name: '주민' }],
  buildings: [{ id: 'hall' }],
  events: [],
  projects: [],
  updates: [],
  metrics: {},
  lastUpdated: '2026-11-18T00:00:00Z',
};
const response = (value) => ({ ok: true, json: async () => value });

test('simultaneous refresh requests share a single network operation', async () => {
  let resolve,
    calls = 0;
  const load = createWorldLoader('/world.json', () => {
    calls++;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const first = load();
  const second = load();
  assert.equal(calls, 1);
  resolve(response(snapshot));
  assert.equal(await first, snapshot);
  assert.equal(await second, snapshot);
});

test('a failed refresh can be retried without holding a failed promise', async () => {
  let calls = 0;
  const load = createWorldLoader('/world.json', async () =>
    ++calls === 1 ? { ok: false } : response(snapshot),
  );
  await assert.rejects(load(), /연결/);
  assert.equal(await load(), snapshot);
  assert.equal(calls, 2);
});

test('malformed snapshots are rejected before replacing the current screen', async () => {
  const load = createWorldLoader('/world.json', async () =>
    response({ ...snapshot, projects: null }),
  );
  await assert.rejects(load(), /형식/);
});

test('request signal and no-store policy are forwarded to fetch', async () => {
  const controller = new AbortController();
  const load = createWorldLoader('/world.json', async (url, options) => {
    assert.equal(url, '/world.json');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, 'no-store');
    return response(snapshot);
  });
  await load(controller.signal);
});
