import { hashSeed, random, pick, profession } from './catalog.mjs';
import { combatStats } from '../progression.mjs';
import { balance } from '../economy.mjs';
import { appendLog, snapshotActor, knownActors, iso } from './state.mjs';

export const SURVIVAL_RULES = Object.freeze({
  version: 1,
  dayMs: 3600000,
  daysPerYear: 30,
  hoursPerDay: 24,
  hungerPerHour: 2,
  starvationDays: 2,
  foodPrice: 2,
  workWage: 2,
  treatmentPrice: 4,
  foodShelfDays: 1,
  illnessAge: 60,
  youngIllnessChance: 0.005,
  olderIllnessChance: 0.025,
  illnessIncreasePerYear: 0.003,
  oldAgeRiskFrom: 85,
  oldAgeChance: 0.002,
  oldAgeIncreasePerYear: 0.004,
  maxAge: 105,
  newcomerChance: 0.25,
  populationCap: 100,
});
export function ageAt(actor, at, rules) {
  if (!Number.isFinite(actor.initialAge) || !actor.ageReferenceAt || !rules) return null;
  return (
    actor.initialAge +
    Math.max(0, at - Date.parse(actor.ageReferenceAt)) / (rules.dayMs * rules.daysPerYear)
  );
}
export function illnessRisk(age, rules) {
  return Math.min(
    0.5,
    age < rules.illnessAge
      ? rules.youngIllnessChance
      : rules.olderIllnessChance + (age - rules.illnessAge) * rules.illnessIncreasePerYear,
  );
}
export function applyVitals(actor, at, rules) {
  if (!actor.lastVitalAt || !rules) return actor;
  const interval = rules.dayMs / rules.hoursPerDay;
  let cursor = Date.parse(actor.lastVitalAt);
  while (cursor + interval <= at) {
    cursor += interval;
    actor.hunger = Math.min(100, actor.hunger + rules.hungerPerHour);
    if (actor.hunger >= 100) {
      actor.starvingSince ??= iso(cursor);
      actor.energy = Math.max(0, actor.energy - 1);
    }
    if (actor.hunger < 90) actor.starvingSince = null;
    if (actor.illness && cursor < Date.parse(actor.illness.until)) {
      actor.hp = Math.max(0, actor.hp - actor.illness.severity);
      actor.healthDamage = (actor.healthDamage || 0) + actor.illness.severity;
    }
  }
  actor.lastVitalAt = iso(cursor);
  return actor;
}
export function migrateSurvival(
  state,
  { at = Date.parse(state.updatedAt), roster = [], log = true } = {},
) {
  if (state.survival) return false;
  state.rules.survival = structuredClone(state.rules.survival || SURVIVAL_RULES);
  const rules = state.rules.survival;
  state.departed ??= {};
  state.logSequence ??= 0;
  const used = new Set(knownActors(state).map((a) => a.id));
  state.newcomerPool = structuredClone(roster.filter((p) => !used.has(p.id)));
  state.survival = {
    version: 1,
    startsAt: iso(at),
    nextVitalAt: iso(at + rules.dayMs / rules.hoursPerDay),
    nextPopulationAt: iso(at + rules.dayMs),
    rng: hashSeed(state.seed + ':population'),
    nextResidentNumber:
      Math.max(
        100,
        ...[...used, ...roster.map((p) => p.id)].map((id) => Number(id.slice(1)) || 0),
      ) + 1,
    arrivals: 0,
    deaths: 0,
  };
  for (const actor of state.actors) {
    const before = snapshotActor(actor);
    Object.assign(actor, {
      alive: true,
      joinedAt: state.startedAt,
      ageReferenceAt: iso(at),
      initialAge: 18 + (hashSeed(actor.id + state.seed) % 38),
      lastVitalAt: iso(at),
      starvingSince: actor.hunger >= 100 ? iso(at) : null,
      illness: null,
      food: [],
      healthDamage: 0,
      vitalRng: hashSeed(state.seed + ':health:' + actor.id),
    });
    if (log)
      appendLog(state, {
        id: `policy-${state.sessionId}-${actor.id}`,
        actorId: actor.id,
        type: 'condition',
        event: true,
        label: '생존 생활 시작',
        startsAt: iso(at),
        endsAt: iso(at),
        before,
        after: snapshotActor(actor),
        params: {},
        result: { summary: `생존 생활 시작 · ${actor.initialAge}세` },
        resourceDelta: {},
      });
  }
  return true;
}
function event(state, actor, at, id, summary, before) {
  return appendLog(state, {
    id,
    actorId: actor.id,
    type: 'condition',
    event: true,
    label: '건강과 생활 변화',
    startsAt: iso(at),
    endsAt: iso(at),
    before,
    after: snapshotActor(actor),
    params: {},
    result: { summary },
    resourceDelta: {},
  });
}
export function killActor(state, actor, at, cause) {
  if (actor.alive === false) return false;
  const before = snapshotActor(actor),
    active = actor.active;
  actor.alive = false;
  actor.hp = 0;
  actor.deathAt = iso(at);
  actor.deathCause = cause;
  if (active && Date.parse(active.startsAt) < at)
    appendLog(state, {
      ...active,
      endsAt: iso(at),
      scheduledEndsAt: active.endsAt,
      status: 'interrupted',
      completed: false,
      after: snapshotActor(actor),
      result: { summary: '사망으로 행동 중단', cause },
      resourceDelta: {},
    });
  actor.active = null;
  actor.queue = [];
  actor.expedition = null;
  state.departed[actor.id] = actor;
  state.actors = state.actors.filter((a) => a.id !== actor.id);
  state.survival.deaths++;
  appendLog(state, {
    id: `death-${state.sessionId}-${actor.id}`,
    actorId: actor.id,
    type: 'death',
    event: true,
    label: '사망',
    startsAt: iso(at),
    endsAt: iso(at),
    before,
    after: snapshotActor(actor),
    params: { cause },
    result: {
      summary: `${actor.player.name} 사망 · ${cause}`,
      cause,
      age: ageAt(actor, at, state.rules.survival),
    },
    resourceDelta: {},
  });
  return true;
}
export function tickVitals(state, at) {
  const rules = state.rules.survival;
  for (const actor of [...state.actors]) {
    applyVitals(actor, at, rules);
    if (actor.illness && at >= Date.parse(actor.illness.until)) {
      const before = snapshotActor(actor);
      actor.illness = null;
      event(state, actor, at, `recover-${actor.id}-${at}`, '상태 이상에서 회복함', before);
    }
    const expired = actor.food.filter((item) => at >= Date.parse(item.expiresAt));
    if (expired.length) {
      const before = snapshotActor(actor);
      actor.food = actor.food.filter((item) => at < Date.parse(item.expiresAt));
      event(state, actor, at, `spoil-${actor.id}-${at}`, '보관한 음식의 소비 기한이 지남', before);
    }
    if (
      actor.starvingSince &&
      at - Date.parse(actor.starvingSince) >= rules.starvationDays * rules.dayMs
    )
      killActor(state, actor, at, '장기 굶주림');
    else if (actor.hp <= 0) killActor(state, actor, at, '질병 악화');
  }
  state.survival.nextVitalAt = iso(at + rules.dayMs / rules.hoursPerDay);
}
function newPlayer(state, at) {
  const population = state.survival;
  const used = new Set(knownActors(state).map((a) => a.id));
  const pool = (state.newcomerPool || []).filter((p) => !used.has(p.id));
  let p;
  if (pool.length) {
    p = structuredClone(pick(population, pool));
    state.newcomerPool = state.newcomerPool.filter((candidate) => candidate.id !== p.id);
  } else {
    const number = population.nextResidentNumber++;
    const names = ['하늘', '지안', '서아', '도현', '수빈', '가온', '유진', '이서', '지호', '다은'];
    const surnames = ['김', '이', '박', '정', '윤', '한'];
    let name = pick(population, surnames) + pick(population, names);
    if (knownActors(state).some((a) => a.player.name === name)) name += '·' + number;
    const role = pick(population, [
      '도시 농부',
      '목수',
      '요리사',
      '도시 연구자',
      '정원사',
      '카페 주인',
      '음악가',
    ]);
    p = {
      id: 'p' + String(number).padStart(3, '0'),
      name,
      role,
      kind: 'ai',
      goal: '자신의 일을 익히고 이웃과 함께 생활하기',
      quote: '오늘 할 일을 하나씩 해보자.',
      persona: {
        traits: pick(population, [
          '성실하고 신중하다',
          '활달하고 이웃을 좋아한다',
          '조용하고 탐구심이 많다',
        ]),
        voice: '차분하게 말한다',
        motivation: '안정적인 생활',
        tension: '새 도시의 생활에 적응 중',
      },
    };
  }
  return {
    ...p,
    location: 'hall',
    kind: 'ai',
    energy: 80,
    contributions: 0,
    combatXp: 0,
    progressionVersion: 3,
    skills: [],
    skillRulesVersion: 1,
    xpReset: undefined,
    memory: [`${iso(at)} · 도시에 새로 입주했다.`],
    longTermMemory: [`${iso(at)} 입주`],
    relationships: [],
    mood: '기대',
    currentAction: '도시 생활 시작',
  };
}
export function tickPopulation(state, at) {
  const rules = state.rules.survival;
  for (const actor of [...state.actors].sort((a, b) => a.id.localeCompare(b.id))) {
    const age = ageAt(actor, at, rules),
      rng = { rng: actor.vitalRng };
    const deathRoll = random(rng),
      illnessRoll = random(rng);
    actor.vitalRng = rng.rng;
    if (
      age >= rules.maxAge ||
      (age >= rules.oldAgeRiskFrom &&
        deathRoll <
          Math.min(
            0.5,
            rules.oldAgeChance + (age - rules.oldAgeRiskFrom) * rules.oldAgeIncreasePerYear,
          ))
    ) {
      killActor(state, actor, at, '노쇠');
      continue;
    }
    if (!actor.illness && illnessRoll < illnessRisk(age, rules)) {
      const before = snapshotActor(actor);
      actor.illness = {
        name: age >= rules.illnessAge ? '노년 쇠약' : '열병',
        since: iso(at),
        until: iso(at + rules.dayMs * (age >= rules.illnessAge ? 3 : 1)),
        severity: age >= 80 ? 3 : age >= rules.illnessAge ? 2 : 1,
      };
      event(
        state,
        actor,
        at,
        `illness-${actor.id}-${at}`,
        `${actor.illness.name} 발생 · 치료나 회복이 필요함`,
        before,
      );
    }
  }
  state.survival.nextPopulationAt = iso(at + rules.dayMs);
  const roll = random(state.survival);
  if (state.actors.length >= Math.min(100, rules.populationCap) || roll >= rules.newcomerChance)
    return [];
  const player = newPlayer(state, at),
    initialAge = 18 + Math.floor(random(state.survival) * 12);
  const actor = {
    id: player.id,
    player,
    placeId: 'hall',
    home: 'hall',
    energy: 80,
    hunger: 20,
    hp: combatStats(player).maxHp,
    sequence: 0,
    rng: hashSeed(state.seed + ':' + player.id),
    workCount: 0,
    queue: [],
    active: null,
    expedition: null,
    alive: true,
    joinedAt: iso(at),
    ageReferenceAt: iso(at),
    initialAge,
    lastVitalAt: iso(at),
    starvingSince: null,
    illness: null,
    food: [],
    healthDamage: 0,
    vitalRng: hashSeed(state.seed + ':health:' + player.id),
  };
  state.actors.push(actor);
  state.survival.arrivals++;
  appendLog(state, {
    id: `arrival-${state.sessionId}-${actor.id}`,
    actorId: actor.id,
    type: 'arrival',
    event: true,
    label: '신규 입주',
    startsAt: iso(at),
    endsAt: iso(at),
    before: null,
    after: snapshotActor(actor),
    params: {},
    result: { summary: `${player.name} 입주 · ${player.role}`, player: structuredClone(player) },
    resourceDelta: {},
  });
  return [actor];
}
export function survivalChoice(state, actor, at) {
  const rules = state.rules.survival;
  const funds = balance({ economy: state.ledger.economy }, actor.id);
  const food = actor.food.filter((item) => Date.parse(item.expiresAt) > at);
  if (actor.hunger >= 65) {
    if (food.length)
      return {
        type: 'eat',
        params: { placeId: actor.placeId, foodCost: 1 },
        reason: '구매해 둔 음식을 먹는다.',
      };
    if (funds >= rules.foodPrice && state.resources.food > 0)
      return {
        type: 'buy_food',
        params: { placeId: 'market', quantity: 1, unitPrice: rules.foodPrice },
        reason: '허기를 채울 오늘의 음식을 구매한다.',
      };
    if (actor.energy >= 12) {
      let work =
        state.resources.food <= 0
          ? { placeId: 'farm', task: '식재료 수확 돕기', resource: 'food', amount: 2 }
          : profession(actor.player);
      if (
        (work.resource === 'materials' &&
          state.resources.materials >= state.rules.materialCapacity) ||
        (work.resource === 'food' && state.resources.food >= state.rules.foodCapacity)
      )
        work = { placeId: 'hall', task: '마을 관리 돕기', resource: 'knowledge', amount: 1 };
      return { type: 'work', params: work, reason: '음식을 살 돈과 재고를 마련하기 위해 일한다.' };
    }
  }
  if (actor.illness && funds >= rules.treatmentPrice)
    return {
      type: 'treat',
      params: { placeId: 'lab', price: rules.treatmentPrice },
      reason: '상태 이상을 치료받는다.',
    };
  return null;
}
