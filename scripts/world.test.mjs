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

import {createTileScene, buildingTile} from '../src/tileScene.mjs';
test('tile scene reads inventory and never changes the shared world',()=>{
 const original=JSON.stringify(world);const scene=createTileScene(world);
 assert.equal(scene.props.filter(p=>p.kind==='shelf-stock').length,world.storageState.shelf);
 assert.equal(scene.props.filter(p=>p.kind==='day-stock').length,world.storageState.day);
 assert.equal(JSON.stringify(world),original);
 assert(world.buildings.every(b=>Number.isInteger(buildingTile[b.id])));
 assert([...scene.terrain,...scene.props].every(t=>t.tile>=0&&t.tile<64&&t.x>=0&&t.y>=0&&t.x+t.size<=1024&&t.y+t.size<=768));
});
test('tile scene keeps unfinished shelves empty and partial crop recovery visible',()=>{
 const w=structuredClone(world);w.projects.find(p=>p.id==='storage-rack').progress=40;
 let scene=createTileScene(w);assert.equal(scene.props.find(p=>p.kind==='rack').tile,34);
 assert.equal(scene.props.filter(p=>p.kind==='shelf-stock').length,0);
 w.fieldState={recovered:true};scene=createTileScene(w);
 assert(scene.props.some(p=>p.kind==='crop'&&p.tile===26));
 assert(scene.props.some(p=>p.kind==='crop'&&p.tile===27));
});
test('tile comparison uses supplied snapshot quantities instead of latest values',()=>{
 const w=structuredClone(world);w.storageState={shelf:2,day:1};w.metrics.food=3;
 const scene=createTileScene(w);
 assert.equal(scene.props.filter(p=>p.kind==='shelf-stock').length,2);
 assert.equal(scene.props.filter(p=>p.kind==='day-stock').length,1);
 w.cycle=8;assert.equal(createTileScene(w).props.some(p=>p.kind==='relay'),false);
 w.cycle=9;assert.equal(createTileScene(w).props.some(p=>p.kind==='relay'),true);
});

import {progression} from '../src/progression.mjs';
test('resident XP awards once per action cycle and ignores dialogue',()=>{
 const p={id:'a'};const action=cycle=>({actorId:'a',type:'action',cycle});
 assert.deepEqual(progression(p,[]),{level:1,xp:0,inLevel:0,required:30,toNext:30,activeCycles:0});
 assert.equal(progression(p,[action(1),action(1),{actorId:'a',type:'dialogue',cycle:2},{actorId:'b',type:'action',cycle:2}]).xp,10);
 const g=progression(p,[action(1),action(2),action(3)]);assert.equal(g.level,2);assert.equal(g.inLevel,0);assert.equal(g.required,40);
 assert.equal(progression(p,Array.from({length:12},(_,i)=>action(i+1))).level,4);
});

test('XP survives event log retention',()=>{assert.equal(progression({id:'a',contributions:13},[]).xp,130);});

test('measurement baseline must reconcile without claiming improvement',()=>{if(!world.measurementState)return;const w=structuredClone(world);w.measurementState.totalMinutes++;assert.throws(()=>validateWorld(w,roster),/Measurement total/);});
