import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorld, loadWorld } from './validate-world.mjs';
const [world,roster]=await loadWorld();
test('published world is consistent and every active resident acted',()=>assert.equal(validateWorld(world,roster),true));
test('a resident cannot silently miss a cycle',()=>{const w=structuredClone(world);w.events=w.events.filter(e=>!(e.actorId===w.players[0].id&&e.type==='action'&&e.cycle===w.cycle));assert.throws(()=>validateWorld(w,roster),/individual action/);});
test('relationships cannot reference unknown residents',()=>{const w=structuredClone(world);w.players[0].relationships[0].playerId='not-a-resident';assert.throws(()=>validateWorld(w,roster),/relationship/);});
test('future actions cannot masquerade as completed activity',()=>{const w=structuredClone(world);w.events[0].at='2100-01-01T00:00:00Z';assert.throws(()=>validateWorld(w,roster),/Future activity/);});
test('population growth stops at 100',()=>{const w=structuredClone(world);w.players=Array(101).fill(w.players[0]);assert.throws(()=>validateWorld(w,roster),/Active population/);});
test('duplicate identities cannot inflate population',()=>{const w=structuredClone(world);w.players[1].id=w.players[0].id;assert.throws(()=>validateWorld(w,roster),/Active IDs/);});

test('story positions must reference real residents and choices',()=>{if(!world.episode)return;const w=structuredClone(world);w.episode.positions[0].optionId='unknown-choice';assert.throws(()=>validateWorld(w,roster),/episode option/);});
test('a completed episode must record the actual decision',()=>{if(!world.episode)return;const w=structuredClone(world);w.episode.phase='resolved';w.episode.result=null;assert.throws(()=>validateWorld(w,roster),/chosen option/);});
