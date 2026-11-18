import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLife, advanceLife, startAction, validateLife } from '../src/simulation/engine.mjs';
import {
  SURVIVAL_RULES,
  migrateSurvival,
  illnessRisk,
  ageAt,
} from '../src/simulation/survival.mjs';
import {
  replayLife,
  lifeWorld,
  compactReplay,
  archiveDay,
  projectLife,
} from '../src/simulation/replay.mjs';
import { snapshotActor } from '../src/simulation/state.mjs';
import { DEFAULT_RULES, MINUTE } from '../src/simulation/catalog.mjs';
import { balance, creditWage } from '../src/economy.mjs';
const original = JSON.parse(await readFile('public/world.json', 'utf8'));
const at = Date.parse('2026-11-18T00:00:00Z');
function baseFor(n = 1) {
  const w = structuredClone(original);
  w.players = Array.from({ length: n }, (_, i) => ({
    ...structuredClone(original.players[i % original.players.length]),
    id: 'p' + String(i + 1).padStart(3, '0'),
    combatXp: 0,
    contributions: 0,
    xpReset: undefined,
    progressionVersion: 3,
    skills: [],
    skillRulesVersion: 1,
    relationships: [],
    energy: 80,
  }));
  w.adventureRewards = [];
  w.economy = { ledger: [], orders: [] };
  w.essenceDrops = [];
  w.essenceAbsorptions = [];
  w.essenceDecisions = [];
  w.dungeonSpawns = {};
  return w;
}
function make(n = 1, rules = {}) {
  return createLife(baseFor(n), {
    at,
    seed: 'survival-test',
    rules: {
      ...structuredClone(DEFAULT_RULES),
      survival: {
        ...SURVIVAL_RULES,
        youngIllnessChance: 0,
        olderIllnessChance: 0,
        newcomerChance: 0,
        ...rules,
      },
    },
  });
}
function resetAction(actor) {
  actor.active = null;
  actor.queue = [];
  actor.expedition = null;
}
function fund(s, actor, amount) {
  creditWage(
    { players: s.actors.map((a) => a.player), economy: s.ledger.economy },
    { id: 'test-fund-' + actor.id, playerId: actor.id, amount, at: new Date(at).toISOString() },
  );
}
const funds = (s, id) => balance({ economy: s.ledger.economy }, id);
const norm = (s) => {
  const v = JSON.parse(JSON.stringify(s));
  delete v.revision;
  return v;
};

test('work earns wages, food purchase consumes money and stock, and eating consumes owned food once', () => {
  const s = make(),
    a = s.actors[0];
  resetAction(a);
  startAction(
    s,
    a,
    {
      type: 'work',
      params: {
        placeId: a.placeId,
        task: '도시 기록 정리',
        resource: 'knowledge',
        amount: 1,
        durationSeconds: 60,
      },
    },
    at,
  );
  advanceLife(s, at + MINUTE);
  assert.equal(funds(s, a.id), 2);
  resetAction(a);
  a.placeId = 'market';
  a.hunger = 80;
  s.resources.food = 5;
  s.replayResources.food = 5;
  startAction(
    s,
    a,
    {
      type: 'buy_food',
      params: { placeId: 'market', quantity: 1, unitPrice: 2, durationSeconds: 60 },
    },
    at + MINUTE,
  );
  advanceLife(s, at + 2 * MINUTE);
  assert.equal(funds(s, a.id), 0);
  assert.equal(s.resources.food, 4);
  assert.equal(a.food.length, 1);
  assert.equal(a.active.type, 'eat');
  const end = Date.parse(a.active.endsAt);
  advanceLife(s, end);
  assert.equal(a.food.length, 0);
  assert(a.hunger < 65);
  assert.equal(s.ledger.economy.ledger.filter((t) => t.kind === 'food').length, 1);
  const before = JSON.stringify(s);
  advanceLife(s, end);
  assert.equal(JSON.stringify(s), before);
});

test('a failed purchase charges nothing and an expired meal cannot be eaten', () => {
  const s = make(),
    a = s.actors[0];
  resetAction(a);
  a.placeId = 'market';
  const stock = s.resources.food;
  startAction(
    s,
    a,
    {
      type: 'buy_food',
      params: { placeId: 'market', quantity: 1, unitPrice: 2, durationSeconds: 10 },
    },
    at,
  );
  advanceLife(s, at + 10000);
  assert.equal(s.resources.food, stock);
  assert.equal(a.food.length, 0);
  assert.equal(s.ledger.economy.ledger.length, 0);
  assert.equal(s.logs.at(-1).result.success, false);
  resetAction(a);
  a.food = [
    {
      id: 'expired',
      boughtAt: new Date(at).toISOString(),
      expiresAt: new Date(at + 11000).toISOString(),
    },
  ];
  a.hunger = 80;
  startAction(
    s,
    a,
    { type: 'eat', params: { placeId: a.placeId, foodCost: 1, durationSeconds: 10 } },
    at + 10000,
  );
  advanceLife(s, at + 20000);
  assert.equal(a.food.length, 0);
  assert.equal(a.hunger, 80);
  assert.equal(s.logs.at(-1).result.success, false);
});

test('long starvation removes the resident, cancels unfinished work without pay, and preserves history', () => {
  const s = make(1, { dayMs: MINUTE, starvationDays: 2, hungerPerHour: 0 }),
    a = s.actors[0];
  resetAction(a);
  a.hunger = 100;
  a.starvingSince = new Date(at).toISOString();
  s.replayActors = [snapshotActor(a)];
  startAction(
    s,
    a,
    {
      type: 'work',
      params: {
        placeId: a.placeId,
        task: '긴 작업',
        resource: 'knowledge',
        amount: 1,
        durationSeconds: 600,
      },
    },
    at,
  );
  advanceLife(s, at + 2 * MINUTE);
  assert.equal(s.actors.length, 0);
  assert(s.departed[a.id]);
  assert.equal(s.departed[a.id].active, null);
  assert.equal(funds(s, a.id), 0);
  assert.equal(s.resources.knowledge, 0);
  assert(s.logs.some((r) => r.type === 'death' && r.result.cause === '장기 굶주림'));
  assert.equal(replayLife(s, at + MINUTE).actors.length, 1);
  assert.equal(replayLife(s, at + 2 * MINUTE).actors.length, 0);
  assert.equal(validateLife(s), true);
  assert.equal(projectLife(s, at + 3 * MINUTE).state.actors.length, 0);
});

test('empty towns keep ticking and new residents use new identities instead of resurrecting the dead', () => {
  const s = make(1, { dayMs: MINUTE, starvationDays: 2, hungerPerHour: 0 }),
    a = s.actors[0];
  a.hunger = 100;
  a.starvingSince = new Date(at).toISOString();
  s.replayActors = [snapshotActor(a)];
  advanceLife(s, at + 2 * MINUTE);
  assert.equal(s.actors.length, 0);
  s.rules.survival.newcomerChance = 1;
  advanceLife(s, at + 3 * MINUTE);
  assert.equal(s.actors.length, 1);
  assert.notEqual(s.actors[0].id, a.id);
  assert(s.logs.some((r) => r.type === 'arrival'));
  assert.equal(validateLife(s), true);
  const before = lifeWorld(baseFor(), s, at + MINUTE, { replay: true });
  assert.equal(before.players[0].id, a.id);
  const after = lifeWorld(baseFor(), s, at + 3 * MINUTE, { replay: true });
  assert.equal(after.players[0].id, s.actors[0].id);
  compactReplay(s, { maxLogs: 2 });
  assert.equal(validateLife(s), true);
});

test('higher age increases illness risk and old age removes residents from the active world', () => {
  assert(illnessRisk(80, SURVIVAL_RULES) > illnessRisk(60, SURVIVAL_RULES));
  assert(illnessRisk(60, SURVIVAL_RULES) > illnessRisk(25, SURVIVAL_RULES));
  const s = make(1, { dayMs: MINUTE, hungerPerHour: 0 }),
    a = s.actors[0];
  a.initialAge = 106;
  advanceLife(s, at + MINUTE);
  assert.equal(s.actors.length, 0);
  assert.equal(s.departed[a.id].deathCause, '노쇠');
  assert.equal(validateLife(s), true);
});

test('illness can worsen fatally, while paid treatment clears it without charging twice', () => {
  const s = make(1, { dayMs: MINUTE, hungerPerHour: 0 }),
    a = s.actors[0];
  a.illness = {
    name: '쇠약',
    severity: 3,
    since: new Date(at).toISOString(),
    until: new Date(at + 10 * MINUTE).toISOString(),
  };
  resetAction(a);
  fund(s, a, 10);
  startAction(
    s,
    a,
    { type: 'treat', params: { placeId: a.placeId, price: 4, durationSeconds: 5 } },
    at,
  );
  advanceLife(s, at + 5000);
  assert.equal(a.illness, null);
  assert.equal(funds(s, a.id), 6);
  assert.equal(s.ledger.economy.ledger.filter((t) => t.kind === 'treatment').length, 1);
  const doomed = make(1, { dayMs: MINUTE, hungerPerHour: 0 }),
    b = doomed.actors[0];
  resetAction(b);
  b.hp = 1;
  b.illness = {
    name: '쇠약',
    severity: 3,
    since: new Date(at).toISOString(),
    until: new Date(at + 10 * MINUTE).toISOString(),
  };
  startAction(
    doomed,
    b,
    { type: 'rest', params: { placeId: b.placeId, durationSeconds: 600 } },
    at,
  );
  advanceLife(doomed, at + 2500);
  assert.equal(doomed.actors.length, 0);
  assert.equal(doomed.departed[b.id].deathCause, '질병 악화');
});

test('arrival probability never exceeds the 100-person active population cap', () => {
  const s = make(99, { dayMs: MINUTE, hungerPerHour: 0, newcomerChance: 1 });
  advanceLife(s, at + 3 * MINUTE);
  assert.equal(s.actors.length, 100);
  assert.equal(s.survival.arrivals, 1);
  const id = s.actors[0].id;
  s.actors[0].initialAge = 106;
  advanceLife(s, at + 4 * MINUTE);
  assert.equal(s.actors.length, 100);
  assert(s.departed[id]);
  assert.equal(s.survival.arrivals, 2);
  assert.equal(new Set([...s.actors.map((a) => a.id), ...Object.keys(s.departed)]).size, 101);
  assert.equal(validateLife(s), true);
});

test('population, wages and survival remain deterministic across different worker tick sizes', () => {
  const rules = { dayMs: 10 * MINUTE, newcomerChance: 0.5, youngIllnessChance: 0.15 };
  const a = make(3, rules),
    b = make(3, rules);
  advanceLife(a, at + 4 * 3600000);
  for (let t = at + 3 * MINUTE; t <= at + 4 * 3600000; t += 3 * MINUTE) advanceLife(b, t);
  assert.deepEqual(norm(a), norm(b));
  assert.equal(validateLife(a), true);
  const before = JSON.stringify(a);
  lifeWorld(baseFor(3), a, at + 3600000, { replay: true });
  assert.equal(JSON.stringify(a), before);
});

test('migration preserves running actions and starts starvation and age clocks only at activation', () => {
  const s = createLife(baseFor(), { at, survival: false });
  advanceLife(s, at + 6 * 3600000);
  const active = JSON.stringify(s.actors[0].active),
    count = s.actors.length;
  migrateSurvival(s, { at: at + 6 * 3600000 });
  assert.equal(JSON.stringify(s.actors[0].active), active);
  assert.equal(s.actors.length, count);
  assert(s.actors.every((a) => a.lastVitalAt === new Date(at + 6 * 3600000).toISOString()));
  advanceLife(s, at + 6 * 3600000 + MINUTE);
  assert.equal(s.actors.length, count);
  assert.equal(validateLife(s), true);
});
