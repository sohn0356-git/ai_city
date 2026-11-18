import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { createLife, advanceLife, validateLife, startAction } from '../src/simulation/engine.mjs';
import {
  DEFAULT_RULES,
  pointFor,
  routePoints,
  MINUTE,
  validateRequest,
} from '../src/simulation/catalog.mjs';
import {
  replayLife,
  projectLife,
  compactReplay,
  lifeWorld,
  archiveDay,
} from '../src/simulation/replay.mjs';
import { tickLife } from './tick-life.mjs';
const base = JSON.parse(await readFile('public/world.json', 'utf8'));
const start = Date.parse('2026-11-18T00:00:00Z');
const make = () => createLife(base, { at: start, seed: 'test-world' });
const normalize = (s) => {
  const copy = structuredClone(s);
  delete copy.revision;
  return copy;
};

test('the same seed and elapsed time produce the same world regardless of tick batching', () => {
  const direct = make(),
    batched = make();
  advanceLife(direct, start + 3 * 3600000);
  for (let t = start + 5 * MINUTE; t <= start + 3 * 3600000; t += 5 * MINUTE)
    advanceLife(batched, t);
  assert.deepEqual(normalize(direct), normalize(batched));
  assert.equal(validateLife(direct), true);
});

test('movement accepts explicit endpoints, path and duration and cannot teleport early', () => {
  const state = make(),
    actor = state.actors[0];
  actor.active = null;
  actor.queue = [];
  const from = actor.placeId,
    to = from === 'farm' ? 'hall' : 'farm';
  const path = routePoints(pointFor(state, actor, from), pointFor(state, actor, to));
  const action = startAction(
    state,
    actor,
    { type: 'move', params: { from, to, path, durationSeconds: 120 } },
    start,
  );
  assert.equal(Date.parse(action.endsAt) - Date.parse(action.startsAt), 120000);
  advanceLife(state, start + 60000);
  assert.equal(actor.placeId, from);
  const frame = projectLife(state, start + 90000);
  assert.notDeepEqual(lifeWorld(base, frame.state, frame.at).lifeActivities[actor.id].x, path[0].x);
  advanceLife(state, start + 120000);
  assert.equal(actor.placeId, to);
  assert.throws(
    () =>
      startAction(
        state,
        actor,
        { type: 'rest', params: { placeId: to, durationSeconds: 60 } },
        start + 120000,
      ),
    /overlapping/,
  );
  assert.throws(
    () =>
      validateRequest(state, actor, {
        type: 'move',
        params: { from: 'unknown', to, path, durationSeconds: 120 },
      }),
    /endpoints/,
  );
});

test('food, energy and HP remain bounded and actors keep taking actions for a full day', () => {
  const state = make();
  advanceLife(state, start + 86400000);
  assert.equal(validateLife(state), true);
  for (const type of [
    'move',
    'work',
    'rest',
    'eat',
    'social',
    'prepare',
    'search',
    'fight',
    'explore',
  ])
    assert(
      state.logs.some((r) => r.type === type),
      type,
    );
  assert(state.actors.every((a) => a.sequence > 30 && a.active));
  assert(state.resources.food >= 0 && state.resources.materials >= 0);
  for (const actor of state.actors)
    assert(actor.energy >= 0 && actor.energy <= 100 && actor.hp > 0);
});

test('settlement and projection are idempotent and never rewrite legacy source data', () => {
  const baseline = JSON.stringify(base),
    state = make();
  advanceLife(state, start + 7200000);
  const before = JSON.stringify(state);
  advanceLife(state, start + 7200000);
  assert.equal(JSON.stringify(state), before);
  projectLife(state, start + 7200000 + 5 * MINUTE);
  assert.equal(JSON.stringify(state), before);
  for (let i = 0; i < 5; i++) replayLife(state, start + 30 * MINUTE);
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(base), baseline);
  assert.equal(
    new Set(state.ledger.adventureRewards.map((r) => r.id)).size,
    state.ledger.adventureRewards.length,
  );
});

test('exploration preserves composite parameters, returns, and awards only actual unique combat', () => {
  const state = make();
  advanceLife(state, start + 86400000);
  const trips = state.logs.filter((r) => r.type === 'explore');
  assert(trips.length);
  for (const trip of trips) {
    assert.equal(trip.after.placeId, trip.params.returnTo);
    assert(
      Date.parse(trip.endsAt) - Date.parse(trip.startsAt) <= trip.params.timeLimitMinutes * MINUTE,
    );
  }
  for (const log of state.logs.filter((r) => r.type === 'fight')) {
    const reward = state.ledger.adventureRewards.find((r) => r.id === log.id);
    assert(reward);
    assert.equal(reward.xp, reward.firstKill ? log.combat.monster.level : 0);
    if (reward.outcome !== 'victory') assert.equal(reward.xp, 0);
    assert(log.parentId && log.combat.turns.length);
  }
});

test('replay uses stored outcomes and matches the authoritative actor state at the end', () => {
  const state = make();
  advanceLife(state, start + 7200000);
  const frame = replayLife(state, Date.parse(state.updatedAt));
  for (const actor of state.actors) {
    const seen = frame.actors.find((a) => a.id === actor.id);
    assert.equal(seen.placeId, actor.placeId);
    assert.equal(seen.energy, actor.energy);
    assert.equal(seen.hp, actor.hp);
    assert.equal(seen.combatXp, actor.player.combatXp);
  }
  assert.deepEqual(frame.resources, state.resources);
  const before = JSON.stringify(state);
  lifeWorld(base, state, start + 30 * MINUTE, { replay: true });
  assert.equal(JSON.stringify(state), before);
});

test('checkpoints compact the replay buffer without changing retained frames', () => {
  const state = make();
  advanceLife(state, start + 7200000);
  const time = Date.parse(state.logs.at(-10).endsAt),
    before = replayLife(state, time);
  compactReplay(state, { maxLogs: 100 });
  assert.deepEqual(replayLife(state, time), before);
  assert(state.logs.length <= 100);
  assert.equal(validateLife(state), true);
});

test('saved day playback never exposes the next day or future rewards', () => {
  const state = make();
  advanceLife(state, start + 86400000 + 3600000);
  const archive = archiveDay(state, '2026-11-18');
  assert(archive);
  const end = Date.parse(archive.updatedAt);
  assert(end < start + 86400000);
  const frame = lifeWorld(base, archive, end, { replay: true });
  assert(frame.adventureRewards.every((r) => Date.parse(r.at) <= end));
  assert(frame.lifeLogs.every((r) => Date.parse(r.endsAt) <= end));
});

test('the worker preserves source world and continues appending the archive after buffer compaction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ai-city-life-'));
  await writeFile(join(root, 'world.json'), JSON.stringify(base));
  await tickLife({ now: start, root });
  for (let hour = 6; hour <= 18; hour += 6) await tickLife({ now: start + hour * 3600000, root });
  const saved = JSON.parse(
    gunzipSync(await readFile(join(root, 'life/history/2026-11-18.json.gz'))).toString('utf8'),
  );
  const latest = JSON.parse(await readFile(join(root, 'life.json'), 'utf8'));
  assert.equal(saved.updatedAt, latest.updatedAt);
  assert(saved.logs.length > latest.logs.length);
  assert.equal(
    JSON.stringify(JSON.parse(await readFile(join(root, 'world.json'), 'utf8'))),
    JSON.stringify(base),
  );
  assert.equal(validateLife(latest), true);
});

test('archive loading supports both raw gzip and browser-decoded JSON', async () => {
  const { gzipSync } = await import('node:zlib');
  const { readArchiveResponse } = await import('../src/simulation/archive-client.mjs');
  const state = make();
  advanceLife(state, start + MINUTE);
  const json = JSON.stringify(state);
  assert.deepEqual(await readArchiveResponse(new Response(gzipSync(json))), JSON.parse(json));
  assert.deepEqual(
    await readArchiveResponse(new Response(json, { headers: { 'Content-Encoding': 'gzip' } })),
    JSON.parse(json),
  );
});

test('short exploration budgets still reserve time for the return journey', () => {
  const state = createLife(base, {
    at: start,
    seed: 'test-world',
    rules: {
      ...DEFAULT_RULES,
      exploration: { ...DEFAULT_RULES.exploration, timeLimitMinutes: 15 },
    },
  });
  advanceLife(state, start + 6 * 3600000);
  const trips = state.logs.filter((r) => r.composite);
  assert(trips.length);
  for (const trip of trips)
    assert(Date.parse(trip.endsAt) - Date.parse(trip.startsAt) <= 15 * MINUTE);
});

test('historical HP follows stored battle turns without recalculating combat', () => {
  const state = make();
  advanceLife(state, start + 6 * 3600000);
  const log = state.logs.find((r) => r.type === 'fight');
  assert(log);
  const at = Date.parse(log.startsAt) + (Date.parse(log.endsAt) - Date.parse(log.startsAt)) * 0.5;
  const result = lifeWorld(base, state, at, { replay: true }),
    player = result.players.find((p) => p.id === log.actorId);
  const index = Math.floor(0.5 * (log.combat.turns.length + 1));
  assert.equal(player.hp, index === 0 ? log.before.hp : log.combat.turns[index - 1].hp);
});
