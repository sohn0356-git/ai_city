export const MINUTE = 60000;
export const ACTIONS = Object.freeze({
  buy_food: {
    name: '음식 구매',
    kind: 'working',
    duration: [1, 2],
    inputs: ['placeId', 'quantity', 'unitPrice', 'durationSeconds'],
  },
  treat: {
    name: '치료',
    kind: 'resting',
    duration: [3, 5],
    inputs: ['placeId', 'price', 'durationSeconds'],
  },
  condition: { name: '건강·생활 변화', event: true, inputs: [] },
  death: { name: '사망', event: true, inputs: [] },
  arrival: { name: '신규 입주', event: true, inputs: [] },
  move: {
    name: '이동',
    kind: 'walking',
    duration: [2, 5],
    inputs: ['from', 'to', 'durationSeconds', 'path'],
  },
  work: {
    name: '직업 활동',
    kind: 'working',
    duration: [6, 12],
    inputs: ['placeId', 'task', 'resource', 'amount', 'durationSeconds'],
  },
  eat: {
    name: '식사',
    kind: 'resting',
    duration: [3, 5],
    inputs: ['placeId', 'foodCost', 'durationSeconds'],
  },
  rest: {
    name: '휴식',
    kind: 'resting',
    duration: [5, 10],
    inputs: ['placeId', 'durationSeconds'],
  },
  social: {
    name: '이웃과 대화',
    kind: 'working',
    duration: [2, 4],
    inputs: ['placeId', 'partnerId', 'topic', 'durationSeconds'],
  },
  prepare: {
    name: '탐험 준비',
    kind: 'working',
    duration: [1, 2],
    inputs: ['placeId', 'durationSeconds'],
  },
  search: {
    name: '동굴 탐색',
    kind: 'working',
    duration: [3, 6],
    inputs: ['placeId', 'floor', 'durationSeconds'],
  },
  fight: {
    name: '대련',
    kind: 'fighting',
    duration: [2, 4],
    inputs: ['placeId', 'floor', 'monsterId', 'retreatHpRatio', 'durationSeconds'],
  },
  explore: {
    name: '탐험',
    composite: true,
    inputs: ['destination', 'timeLimitMinutes', 'retreatHpRatio', 'maxEncounters', 'returnTo'],
  },
});
export const DEFAULT_RULES = Object.freeze({
  version: 1,
  foodCapacity: 40,
  materialCapacity: 200,
  weights: { work: 5, social: 2, rest: 1, move: 1, explore: 2 },
  exploration: {
    timeLimitMinutes: 40,
    retreatHpRatio: 0.35,
    maxEncounters: 2,
    encounterChance: 0.65,
  },
});
export function hashSeed(text) {
  let n = 2166136261;
  for (const c of String(text)) {
    n ^= c.charCodeAt(0);
    n = Math.imul(n, 16777619) >>> 0;
  }
  return n || 1;
}
export function random(actor) {
  actor.rng = (Math.imul(actor.rng, 1664525) + 1013904223) >>> 0;
  return actor.rng / 4294967296;
}
export function pick(actor, items) {
  return items[Math.floor(random(actor) * items.length)];
}
export function weighted(actor, choices) {
  const sum = choices.reduce((n, c) => n + c.weight, 0);
  let value = random(actor) * sum;
  return (choices.find((c) => (value -= c.weight) < 0) || choices.at(-1)).value;
}
export function profession(player) {
  const role = player.role;
  if (/농부|양봉/.test(role))
    return { placeId: 'farm', task: '작물 돌보고 수확하기', resource: 'food', amount: 2 };
  if (/정원/.test(role))
    return { placeId: 'garden', task: '정원과 벌통 돌보기', resource: 'food', amount: 1 };
  if (/요리|제빵|카페/.test(role))
    return { placeId: 'cafe', task: '식사 준비와 카페 정리', resource: 'knowledge', amount: 1 };
  if (/수리|목수|재봉|발명|도예/.test(role))
    return { placeId: 'lab', task: '도구와 생활용품 만들기', resource: 'materials', amount: 1 };
  if (/화가|음악|극작/.test(role))
    return { placeId: 'studio', task: '새 작품 만들기', resource: 'knowledge', amount: 1 };
  if (/기자|서점|연구|관측|개발/.test(role))
    return { placeId: 'library', task: '기록 읽고 연구하기', resource: 'knowledge', amount: 1 };
  return {
    placeId: 'hall',
    task: '도시 계획과 이웃의 요청 살피기',
    resource: 'knowledge',
    amount: 1,
  };
}
export function pointFor(state, actor, placeId) {
  const place = state.places.find((p) => p.id === placeId);
  if (!place) throw Error('Unknown action place: ' + placeId);
  const index = Number(actor.id.replace(/\D/g, '')) || 1;
  return {
    x: place.x + ((index % 4) - 1.5) * 3,
    y: Math.min(96, place.y + 7 + (Math.floor(index / 4) % 3) * 3),
  };
}
export function routePoints(from, to) {
  return [from, { x: from.x, y: 50 }, { x: to.x, y: 50 }, to];
}
export function pathPoint(path, progress) {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? remaining / lengths[i] : 1;
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * t,
        y: path[i].y + (path[i + 1].y - path[i].y) * t,
      };
    }
    remaining -= lengths[i];
  }
  return path[0];
}
export function validateRequest(state, actor, request) {
  const definition = ACTIONS[request.type];
  if (!definition || definition.composite || definition.event)
    throw Error('Unknown primitive action');
  const p = request.params || {};
  if (!Number.isInteger(p.durationSeconds) || p.durationSeconds < 1 || p.durationSeconds > 7200)
    throw Error('Invalid action duration');
  const known = (id) => state.places.some((place) => place.id === id);
  if (request.type === 'move') {
    if (!known(p.from) || !known(p.to) || p.from !== actor.placeId || p.from === p.to)
      throw Error('Invalid movement endpoints');
    if (
      !Array.isArray(p.path) ||
      p.path.length < 2 ||
      p.path.some(
        (q) =>
          !Number.isFinite(q.x) ||
          !Number.isFinite(q.y) ||
          q.x < 0 ||
          q.x > 100 ||
          q.y < 0 ||
          q.y > 100,
      )
    )
      throw Error('Invalid movement path');
    const from = pointFor(state, actor, p.from),
      to = pointFor(state, actor, p.to);
    if (
      Math.hypot(p.path[0].x - from.x, p.path[0].y - from.y) > 0.01 ||
      Math.hypot(p.path.at(-1).x - to.x, p.path.at(-1).y - to.y) > 0.01
    )
      throw Error('Path endpoints do not match places');
  } else if (!known(p.placeId) || p.placeId !== actor.placeId)
    throw Error('Actor must arrive before acting');
  if (
    request.type === 'social' &&
    (!state.actors.some((a) => a.id === p.partnerId) || p.partnerId === actor.id)
  )
    throw Error('Invalid conversation partner');
  if (
    request.type === 'work' &&
    (!['food', 'materials', 'knowledge'].includes(p.resource) ||
      !Number.isInteger(p.amount) ||
      p.amount < 0 ||
      p.amount > 5 ||
      !p.task)
  )
    throw Error('Invalid work parameters');
  if (request.type === 'eat' && (!Number.isInteger(p.foodCost) || p.foodCost < 1 || p.foodCost > 3))
    throw Error('Invalid meal cost');
  if (
    request.type === 'buy_food' &&
    (!Number.isInteger(p.quantity) ||
      p.quantity < 1 ||
      p.quantity > 3 ||
      !Number.isSafeInteger(p.unitPrice) ||
      p.unitPrice < 1)
  )
    throw Error('Invalid food purchase');
  if (request.type === 'treat' && (!Number.isSafeInteger(p.price) || p.price < 1))
    throw Error('Invalid treatment price');
  if (
    request.type === 'work' &&
    p.wage !== undefined &&
    (!Number.isSafeInteger(p.wage) || p.wage < 1)
  )
    throw Error('Invalid wage');
  return true;
}
export function validateRules(rules) {
  const exploration = rules.exploration;
  if (
    rules.version !== 1 ||
    !Number.isInteger(rules.foodCapacity) ||
    rules.foodCapacity < 1 ||
    rules.foodCapacity > 100 ||
    !Number.isInteger(rules.materialCapacity) ||
    rules.materialCapacity < 1
  )
    throw Error('Invalid world rules');
  if (
    !['work', 'social', 'rest', 'move', 'explore'].every(
      (k) => Number.isFinite(rules.weights?.[k]) && rules.weights[k] >= 0,
    ) ||
    Object.values(rules.weights).reduce((a, b) => a + b, 0) <= 0
  )
    throw Error('Invalid action weights');
  if (
    !exploration ||
    exploration.timeLimitMinutes < 15 ||
    exploration.timeLimitMinutes > 120 ||
    exploration.retreatHpRatio < 0.1 ||
    exploration.retreatHpRatio > 0.8 ||
    !Number.isInteger(exploration.maxEncounters) ||
    exploration.maxEncounters < 1 ||
    exploration.maxEncounters > 5 ||
    !Number.isFinite(exploration.encounterChance) ||
    exploration.encounterChance < 0 ||
    exploration.encounterChance > 1
  )
    throw Error('Invalid exploration rules');
  return true;
}
