import { ACTIONS, pathPoint, pointFor } from './catalog.mjs';
import { advanceLife } from './engine.mjs';
import { retainBattleLogs } from '../combatHistory.mjs';
const copy = (value) => structuredClone(value);
const time = (value) => Date.parse(value);
function actionAt(records, active, id, at) {
  return (
    records.find(
      (r) => !r.composite && r.actorId === id && time(r.startsAt) <= at && at < time(r.endsAt),
    ) || (active && time(active.startsAt) <= at && at < time(active.endsAt) ? active : null)
  );
}
export function replayLife(state, requestedAt) {
  const at = Math.max(time(state.replayStartsAt), Math.min(time(state.updatedAt), requestedAt));
  const actors = new Map(state.replayActors.map((a) => [a.id, copy(a)]));
  const resources = copy(state.replayResources);
  for (const record of state.logs) {
    if (record.composite || time(record.endsAt) > at) continue;
    actors.set(record.actorId, copy(record.after));
    if (record.result.partnerAfter)
      actors.set(record.result.partnerAfter.id, copy(record.result.partnerAfter));
    for (const [key, delta] of Object.entries(record.resourceDelta || {})) resources[key] += delta;
  }
  const frames = state.actors.map((actor) => {
    const snapshot = actors.get(actor.id);
    const active = actionAt(state.logs, actor.active, actor.id, at);
    const progress = active
      ? Math.max(
          0,
          Math.min(1, (at - time(active.startsAt)) / (time(active.endsAt) - time(active.startsAt))),
        )
      : 0;
    const position =
      active?.type === 'move'
        ? pathPoint(active.params.path, progress)
        : pointFor(state, actor, snapshot.placeId);
    return { ...snapshot, position, active, progress };
  });
  return { at, actors: frames, resources };
}
export function compactReplay(state, { maxLogs = 1500 } = {}) {
  if (state.logs.length <= maxLogs) return;
  const cutoff = time(state.logs[state.logs.length - maxLogs - 1].endsAt);
  const frame = replayLife(state, cutoff);
  state.replayActors = frame.actors.map(({ position, active, progress, ...actor }) => actor);
  state.replayResources = frame.resources;
  state.replayStartsAt = new Date(cutoff).toISOString();
  state.logs = state.logs.filter((r) => time(r.endsAt) > cutoff);
}
export function projectLife(state, now, { horizonMs = 10 * 60000 } = {}) {
  const target = Math.max(time(state.updatedAt), Math.min(now, time(state.updatedAt) + horizonMs));
  const projected = copy({ ...state, logs: [], replayActors: [], replayResources: {} });
  const status = advanceLife(projected, target, { maxActions: 2000 });
  return {
    state: projected,
    at: time(projected.updatedAt),
    provisional: target > time(state.updatedAt),
    behind: now > time(state.updatedAt) + horizonMs || !status.reached,
  };
}
function combatFrame(action, progress) {
  if (!action?.combat) return null;
  const result = action.combat,
    index = Math.min(result.turns.length, Math.floor(progress * (result.turns.length + 1)));
  return index === 0
    ? {
        hp: action.before.hp,
        enemyHp: result.enemyMaxHp,
        turn: 0,
        phase: 'idle',
        damage: 0,
        received: 0,
      }
    : result.turns[index - 1];
}
function mergeIds(...lists) {
  return [...new Map(lists.flat().map((item) => [item.id, item])).values()];
}
export function lifeWorld(base, state, at, { replay = false } = {}) {
  const frame = replay
    ? replayLife(state, at)
    : {
        at,
        resources: state.resources,
        actors: state.actors.map((actor) => {
          const active = actor.active;
          const progress = Math.max(
            0,
            Math.min(
              1,
              (at - time(active.startsAt)) / (time(active.endsAt) - time(active.startsAt)),
            ),
          );
          return {
            ...actor,
            position:
              active.type === 'move'
                ? pathPoint(active.params.path, progress)
                : pointFor(state, actor, actor.placeId),
            progress,
          };
        }),
      };
  const players = frame.actors.map((actor) => {
    const current = state.actors.find((a) => a.id === actor.id);
    const source = base.players.find((p) => p.id === actor.id) || current.player;
    const snapshot = replay
      ? {
          ...source,
          combatXp: actor.combatXp,
          skillRulesVersion: actor.skillRulesVersion,
          skills: actor.skills,
          relationships: actor.relationships,
          memory: actor.memory,
        }
      : current.player;
    return {
      ...snapshot,
      id: actor.id,
      energy: actor.energy,
      hp: combatFrame(actor.active, actor.progress)?.hp ?? actor.hp,
      hunger: actor.hunger,
      location: actor.active?.type === 'move' ? actor.active.params.from : actor.placeId,
      mood:
        actor.energy < 30
          ? '피곤'
          : actor.hunger > 65
            ? '배고픔'
            : actor.active?.type === 'social'
              ? '즐거움'
              : '평온',
      currentAction: actor.active?.label || '다음 행동 준비 중',
      lifeAction: actor.active,
      lifeProgress: actor.progress,
    };
  });
  const activities = Object.fromEntries(
    frame.actors.map((actor) => {
      const action = actor.active;
      if (!action) return [actor.id, null];
      const result = action.combat,
        progress = actor.progress;
      const turn = combatFrame(action, progress);
      return [
        actor.id,
        {
          ...actor.position,
          id: action.type,
          kind: ACTIONS[action.type].kind,
          actionType: action.type,
          label: action.label,
          placeId: action.type === 'move' ? null : actor.placeId,
          progress,
          after: false,
          result: result ? { ...result, awardXp: 0 } : null,
          turn,
          plan: {
            id: action.id,
            home: action.params.from || actor.placeId,
            destination: action.params.to || actor.placeId,
            startsAt: action.startsAt,
            endsAt: action.endsAt,
            floor: action.params.floor,
            monsterSnapshot: action.encounter?.monster,
          },
          step: {
            ...action.params,
            kind: ACTIONS[action.type].kind,
            label: action.label,
            startsAt: action.startsAt,
            endsAt: action.endsAt,
            placeId: action.params.placeId,
          },
          action,
        },
      ];
    }),
  );
  const ended = state.logs.filter((r) => time(r.endsAt) <= frame.at);
  const events = ended
    .filter((r) => !r.composite)
    .map((r) => ({
      id: r.id,
      cycle: base.cycle,
      at: r.endsAt,
      type: r.type === 'social' ? 'dialogue' : 'action',
      actorId: r.actorId,
      targetId: r.result.partnerId,
      location: r.after.placeId,
      text: r.result.summary,
      reason: r.reason,
      outcome: r.result.summary,
      lifeRecord: r,
    }));
  const combined = {
    ...base,
    legacyWorld: base,
    players,
    lifeActivities: activities,
    lifeReplay: replay,
    lifeLogs: ended,
    lifeAt: new Date(frame.at).toISOString(),
    lifeResources: frame.resources,
    lastUpdated: replay ? new Date(frame.at).toISOString() : state.updatedAt,
    nextUpdateAt: new Date(time(state.updatedAt) + 5 * 60000).toISOString(),
    storageState: {
      ...base.storageState,
      shelf: Math.min(base.storageState?.capacity || 6, frame.resources.food),
      day: Math.max(0, frame.resources.food - (base.storageState?.capacity || 6)),
    },
    metrics: { ...base.metrics, food: frame.resources.food, materials: frame.resources.materials },
    events: mergeIds(base.events, events),
    battleLogs: replay
      ? retainBattleLogs(
          mergeIds(
            base.battleLogs || [],
            ended
              .filter((r) => r.type === 'fight')
              .map((r) => ({
                id: r.id,
                playerId: r.actorId,
                at: r.endsAt,
                monsterSnapshot: r.combat.monster,
                playerStats: r.combat.playerStats,
                initialHp: r.before.hp,
                enemyMaxHp: r.combat.enemyMaxHp,
                turns: r.combat.turns,
                outcome: r.result.outcome,
                xp: r.result.xp,
              })),
          ),
        )
      : retainBattleLogs(mergeIds(base.battleLogs || [], state.ledger.battleLogs)),
    adventureRewards: state.ledger.adventureRewards,
    economy: state.ledger.economy,
    dungeonSpawns: state.ledger.dungeonSpawns,
    essenceDrops: state.ledger.essenceDrops,
    essenceAbsorptions: state.ledger.essenceAbsorptions,
    essenceDecisions: state.ledger.essenceDecisions,
  };
  if (replay) {
    combined.adventureRewards = combined.adventureRewards.filter((r) => time(r.at) <= frame.at);
    combined.dungeonSpawns = { ...base.dungeonSpawns };
    for (const reward of combined.adventureRewards)
      if (reward.outcome === 'victory' && reward.spawnId)
        combined.dungeonSpawns[reward.spawnId] = {
          defeatedBy: reward.playerId,
          encounterId: reward.id,
          at: reward.at,
          readyAt: new Date(time(reward.at) + 600000).toISOString(),
        };
    combined.economy = {
      ledger: combined.economy.ledger.filter((r) => time(r.at) <= frame.at),
      orders: combined.economy.orders.filter((r) => time(r.at) <= frame.at),
    };
    combined.essenceDrops = combined.essenceDrops.filter((r) => time(r.at) <= frame.at);
    combined.essenceAbsorptions = combined.essenceAbsorptions.filter((r) => time(r.at) <= frame.at);
    combined.essenceDecisions = combined.essenceDecisions.filter((r) => time(r.at) <= frame.at);
  }
  return combined;
}
export function archiveDay(state, day) {
  const begin = Math.max(
    time(state.startedAt),
    time(state.replayStartsAt),
    Date.parse(day + 'T00:00:00Z'),
  );
  const end = Math.min(time(state.updatedAt), Date.parse(day + 'T00:00:00Z') + 86400000 - 1);
  if (end < begin) return null;
  const first = replayLife(state, begin),
    last = replayLife(state, end);
  return {
    ...state,
    updatedAt: new Date(end).toISOString(),
    replayStartsAt: new Date(begin).toISOString(),
    replayActors: first.actors.map(({ position, active, progress, ...actor }) => actor),
    replayResources: first.resources,
    logs: state.logs.filter((r) => time(r.endsAt) > begin && time(r.endsAt) <= end),
    actors: state.actors.map((a) => ({ ...a, ...last.actors.find((r) => r.id === a.id) })),
  };
}
