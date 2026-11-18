export const iso = (value) => new Date(value).toISOString();
export function knownActors(state) {
  return [...state.actors, ...Object.values(state.departed || {})];
}
export function appendLog(state, record) {
  record.order = state.logSequence = (state.logSequence || 0) + 1;
  record.actorName ??= knownActors(state).find((a) => a.id === record.actorId)?.player.name;
  state.logs.push(record);
  return record;
}
export function snapshotActor(actor) {
  return {
    id: actor.id,
    placeId: actor.placeId,
    energy: actor.energy,
    hunger: actor.hunger,
    hp: actor.hp,
    combatXp: actor.player.combatXp || 0,
    skillRulesVersion: actor.player.skillRulesVersion,
    skills: structuredClone(actor.player.skills || []),
    relationships: structuredClone(actor.player.relationships || []),
    memory: (actor.player.memory || []).slice(-5),
    workCount: actor.workCount,
    alive: actor.alive !== false,
    joinedAt: actor.joinedAt,
    ageReferenceAt: actor.ageReferenceAt,
    initialAge: actor.initialAge,
    lastVitalAt: actor.lastVitalAt,
    starvingSince: actor.starvingSince,
    illness: structuredClone(actor.illness || null),
    food: structuredClone(actor.food || []),
    healthDamage: actor.healthDamage || 0,
  };
}
