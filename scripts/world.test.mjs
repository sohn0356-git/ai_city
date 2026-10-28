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

test('resource ledger must reconcile with actual inventory',()=>{if(!world.resourceLedger)return;const w=structuredClone(world);w.resourceLedger.food.consumed+=1;assert.throws(()=>validateWorld(w,roster),/Ledger arithmetic/);});

test('storage cannot exceed capacity or disagree with inventory',()=>{if(!world.storageState)return;const w=structuredClone(world);w.storageState.shelf=w.storageState.capacity+1;assert.throws(()=>validateWorld(w,roster),/storage allocation/);const other=structuredClone(world);other.storageState.day+=1;other.storageState.dayCapacity=other.storageState.day;assert.throws(()=>validateWorld(other,roster),/Storage total/);});

test('day stock cannot exceed its separate daily capacity',()=>{if(!world.storageState?.dayCapacity)return;const w=structuredClone(world);w.storageState.day=w.storageState.dayCapacity+1;assert.throws(()=>validateWorld(w,roster),/storage allocation/);});

test('food transfers reconcile by source and destination',()=>{if(!world.foodFlow)return;const w=structuredClone(world);w.foodFlow.dayConsumed+=1;assert.throws(()=>validateWorld(w,roster),/Food flow consumption/);const other=structuredClone(world);other.foodFlow.harvestToDay+=1;other.foodFlow.harvestToShelf-=1;assert.throws(()=>validateWorld(other,roster),/Food flow day balance/);});
