import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createLife, advanceLife, validateLife } from '../src/simulation/engine.mjs';
import { migrateSurvival } from '../src/simulation/survival.mjs';
import { archiveDay, compactReplay } from '../src/simulation/replay.mjs';

const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));
async function atomicJSON(path, value) {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(value) + '\n');
  await rename(temp, path);
}
export async function tickLife({
  now = Date.now(),
  root = 'public',
  maxAdvanceMs = 6 * 3600000,
} = {}) {
  const world = await readJSON(root + '/world.json');
  let roster = [];
  try {
    roster = await readJSON(root + '/roster.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let state;
  try {
    state = await readJSON(root + '/life.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = createLife(world, { at: now, roster });
  }
  // Explicit migration: old world/roster/plans and all existing reward evidence stay untouched.
  const before = Date.parse(state.updatedAt);
  if (now < before) throw Error('Worker clock moved backwards');
  const target = Math.min(now, before + maxAdvanceMs);
  const result = advanceLife(state, target);
  if (!state.survival && result.reached)
    migrateSurvival(state, { at: Date.parse(state.updatedAt), roster });
  validateLife(state);
  const days = new Set(
    state.logs.filter((r) => Date.parse(r.endsAt) > before).map((r) => r.endsAt.slice(0, 10)),
  );
  days.add(state.updatedAt.slice(0, 10));
  await mkdir(root + '/life/history', { recursive: true });
  let index;
  try {
    index = await readJSON(root + '/life/index.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    index = { schemaVersion: 1, days: [] };
  }
  for (const day of [...days].sort()) {
    const path = root + '/life/history/' + day + '.json.gz';
    const fresh = archiveDay(state, day);
    if (!fresh) continue;
    let saved;
    try {
      saved = JSON.parse(gunzipSync(await readFile(path)).toString('utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Each day's first checkpoint is immutable; append only newly completed records.
    if (saved) {
      fresh.replayStartsAt = saved.replayStartsAt;
      fresh.replayActors = saved.replayActors;
      fresh.replayResources = saved.replayResources;
      fresh.logs = [...new Map([...saved.logs, ...fresh.logs].map((r) => [r.id, r])).values()].sort(
        (a, b) =>
          Date.parse(a.endsAt) - Date.parse(b.endsAt) ||
          (a.order || 0) - (b.order || 0) ||
          a.id.localeCompare(b.id),
      );
    }
    await writeFile(path + '.tmp', gzipSync(JSON.stringify(fresh), { level: 9 }));
    await rename(path + '.tmp', path);
    const entry = {
      day,
      path: 'life/history/' + day + '.json.gz',
      encoding: 'gzip',
      startsAt: fresh.replayStartsAt,
      endsAt: fresh.updatedAt,
      actions: fresh.logs.length,
    };
    index.days = [...index.days.filter((d) => d.day !== day), entry].sort((a, b) =>
      b.day.localeCompare(a.day),
    );
  }
  compactReplay(state, { maxLogs: 1200 });
  await atomicJSON(root + '/life/index.json', index);
  await atomicJSON(root + '/life.json', state);
  return {
    ...result,
    completed: state.completed,
    actors: state.actors.length,
    backlog: Date.parse(state.updatedAt) < now,
    startedAt: state.startedAt,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await tickLife()));
}
