import {
  ACTIONS,
  DEFAULT_RULES,
  MINUTE,
  hashSeed,
  random,
  pick,
  weighted,
  profession,
  pointFor,
  routePoints,
  validateRequest,
  validateRules,
} from './catalog.mjs';
import { layoutWorld } from '../mapLayout.mjs';
import { battle, DUNGEON } from '../activity.mjs';
import { combatStats, progression } from '../progression.mjs';
import { MONSTERS, defeated } from '../monsters.mjs';
import {
  BOSS_RULES,
  bossProgress,
  floorUnlocked,
  floorMonster,
  spawnState,
  resolveSpawn,
  SLOTS,
} from '../dungeonRules.mjs';
import { monsterSkills } from '../essenceSkills.mjs';
import { dropEssence, decideEssences, validateEssences } from '../essences.mjs';
import { creditVictory, creditWage, payLivingCost, balance } from '../economy.mjs';
import { snapshotActor, appendLog, knownActors } from './state.mjs';
import {
  migrateSurvival,
  survivalChoice,
  tickVitals,
  tickPopulation,
  killActor,
} from './survival.mjs';
export { snapshotActor } from './state.mjs';
import { recordBattle } from '../combatHistory.mjs';

const copy = (value) => structuredClone(value);
const iso = (value) => new Date(value).toISOString();
const clamp = (n) => Math.max(0, Math.min(100, n));
const LEDGERS = [
  'adventureRewards',
  'economy',
  'dungeonSpawns',
  'battleLogs',
  'essenceDrops',
  'essenceAbsorptions',
  'essenceDecisions',
];
export function ledgerWorld(state, includeDeparted = false) {
  return {
    ...state.ledger,
    players: (includeDeparted ? knownActors(state) : state.actors).map((a) => a.player),
    buildings: state.places,
  };
}
function duration(actor, type) {
  const [low, high] = ACTIONS[type].duration;
  return Math.round((low + random(actor) * (high - low)) * 60);
}
export function createLife(
  base,
  { at, seed = 'ai-city-life-v1', rules = DEFAULT_RULES, survival = true, roster = [] } = {},
) {
  validateRules(rules);
  if (!Number.isFinite(at)) throw Error('An explicit start time is required');
  const world = layoutWorld(base);
  const state = {
    schemaVersion: 1,
    rules: copy(rules),
    seed,
    sessionId: hashSeed(seed + at).toString(36),
    startedAt: iso(at),
    updatedAt: iso(at),
    replayStartsAt: iso(at),
    revision: 0,
    completed: 0,
    logSequence: 0,
    places: [...world.buildings, DUNGEON],
    resources: { food: world.metrics.food, materials: world.metrics.materials, knowledge: 0 },
    actors: world.players.map((p) => {
      const player = copy(p);
      return {
        id: p.id,
        player,
        placeId: p.location,
        home: p.location,
        energy: p.energy,
        hunger: 20,
        hp: combatStats(p).maxHp,
        sequence: 0,
        rng: hashSeed(seed + ':' + p.id),
        workCount: 0,
        queue: [],
        active: null,
        expedition: null,
      };
    }),
    ledger: {
      adventureRewards: copy(base.adventureRewards || []),
      economy: copy(base.economy || { ledger: [], orders: [] }),
      dungeonSpawns: copy(base.dungeonSpawns || {}),
      battleLogs: [],
      essenceDrops: copy(base.essenceDrops || []),
      essenceAbsorptions: copy(base.essenceAbsorptions || []),
      essenceDecisions: copy(base.essenceDecisions || []),
    },
    logs: [],
  };
  if (survival) migrateSurvival(state, { at, roster, log: false });
  state.replayActors = state.actors.map(snapshotActor);
  state.replayResources = copy(state.resources);
  for (const actor of state.actors) startNext(state, actor, at);
  return state;
}
export function chooseAction(state, actor, at) {
  const maxHp = combatStats(actor.player).maxHp;
  if (state.survival) {
    const choice = survivalChoice(state, actor, at);
    if (choice) return choice;
  }
  if (actor.energy < 24 || actor.hp < maxHp * 0.45)
    return {
      type: 'rest',
      params: { placeId: actor.placeId },
      reason: '피로와 체력을 먼저 회복한다.',
    };
  if (!state.survival && actor.hunger > 65 && state.resources.food <= 0)
    return {
      type: 'work',
      params: { placeId: 'farm', task: '함께 식재료 수확하기', resource: 'food', amount: 2 },
      reason: '식량이 부족해 수확을 돕는다.',
    };
  if (!state.survival && actor.hunger > 65 && state.resources.food > 0)
    return {
      type: 'eat',
      params: { placeId: 'cafe', foodCost: 1 },
      reason: '배가 고파 식사를 선택한다.',
    };
  const context = Object.values(actor.player.persona || {}).join(' ') + ' ' + actor.player.goal;
  const weights = state.rules.weights;
  const kind = weighted(actor, [
    {
      value: 'work',
      weight:
        weights.work +
        (state.resources.food < 8 && profession(actor.player).resource === 'food' ? 8 : 0),
    },
    { value: 'social', weight: weights.social + (/이웃|협력|활달/.test(context) ? 2 : 0) },
    { value: 'rest', weight: weights.rest + (actor.energy < 50 ? 4 : 0) },
    { value: 'move', weight: weights.move },
    {
      value: 'explore',
      weight:
        actor.energy >= 55 && actor.hp >= maxHp * 0.8
          ? weights.explore + (/탐험|도전|용기/.test(context) ? 3 : 0)
          : 0,
    },
  ]);
  if (kind === 'work')
    return {
      type: 'work',
      params: profession(actor.player),
      reason: actor.player.role + '의 일을 이어간다.',
    };
  if (kind === 'explore')
    return {
      type: 'explore',
      params: { destination: 'dungeon', returnTo: actor.placeId, ...state.rules.exploration },
      reason: '기운이 충분해 동굴을 탐험한다.',
    };
  if (kind === 'social') {
    const peers = state.actors.filter(
      (a) => a.id !== actor.id && a.placeId === actor.placeId && a.active?.type !== 'move',
    );
    if (peers.length)
      return {
        type: 'social',
        params: {
          placeId: actor.placeId,
          partnerId: pick(actor, peers).id,
          topic: pick(actor, ['오늘의 일', '도시에서 해보고 싶은 일', '최근 탐험']),
        },
        reason: '같은 장소의 이웃에게 말을 건다.',
      };
    return {
      type: 'move',
      params: {
        to: pick(
          actor,
          state.places.filter((p) => p.id !== 'dungeon' && p.id !== actor.placeId),
        ).id,
      },
      reason: '이웃을 찾아 동네를 산책한다.',
    };
  }
  if (kind === 'move')
    return {
      type: 'move',
      params: {
        to: pick(
          actor,
          state.places.filter((p) => p.id !== 'dungeon' && p.id !== actor.placeId),
        ).id,
      },
      reason: '다른 장소를 둘러본다.',
    };
  return {
    type: 'rest',
    params: { placeId: random(actor) < 0.5 ? actor.home : actor.placeId },
    reason: '다음 활동을 위해 잠시 쉰다.',
  };
}
export function startAction(state, actor, request, at) {
  if (actor.active) throw Error('An actor cannot execute overlapping actions');
  const params = copy(request.params || {});
  params.durationSeconds ??= Math.round(duration(actor, request.type) * (actor.illness ? 1.25 : 1));
  if (state.survival) {
    if (request.type === 'work') params.wage ??= state.rules.survival.workWage;
    if (request.type === 'buy_food') {
      params.quantity ??= 1;
      params.unitPrice ??= state.rules.survival.foodPrice;
    }
    if (request.type === 'treat') params.price ??= state.rules.survival.treatmentPrice;
  }
  if (request.type === 'move') {
    params.from ??= actor.placeId;
    params.path ??= routePoints(
      pointFor(state, actor, params.from),
      pointFor(state, actor, params.to),
    );
  }
  if (request.type === 'eat') params.foodCost ??= 1;
  validateRequest(state, actor, { ...request, params });
  const action = {
    id: `life-${state.sessionId}-${actor.id}-${++actor.sequence}`,
    actorId: actor.id,
    type: request.type,
    params,
    startsAt: iso(at),
    endsAt: iso(at + params.durationSeconds * 1000),
    survivalVersion: state.survival ? 1 : 0,
    before: snapshotActor(actor),
    reason: request.reason || '다음 행동을 선택한다.',
    parentId: actor.expedition?.id || null,
  };
  const names = new Map(state.places.map((p) => [p.id, p.name]));
  action.label =
    request.type === 'move'
      ? `${names.get(params.from)} → ${names.get(params.to)}`
      : request.type === 'work'
        ? params.task
        : request.type === 'social'
          ? `${state.actors.find((a) => a.id === params.partnerId).player.name}와 ${params.topic || '일상'} 이야기`
          : ACTIONS[request.type].name;
  if (request.type === 'fight') {
    const view = ledgerWorld(state),
      encounter = request.encounter;
    if (
      !actor.expedition ||
      !encounter ||
      encounter.floor !== params.floor ||
      encounter.monster.id !== params.monsterId ||
      !floorUnlocked(view, params.floor)
    )
      throw Error('Invalid exploration encounter');
    action.encounter = copy(encounter);
    action.combatSnapshot = copy(actor.player);
    action.combat = battle(action.combatSnapshot, encounter.monster, {
      initialHp: actor.hp,
      retreatRatio: actor.expedition.retreatHpRatio,
    });
  }
  actor.active = action;
  return action;
}
function startNext(state, actor, at) {
  let request = actor.queue.shift() || chooseAction(state, actor, at);
  if (
    actor.expedition &&
    ['search', 'fight'].includes(request.type) &&
    at + 11 * MINUTE >= Date.parse(actor.expedition.deadline)
  ) {
    returnFromExpedition(actor);
    request = actor.queue.shift();
  }
  if (request.type === 'explore') {
    const p = request.params;
    if (
      p.destination !== 'dungeon' ||
      !state.places.some((x) => x.id === p.returnTo) ||
      !Number.isFinite(p.timeLimitMinutes) ||
      p.timeLimitMinutes < 15 ||
      p.timeLimitMinutes > 120 ||
      p.retreatHpRatio < 0.1 ||
      p.retreatHpRatio > 0.8 ||
      !Number.isInteger(p.maxEncounters) ||
      p.maxEncounters < 1 ||
      p.maxEncounters > 5
    )
      throw Error('Invalid exploration parameters');
    actor.expedition = {
      id: `trip-${state.sessionId}-${actor.id}-${actor.sequence + 1}`,
      startedAt: iso(at),
      deadline: iso(at + p.timeLimitMinutes * MINUTE),
      returnTo: p.returnTo,
      retreatHpRatio: p.retreatHpRatio,
      timeLimitMinutes: p.timeLimitMinutes,
      maxEncounters: p.maxEncounters,
      encounters: 0,
      searches: 0,
      returning: false,
      before: snapshotActor(actor),
    };
    actor.queue.push(
      { type: 'move', params: { to: p.destination } },
      { type: 'search', params: { placeId: 'dungeon' } },
    );
    request = { type: 'prepare', params: { placeId: actor.placeId }, reason: request.reason };
  }
  const destination = request.type === 'move' ? request.params.to : request.params.placeId;
  if (request.type !== 'move' && destination !== actor.placeId) {
    actor.queue.unshift(request);
    request = { type: 'move', params: { to: destination }, reason: request.reason };
  }
  startAction(state, actor, request, at);
}
function relationship(player, id, delta) {
  player.relationships ??= [];
  let r = player.relationships.find((r) => r.playerId === id);
  if (!r) {
    r = { playerId: id, affinity: 0, reason: '자율 생활 중 만나 대화했다.' };
    player.relationships.push(r);
  }
  r.affinity = Math.max(-100, Math.min(100, r.affinity + delta));
  r.reason = '같은 장소에서 실제로 만나 이야기를 나눴다.';
}
function encounterFor(state, actor, at) {
  const view = ledgerWorld(state);
  const reserved = state.actors
    .filter((a) => a.active?.type === 'fight')
    .map((a) => a.active.encounter);
  const level = progression(actor.player, []).level;
  const boss = BOSS_RULES.find(
    (rule) =>
      floorUnlocked(view, rule.floor) &&
      bossProgress(view, rule.floor).ready &&
      level >= rule.minLevel &&
      !reserved.some((e) => e.monster.id === rule.id) &&
      battle(
        actor.player,
        {
          ...MONSTERS.find((m) => m.id === rule.id),
          essenceRulesVersion: 1,
          essenceSkills: monsterSkills(rule.id),
        },
        { initialHp: actor.hp, retreatRatio: actor.expedition.retreatHpRatio },
      ).outcome === 'victory',
  );
  let floor, monster, spawnId;
  if (boss) {
    floor = boss.floor;
    monster = MONSTERS.find((m) => m.id === boss.id);
  } else {
    const floors = [1, 2, 3].filter((f) => floorUnlocked(view, f));
    floor =
      floors.find((f) => !defeated(view, actor.id, floorMonster(f).id)) || pick(actor, floors);
    const slots = Array.from({ length: SLOTS }, (_, i) => i).filter(
      (i) =>
        spawnState(view, floor, i, at).alive &&
        !reserved.some((e) => e.spawnId === `f${floor}-spawn${i}`),
    );
    if (!slots.length) return null;
    spawnId = `f${floor}-spawn${pick(actor, slots)}`;
    monster = floorMonster(floor);
  }
  return {
    floor,
    spawnId,
    monster: { ...copy(monster), essenceRulesVersion: 1, essenceSkills: monsterSkills(monster.id) },
  };
}
function returnFromExpedition(actor) {
  actor.expedition.returning = true;
  actor.queue = [];
  if (actor.placeId !== actor.expedition.returnTo)
    actor.queue.push({
      type: 'move',
      params: { to: actor.expedition.returnTo },
      reason: '체력과 탐험 제한을 확인하고 귀환한다.',
    });
  actor.queue.push({
    type: 'rest',
    params: { placeId: actor.expedition.returnTo },
    reason: '탐험을 마치고 회복한다.',
  });
}
function settleFight(state, actor, action, at) {
  const view = ledgerWorld(state),
    r = action.combat,
    id = action.id;
  if (view.adventureRewards.some((x) => x.id === id)) throw Error('Duplicate autonomous encounter');
  const firstKill = r.outcome === 'victory' && !defeated(view, actor.id, r.monsterId);
  const xp = firstKill ? r.monster.level : 0;
  view.adventureRewards.push({
    id,
    playerId: actor.id,
    monsterId: r.monsterId,
    outcome: r.outcome,
    xp,
    firstKill,
    spawnId: action.encounter.spawnId,
    at: iso(at),
    dungeonRulesVersion: 1,
    essenceRulesVersion: 1,
  });
  if (r.outcome === 'victory')
    creditVictory(view, {
      id: 'gold-' + id,
      playerId: actor.id,
      amount: r.monster.boss ? 10 : 3,
      at: iso(at),
    });
  const plan = {
    encounterId: id,
    playerId: actor.id,
    monsterId: r.monsterId,
    monsterSnapshot: r.monster,
    endsAt: action.endsAt,
    spawnId: action.encounter.spawnId,
    dungeonRulesVersion: 1,
    essenceRulesVersion: 1,
  };
  resolveSpawn(view, plan, r, iso(at));
  recordBattle(view, {
    id,
    playerId: actor.id,
    at: iso(at),
    monsterSnapshot: r.monster,
    playerStats: r.playerStats,
    initialHp: action.before.hp,
    playerSkills: r.playerSkills,
    enemyMaxHp: r.enemyMaxHp,
    turns: r.turns,
    outcome: r.outcome,
    xp,
  });
  actor.player.combatXp = (actor.player.combatXp || 0) + xp;
  actor.hp = Math.max(
    0,
    r.hp - Math.max(0, (actor.healthDamage || 0) - (action.before.healthDamage || 0)),
  );
  actor.expedition.encounters++;
  dropEssence(view, plan, r, iso(at));
  for (const a of state.actors) a.player.energy = a.energy;
  decideEssences(view, iso(at));
  for (const key of LEDGERS) state.ledger[key] = view[key];
  return {
    summary: r.outcome === 'victory' ? `${r.enemy} 대련 승리` : `${r.enemy}에게서 안전하게 후퇴`,
    outcome: r.outcome,
    xp,
    gold: r.outcome === 'victory' ? (r.monster.boss ? 10 : 3) : 0,
  };
}
function finishAction(state, actor, at) {
  const action = actor.active;
  const resources = copy(state.resources);
  let result = { summary: action.label + ' 완료' };
  switch (action.type) {
    case 'move':
      actor.placeId = action.params.to;
      actor.energy -= 3;
      if (!action.survivalVersion) actor.hunger += 4;
      result.summary = state.places.find((p) => p.id === actor.placeId).name + ' 도착';
      break;
    case 'work': {
      const { resource, amount } = action.params;
      if (
        !['food', 'materials', 'knowledge'].includes(resource) ||
        !Number.isInteger(amount) ||
        amount < 0 ||
        amount > 5
      )
        throw Error('Invalid work output');
      const limit =
        resource === 'food'
          ? state.rules.foodCapacity
          : resource === 'materials'
            ? state.rules.materialCapacity
            : 1e9;
      const made = Math.max(0, Math.min(amount, limit - state.resources[resource]));
      state.resources[resource] += made;
      actor.workCount++;
      actor.energy -= 10;
      if (!action.survivalVersion) actor.hunger += 10;
      result = {
        summary: made
          ? `${action.params.task} · ${made}만큼 생산`
          : '보관 공간이 가득 차 작업을 정리함',
        resource,
        amount: made,
      };
      if (action.survivalVersion && made > 0) {
        creditWage(ledgerWorld(state), {
          id: 'wage-' + action.id,
          playerId: actor.id,
          amount: action.params.wage,
          at: iso(at),
        });
        result.wage = action.params.wage;
        result.summary += ' · 임금 ' + action.params.wage + 'G';
      }
      break;
    }
    case 'buy_food': {
      const { quantity, unitPrice } = action.params;
      const paid =
        state.resources.food >= quantity &&
        payLivingCost(ledgerWorld(state), {
          id: 'food-' + action.id,
          playerId: actor.id,
          amount: quantity * unitPrice,
          at: iso(at),
          kind: 'food',
        });
      if (paid) {
        state.resources.food -= quantity;
        for (let i = 0; i < quantity; i++)
          actor.food.push({
            id: action.id + '-' + i,
            boughtAt: iso(at),
            expiresAt: iso(at + state.rules.survival.foodShelfDays * state.rules.survival.dayMs),
          });
      }
      result = {
        summary: paid
          ? '음식 ' + quantity + '개 구매 · ' + quantity * unitPrice + 'G 지불'
          : '돈 또는 음식 재고가 부족해 구매하지 못함',
        success: paid,
        quantity: paid ? quantity : 0,
        cost: paid ? quantity * unitPrice : 0,
      };
      break;
    }
    case 'treat': {
      const paid =
        actor.illness &&
        payLivingCost(ledgerWorld(state), {
          id: 'treatment-' + action.id,
          playerId: actor.id,
          amount: action.params.price,
          at: iso(at),
          kind: 'treatment',
        });
      if (paid) {
        actor.illness = null;
        actor.hp = Math.min(combatStats(actor.player).maxHp, actor.hp + 8);
      }
      result = {
        summary: paid ? '치료를 받고 상태 이상에서 회복함' : '치료가 필요 없거나 비용이 부족함',
        success: Boolean(paid),
        cost: paid ? action.params.price : 0,
      };
      break;
    }
    case 'eat': {
      let available;
      if (action.survivalVersion) {
        actor.food = actor.food.filter((item) => Date.parse(item.expiresAt) > at);
        available = actor.food.length >= action.params.foodCost;
        if (available) actor.food.splice(0, action.params.foodCost);
      } else {
        available = state.resources.food >= action.params.foodCost;
        if (available) state.resources.food -= action.params.foodCost;
      }
      if (available) {
        actor.hunger -= 45;
        actor.energy += 24;
        if (actor.hunger < 90) actor.starvingSince = null;
        result.summary = '구매한 음식을 먹고 기운을 회복함';
      } else result.summary = '먹을 음식이 없어 식사를 미룸';
      result.success = available;
      break;
    }
    case 'rest':
      actor.energy += 22;
      if (!action.survivalVersion) actor.hunger += 2;
      actor.hp = Math.min(combatStats(actor.player).maxHp, actor.hp + 12);
      result.summary = '휴식을 마치고 회복함';
      break;
    case 'social': {
      const partner = state.actors.find((a) => a.id === action.params.partnerId);
      if (partner && partner.placeId === actor.placeId && partner.active?.type !== 'move') {
        relationship(actor.player, partner.id, 1);
        relationship(partner.player, actor.id, 1);
        result = {
          summary: `${partner.player.name}와 대화 · 친밀도 +1`,
          partnerId: partner.id,
          affinityDelta: 1,
          lines: [
            { speakerId: actor.id, text: `${action.params.topic}에 대해 같이 생각해볼래?` },
            {
              speakerId: partner.id,
              text: `좋아. 나는 ${profession(partner.player).task}에 관심이 있어.`,
            },
          ],
          partnerAfter: snapshotActor(partner),
        };
      } else result.summary = '이웃이 자리를 떠나 다음에 이야기하기로 함';
      actor.energy -= 2;
      if (!action.survivalVersion) actor.hunger += 3;
      break;
    }
    case 'prepare':
      actor.energy -= 2;
      result.summary = '탐험 준비를 마침';
      break;
    case 'search':
      actor.energy -= 5;
      if (!action.survivalVersion) actor.hunger += 6;
      actor.expedition.searches++;
      result.summary = '동굴 안을 살펴봄';
      break;
    case 'fight':
      result = settleFight(state, actor, action, at);
      actor.energy -= 8;
      if (!action.survivalVersion) actor.hunger += 8;
      break;
  }
  actor.energy = clamp(actor.energy);
  actor.hunger = clamp(actor.hunger);
  actor.player.energy = actor.energy;
  actor.player.memory = [...(actor.player.memory || []), `${iso(at)} · ${result.summary}`].slice(
    -30,
  );
  const after = snapshotActor(actor);
  const record = {
    ...action,
    after,
    result,
    resourceDelta: Object.fromEntries(
      Object.keys(resources).map((k) => [k, state.resources[k] - resources[k]]),
    ),
  };
  // Battle snapshots and turn logs remain immutable in the action record.
  appendLog(state, record);
  state.completed++;
  actor.active = null;
  if (state.survival && actor.hp <= 0) {
    killActor(state, actor, at, '질병과 부상 악화');
    return;
  }
  const trip = actor.expedition;
  if (trip) {
    if (trip.returning && actor.placeId === trip.returnTo && action.type === 'move') {
      appendLog(state, {
        id: trip.id,
        actorId: actor.id,
        type: 'explore',
        composite: true,
        label: '탐험과 귀환',
        startsAt: trip.startedAt,
        endsAt: iso(at),
        before: trip.before,
        after: snapshotActor(actor),
        params: {
          destination: 'dungeon',
          returnTo: trip.returnTo,
          timeLimitMinutes: trip.timeLimitMinutes,
          retreatHpRatio: trip.retreatHpRatio,
        },
        result: { summary: `탐험 ${trip.encounters}회 조우 후 귀환`, encounters: trip.encounters },
        resourceDelta: { food: 0, materials: 0, knowledge: 0 },
      });
      actor.expedition = null;
    } else if (action.type === 'search' || action.type === 'fight') {
      const limitReached =
        at + 11 * MINUTE >= Date.parse(trip.deadline) ||
        actor.hp <= combatStats(actor.player).maxHp * trip.retreatHpRatio ||
        actor.energy < 25 ||
        (state.survival && actor.hunger >= 90) ||
        trip.encounters >= trip.maxEncounters ||
        trip.searches >= 4 ||
        result.outcome === 'retreat';
      if (limitReached) returnFromExpedition(actor);
      else if (
        action.type === 'search' &&
        random(actor) < state.rules.exploration.encounterChance
      ) {
        const encounter = encounterFor(state, actor, at);
        if (encounter)
          actor.queue.unshift({
            type: 'fight',
            params: {
              placeId: 'dungeon',
              floor: encounter.floor,
              monsterId: encounter.monster.id,
              retreatHpRatio: trip.retreatHpRatio,
            },
            encounter,
            reason: '탐색 중 몬스터를 만나 대련한다.',
          });
        else returnFromExpedition(actor);
      } else
        actor.queue.unshift({
          type: 'search',
          params: { placeId: 'dungeon' },
          reason: '탐험 시간을 확인하고 계속 탐색한다.',
        });
    }
  }
  startNext(state, actor, at);
}
export function advanceLife(state, target, { maxActions = 20000 } = {}) {
  if (!Number.isFinite(target) || target < Date.parse(state.updatedAt))
    throw Error('Cannot rewind the authoritative world');
  let count = 0;
  const nextTime = () =>
    Math.min(
      ...state.actors.map((a) => Date.parse(a.active.endsAt)),
      state.survival ? Date.parse(state.survival.nextVitalAt) : Infinity,
      state.survival ? Date.parse(state.survival.nextPopulationAt) : Infinity,
    );
  while (count < maxActions) {
    const next = state.actors
      .slice()
      .sort(
        (a, b) =>
          Date.parse(a.active.endsAt) - Date.parse(b.active.endsAt) || a.id.localeCompare(b.id),
      )[0];
    const actionAt = next ? Date.parse(next.active.endsAt) : Infinity;
    const vitalAt = state.survival ? Date.parse(state.survival.nextVitalAt) : Infinity;
    const populationAt = state.survival ? Date.parse(state.survival.nextPopulationAt) : Infinity;
    const at = Math.min(actionAt, vitalAt, populationAt);
    if (at > target) break;
    if (actionAt <= vitalAt && actionAt <= populationAt) finishAction(state, next, at);
    else if (vitalAt <= populationAt) tickVitals(state, at);
    else for (const actor of tickPopulation(state, at)) startNext(state, actor, at);
    count++;
  }
  const nextAt = nextTime(),
    reached = nextAt > target,
    time = reached ? target : nextAt - 1;
  if (time > Date.parse(state.updatedAt)) {
    state.updatedAt = iso(time);
    state.revision++;
  }
  return { count, reached, updatedAt: state.updatedAt };
}
export function validateLife(state) {
  validateRules(state.rules);
  if (
    state.schemaVersion !== 1 ||
    state.rules.version !== 1 ||
    !Array.isArray(state.actors) ||
    state.actors.length > 100 ||
    !Number.isFinite(Date.parse(state.updatedAt))
  )
    throw Error('Invalid life state');
  const all = knownActors(state);
  const ids = new Set(all.map((a) => a.id));
  if (ids.size !== all.length || new Set(state.logs.map((r) => r.id)).size !== state.logs.length)
    throw Error('Duplicate life identity or log');
  const now = Date.parse(state.updatedAt);
  for (const actor of state.actors) {
    if (
      actor.energy < 0 ||
      actor.energy > 100 ||
      actor.hunger < 0 ||
      actor.hunger > 100 ||
      actor.hp <= 0 ||
      actor.hp > combatStats(actor.player).maxHp
    )
      throw Error('Invalid actor vitals');
    if (
      !actor.active ||
      Date.parse(actor.active.startsAt) > now ||
      Date.parse(actor.active.endsAt) <= now
    )
      throw Error('Invalid active interval');
    validateRequest({ ...state, actors: all }, actor, {
      type: actor.active.type,
      params: actor.active.params,
    });
  }
  for (const record of state.logs)
    if (
      !ids.has(record.actorId) ||
      Date.parse(record.endsAt) > now ||
      (record.event
        ? Date.parse(record.startsAt) > Date.parse(record.endsAt)
        : Date.parse(record.startsAt) >= Date.parse(record.endsAt))
    )
      throw Error('Invalid performed action');
  for (const amount of Object.values(state.resources))
    if (!Number.isFinite(amount) || amount < 0) throw Error('Invalid autonomous resource balance');
  const balances = { ...state.replayResources };
  for (const record of state.logs)
    if (!record.composite)
      for (const [key, delta] of Object.entries(record.resourceDelta || {})) balances[key] += delta;
  for (const key of Object.keys(state.resources))
    if (balances[key] !== state.resources[key]) throw Error('Life resource ledger mismatch');
  const view = ledgerWorld(state, true);
  if (new Set(view.adventureRewards.map((r) => r.id)).size !== view.adventureRewards.length)
    throw Error('Duplicate life reward');
  for (const actor of all)
    if (
      (actor.player.combatXp || 0) !==
      view.adventureRewards.filter((r) => r.playerId === actor.id).reduce((n, r) => n + r.xp, 0)
    )
      throw Error('Life XP ledger mismatch');
  if (state.survival) {
    const rules = state.rules.survival;
    if (
      rules.populationCap > 100 ||
      rules.populationCap < 1 ||
      rules.newcomerChance < 0 ||
      rules.newcomerChance > 1 ||
      rules.dayMs <= 0 ||
      rules.daysPerYear <= 0 ||
      rules.foodPrice < 1 ||
      !Number.isInteger(rules.foodPrice) ||
      rules.workWage < 1
    )
      throw Error('Invalid survival rules');
    for (const actor of state.actors) {
      if (
        actor.alive === false ||
        !Number.isFinite(actor.initialAge) ||
        !Array.isArray(actor.food) ||
        balance(view, actor.id) < 0
      )
        throw Error('Invalid living resident');
    }
    for (const actor of Object.values(state.departed || {}))
      if (
        actor.alive !== false ||
        actor.active ||
        !actor.deathAt ||
        state.actors.some((a) => a.id === actor.id)
      )
        throw Error('Invalid deceased resident');
    if (new Set(view.economy.ledger.map((t) => t.id)).size !== view.economy.ledger.length)
      throw Error('Duplicate living transaction');
  }
  validateEssences(view);
  return true;
}
