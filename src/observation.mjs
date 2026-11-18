import { activityState, DUNGEON } from './activity.mjs';
import { residentPoint } from './mapLayout.mjs';

const phases = {
  walking: '이동 중',
  working: '일하는 중',
  resting: '쉬는 중',
  fighting: '탐험 중',
};

export function summarizeActivity(label = '') {
  const head = label.split(/[:：]/, 1)[0].trim();
  if (head.length && head.length <= 30 && head.length < label.length) return head;
  return label.length > 44 ? label.slice(0, 44).trimEnd() + '…' : label;
}

// One read model for the map, roster, place filters and inspector. Never writes world data.
export function observeWorld(source, now) {
  const world = source;
  const places = new Map([...world.buildings, DUNGEON].map((place) => [place.id, place]));
  const residents = world.players.map((player) => {
    const activity = activityState(player, world, now);
    const plan = activity?.plan;
    const ended = Boolean(activity?.after);
    let placeId = player.location;
    if (activity) {
      placeId =
        activity.kind === 'walking'
          ? null
          : activity.placeId ||
            (activity.kind === 'fighting'
              ? 'dungeon'
              : activity.kind === 'working'
                ? plan.destination
                : plan.home);
    }
    const place = places.get(placeId);
    const peers = world.players.filter((p) => p.location === player.location);
    const anchor = places.get(player.location) || world.buildings[0];
    const fallback = residentPoint(
      anchor,
      Math.max(
        0,
        peers.findIndex((p) => p.id === player.id),
      ),
      peers.length,
    );
    const position =
      activity && Number.isFinite(activity.x) && Number.isFinite(activity.y) ? activity : fallback;
    const label = ended
      ? '마지막 일정 · ' + (activity?.step?.label || player.currentAction)
      : activity?.label || player.currentAction;
    return {
      player,
      activity,
      placeId,
      x: position.x,
      y: position.y,
      phase: ended ? '결과 확인 대기' : phases[activity?.kind] || '기록된 활동',
      label,
      summary: summarizeActivity(label),
      location:
        place?.name ||
        (activity?.step?.to
          ? (places.get(activity.step.to)?.name || '목적지') + ' 방향'
          : '이동 중'),
      waiting: ended,
    };
  });
  return { world, residents, places };
}

export function filterResidents(residents, { query = '', placeId = 'all', phase = 'all' } = {}) {
  const search = query.trim().toLocaleLowerCase('ko-KR');
  return residents.filter(
    (r) =>
      (placeId === 'all' || r.placeId === placeId) &&
      (phase === 'all' || (!r.waiting && r.activity?.kind === phase)) &&
      (!search ||
        [r.player.name, r.player.role, r.label, r.location]
          .join(' ')
          .toLocaleLowerCase('ko-KR')
          .includes(search)),
  );
}

export function observationReducer(state, action) {
  switch (action.type) {
    case 'resident':
      return { ...state, residentId: action.id, placeId: 'all' };
    case 'place':
      return { ...state, residentId: null, placeId: action.id };
    case 'view':
      return { ...state, view: action.view };
    case 'reset':
      return { ...state, residentId: null, placeId: 'all' };
    default:
      return state;
  }
}

export function recentEvents(world, { residentId = null, placeId = 'all' } = {}) {
  return world.events
    .filter(
      (e) =>
        (!residentId || e.actorId === residentId || e.targetId === residentId) &&
        (placeId === 'all' || e.location === placeId),
    )
    .slice()
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
