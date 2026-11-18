import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeActivity,
  observeWorld,
  filterResidents,
  observationReducer,
  recentEvents,
} from '../src/observation.mjs';
import { layoutWorld } from '../src/mapLayout.mjs';
import { currentPlace } from '../src/placeState.mjs';
import { encounterStatus } from '../src/encounterStatus.mjs';
import { loadWorld } from './validate-world.mjs';
const [source] = await loadWorld();
const world = layoutWorld(source);

test('every roster filter agrees with current occupancy at step boundaries', () => {
  for (const plan of [...world.activityPlans, ...world.queuedActivityPlans]) {
    for (const step of plan.steps || []) {
      const now = Date.parse(step.startsAt);
      const snapshot = observeWorld(world, now);
      const resident = snapshot.residents.find((r) => r.player.id === plan.playerId);
      assert.equal(resident.placeId, currentPlace(resident.player, world, now));
      assert.equal(
        filterResidents(snapshot.residents, { placeId: step.placeId }).some(
          (r) => r.player.id === plan.playerId,
        ),
        step.kind !== 'walking',
      );
      assert.equal(resident.activity.kind, step.kind);
    }
  }
});

test('observing and filtering never changes plans, resources or reward ledgers', () => {
  const before = JSON.stringify(world);
  const snapshot = observeWorld(world, Date.parse(world.lastUpdated));
  for (const place of snapshot.places.keys())
    filterResidents(snapshot.residents, { placeId: place });
  recentEvents(world, { residentId: world.players[0].id });
  assert.equal(JSON.stringify(world), before);
});

test('future plans cannot fabricate present work or combat', () => {
  const player = world.players[0];
  const plan = {
    ...world.activityPlans.find((p) => p.playerId === player.id),
    startsAt: '2100-01-01T00:00:00Z',
    endsAt: '2100-01-01T02:00:00Z',
  };
  const snapshot = observeWorld(
    { ...world, activityPlans: [plan], queuedActivityPlans: [] },
    Date.parse('2099-12-31T23:59:00Z'),
  );
  const resident = snapshot.residents.find((r) => r.player.id === player.id);
  assert.equal(resident.activity, null);
  assert.equal(resident.placeId, player.location);
});

test('different resident schedules switch independently and ended plans show review status', () => {
  const now = Math.max(...world.queuedActivityPlans.map((p) => Date.parse(p.endsAt))) + 1000;
  const snapshots = observeWorld(world, now).residents;
  assert(snapshots.every((r) => r.waiting));
  assert(snapshots.every((r) => r.phase === '결과 확인 대기'));
  assert.equal(filterResidents(snapshots, { phase: 'working' }).length, 0);
});

test('selection keeps filters mutually consistent and reset preserves the screen', () => {
  const state = { view: 'records', residentId: 'p001', placeId: 'all' };
  const place = observationReducer(state, { type: 'place', id: 'farm' });
  assert.equal(place.residentId, null);
  assert.equal(place.view, 'records');
  assert.deepEqual(observationReducer(place, { type: 'resident', id: 'p002' }), {
    view: 'records',
    residentId: 'p002',
    placeId: 'all',
  });
  assert.deepEqual(observationReducer(place, { type: 'reset' }), {
    view: 'records',
    residentId: null,
    placeId: 'all',
  });
});

test('city-only schedules are not counted as pending dungeon encounters', () => {
  assert.deepEqual(
    encounterStatus({
      activityPlans: [{ playerId: 'p001', steps: [{ kind: 'working' }] }],
      queuedActivityPlans: [{ playerId: 'p002', steps: [{ kind: 'walking' }] }],
    }),
    { settled: 0, pending: 0 },
  );
});

test('long activity text stays available while the primary title is concise', () => {
  assert.equal(summarizeActivity('개인 검토: 주민이 긴 도면의 내용을 검토한다.'), '개인 검토');
  assert.equal(summarizeActivity('카페로 이동'), '카페로 이동');
  assert(summarizeActivity('아주 긴 일정 설명'.repeat(10)).endsWith('…'));
});
