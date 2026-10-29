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
 assert([...scene.terrain,...scene.props].every(t=>t.tile>=0&&t.tile<64&&t.x>=0&&t.y>=0&&t.x+t.size<=1536&&t.y+t.size<=1152));
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

test('verified measurements require correct savings and scope',()=>{if(!world.measurementState?.comparisonVerified)return;const w=structuredClone(world);w.measurementState.savedMinutes++;assert.throws(()=>validateWorld(w,roster),/Measurement saving/);});

test('unfinished extension cannot be used',()=>{if(!world.constructionState||world.constructionState.usable)return;const w=structuredClone(world);w.constructionState.usable=true;assert.throws(()=>validateWorld(w,roster),/Unfinished construction/);});

test('unfinished storage still preserves six-unit shelf capacity',()=>{if(!world.constructionState||world.constructionState.usable)return;assert.equal(world.storageState.capacity,6);assert.equal(world.constructionState.usable,false);});

test('approved extension capacity must equal original shelf plus tested extra capacity',()=>{if(!world.constructionState?.usable)return;assert.equal(world.constructionState.progress,100);assert.equal(world.storageState.capacity,6+world.constructionState.testedExtraCapacity);});

test('reading draft cannot reference unknown speakers or claim performance',()=>{if(!world.readingState)return;const w=structuredClone(world);w.readingState.lines[0].speakerId='unknown';assert.throws(()=>validateWorld(w,roster),/reading line/);});

test('performed reading requires duration and known audience',()=>{if(!world.readingState?.performed)return;const w=structuredClone(world);w.readingState.durationMinutes=0;assert.throws(()=>validateWorld(w,roster),/actual duration/);});

import {layoutWorld,residentPoint} from '../src/mapLayout.mjs';
test('town layout preserves world and leaves residents below buildings',()=>{const original=JSON.stringify(world);const view=layoutWorld(world);assert.equal(JSON.stringify(world),original);for(const a of view.buildings){for(const b of view.buildings){if(a.id!==b.id)assert(Math.hypot(a.x-b.x,a.y-b.y)>=20);}const p=residentPoint(a,0,4);assert(p.y>a.y+5);assert(p.x>0&&p.x<100);}assert.equal(view.players,world.players);});

import {battle,activityState,makePlans} from '../src/activity.mjs';
import {settle} from './settle-adventures.mjs';
import {layoutWorld as liveLayout} from '../src/mapLayout.mjs';
test('shared schedules are clock based and reconnect deterministic',()=>{const w=structuredClone(world),start=Date.parse('2026-10-29T00:00:00Z');w.activityPlans=makePlans(w,new Date(start).toISOString());const p=w.players[0],v=liveLayout(w);assert.deepEqual(activityState(p,v,start+70*60000),activityState(p,v,start+70*60000));assert.equal(activityState(p,v,start+70*60000).kind,'fighting');assert.equal(activityState(p,v,start+130*60000).after,true);assert.equal(w.activityPlans.length,w.players.length);});
test('adventure XP settles only after end and only once',()=>{const w=structuredClone(world),start=Date.parse('2026-10-29T00:00:00Z');w.activityPlans=makePlans(w,new Date(start).toISOString());w.adventureRewards=[];const before=w.players[0].combatXp||0;assert.equal(settle(w,start),0);assert.equal(settle(w,start+120*60000),w.players.length);assert.equal(w.players[0].combatXp,before+battle(w.activityPlans[0].combatSnapshot).xp);assert.equal(settle(w,start+240*60000),0);});

import {MONSTERS,defeated} from '../src/monsters.mjs';
test('first kills are species specific and resident specific',()=>{
 const w=structuredClone(world);w.adventureRewards=[];w.players=w.players.slice(0,2);w.players.forEach(p=>p.combatXp=0);
 const start=Date.parse('2026-10-29T00:00:00Z');
 w.activityPlans=makePlans(w,new Date(start).toISOString());settle(w,start+120*60000);
 assert(w.adventureRewards.every(r=>r.firstKill&&r.xp===15));
 assert(defeated(w,w.players[0].id,'echo-shadow'));assert(!defeated(w,w.players[0].id,'cave-slime'));
 w.cycle++;w.activityPlans=makePlans(w,new Date(start+120*60000).toISOString());
 assert(w.activityPlans.every(p=>p.monsterId==='echo-shadow'));w.activityPlans.forEach(p=>{p.monsterId='cave-slime';p.monsterSnapshot=structuredClone(MONSTERS.find(m=>m.id==='cave-slime'));});
 settle(w,start+240*60000);assert(w.players.every(p=>p.combatXp===30));
 w.cycle++;w.activityPlans=makePlans(w,new Date(start+240*60000).toISOString());settle(w,start+360*60000);
 assert(w.adventureRewards.slice(-2).every(r=>r.xp===0&&!r.firstKill));assert(w.players.every(p=>p.combatXp===30));
});
test('plans freeze monster balance and never select locked species',()=>{
 const plans=makePlans(world,'2026-10-29T00:00:00Z');
 for(const p of plans){assert(p.monsterSnapshot.available);assert.notEqual(p.monsterSnapshot,MONSTERS.find(m=>m.id===p.monsterId));assert.equal(p.monsterSnapshot.id,p.monsterId);}
 const m={...MONSTERS[0],hp:9999,attack:9999,pattern:['attack']};assert.equal(battle({contributions:0},m).xp,0);
});

import {pinchFrame} from '../src/useMapPinch.mjs';
test('pinch keeps the touched world point anchored and clamps zoom',()=>{
 const start={scale:1,distance:100,x:400,y:300};
 const enlarged=pinchFrame(start,200,{x:100,y:80});
 assert.equal(enlarged.scale,2);assert.equal((enlarged.left+100)/enlarged.scale,400);assert.equal((enlarged.top+80)/enlarged.scale,300);
 assert.equal(pinchFrame(start,10000,{x:100,y:80}).scale,2.5);assert.equal(pinchFrame(start,1,{x:100,y:80}).scale,.3);
});

import {floorFor,floorTile,dungeonPoint} from '../src/dungeon.mjs';
test('dungeon floors have distinct layouts and resident positions stay inside',()=>{assert.equal(floorFor({monsterId:'echo-shadow'}),1);assert.equal(floorFor({monsterId:'cave-slime'}),2);assert.equal(floorTile(2,8,8),'water');assert.equal(floorTile(2,7,8),'stone');assert.equal(floorTile(3,12,9),'crystal');for(const p of world.players){const a=dungeonPoint(p.id);assert(a.x>0&&a.x<23&&a.y>0&&a.y<17);}assert.equal(floorTile(1,0,0),'wall');});

import {creditVictory,orderService,balance} from '../src/economy.mjs';
test('gold ledger prevents duplicate rewards, overspending and duplicate orders',()=>{const w={players:[{id:'a'}]};assert.equal(creditVictory(w,{id:'win-1',playerId:'a',amount:3,at:'2026-10-29T00:00:00Z'}),true);assert.equal(creditVictory(w,{id:'win-1',playerId:'a',amount:3}),false);assert.equal(balance(w,'a'),3);assert.throws(()=>orderService(w,{id:'order-1',playerId:'a',serviceId:'tool-check'}),/Insufficient/);assert.equal(orderService(w,{id:'order-1',playerId:'a',serviceId:'cafe-rest'}),true);assert.equal(orderService(w,{id:'order-1',playerId:'a',serviceId:'cafe-rest'}),false);assert.equal(balance(w,'a'),0);assert.equal(balance(w,'town-treasury'),3);assert.equal(w.economy.orders[0].status,'pending');assert.equal(w.economy.ledger.filter(t=>t.kind==='victory').reduce((n,t)=>n+t.amount,0),balance(w,'a')+balance(w,'town-treasury'));});

test('completed new adventures persist exact turns and gold, never before end',()=>{const w=structuredClone(world);w.adventureRewards=[];w.economy={ledger:[],orders:[]};w.players.forEach(p=>p.combatXp=0);const start=Date.parse('2026-10-29T00:00:00Z');w.activityPlans=makePlans(w,new Date(start).toISOString());assert.equal(settle(w,start),0);assert.equal(w.economy.ledger.length,0);settle(w,start+120*60000);for(const r of w.battleLogs){assert(r.turns.length>0);const plan=w.activityPlans.find(p=>p.encounterId===r.id);assert.deepEqual(r.turns,battle(plan.combatSnapshot,plan.monsterSnapshot).turns);}const gold=w.economy.ledger.length;settle(w,start+240*60000);assert.equal(w.economy.ledger.length,gold);});

import {caveTile,walkable,roamPoint,CAVE_WIDTH,CAVE_HEIGHT} from '../src/dungeonMap.mjs';
test('large dungeon uses valid atlas IDs and habitat wanderers never enter blocked cells',()=>{assert.equal(CAVE_WIDTH,1536);assert.equal(CAVE_HEIGHT,1152);for(let f=1;f<=3;f++)for(let y=0;y<36;y++)for(let x=0;x<48;x++){assert(caveTile(f,x,y)>=0&&caveTile(f,x,y)<8);}for(let f=1;f<=2;f++)for(let i=0;i<10;i++)for(let t=0;t<320;t++){const p=roamPoint(f,i,t*3000);assert(walkable(f,p.x,p.y));assert.deepEqual(p,roamPoint(f,i,t*3000));}assert.equal(caveTile(2,9,15),4);assert.equal(caveTile(2,20,15),3);});

import {combatStats} from '../src/progression.mjs';
import {recordBattle,retainBattleLogs,replayFrame} from '../src/combatHistory.mjs';
test('XP reset ignores old events and lifetime totals but credits new progress',()=>{const p={id:'r',progressionVersion:2,contributions:21,combatXp:15,xpReset:{cycle:21,contributions:21,combatXp:15}};assert.equal(progression(p,[{actorId:'r',type:'action',cycle:21}]).xp,0);assert.equal(progression(p,[]).level,1);assert.deepEqual(combatStats(p),{level:1,maxHp:30,attack:8,defense:2});p.contributions=22;p.combatXp=30;assert.equal(progression(p,[]).xp,25);p.contributions=31;assert.equal(progression(p,[]).level,2);assert.equal(combatStats(p).maxHp,36);});
test('all current residents were reset to zero effective XP',()=>{if(!world.xpResetAt)return;for(const p of world.players){if(!p.xpReset)continue;const baseline={...p,contributions:p.xpReset.contributions,combatXp:p.xpReset.combatXp};const events=world.events.filter(e=>e.cycle<=p.xpReset.cycle);assert.equal(progression(baseline,events).xp,0);assert.equal(progression(baseline,events).level,1);}});
test('battle retention caps each resident independently and replay uses stored numbers',()=>{const logs=Array.from({length:240},(_,i)=>({id:String(i),playerId:i%2?'a':'b'}));const kept=retainBattleLogs(logs);assert.equal(kept.length,200);assert.equal(kept[0].id,'40');assert.equal(kept.filter(r=>r.playerId==='a').length,100);const log={id:'one',playerId:'a',playerStats:{maxHp:30},monsterSnapshot:{hp:22},turns:[{turn:1,hp:29,enemyHp:14,damage:8,received:1}]};const w={};recordBattle(w,log);recordBattle(w,log);assert.equal(w.battleLogs.length,1);const before=JSON.stringify(w);assert.equal(replayFrame(log,0).hp,30);assert.equal(replayFrame(log,1).hp,29);assert.equal(JSON.stringify(w),before);});

import {bossProgress,floorUnlocked,spawnState,resolveSpawn,RESPAWN_MS} from '../src/dungeonRules.mjs';
test('boss requirements need actual new-rule wins and distinct participants; next floor needs boss victory',()=>{const w={adventureRewards:[]};assert(!floorUnlocked(w,2));for(let i=0;i<6;i++)w.adventureRewards.push({id:String(i),monsterId:'echo-shadow',outcome:'victory',playerId:'p00'+(i%3+1),dungeonRulesVersion:1});assert(bossProgress(w,1).ready);assert(!floorUnlocked(w,2));w.adventureRewards.push({id:'boss',monsterId:'lantern-warden',outcome:'victory',playerId:'p001'});assert(floorUnlocked(w,2));assert(!bossProgress(w,1).ready);assert(!floorUnlocked(w,3));});
test('spawn reappears only after actual victory cooldown',()=>{const w={};const now=Date.parse('2026-10-29T00:00:00Z'),plan={dungeonRulesVersion:1,spawnId:'f1-spawn0',playerId:'p001',encounterId:'e'};resolveSpawn(w,plan,{outcome:'retreat'},new Date(now).toISOString());assert(spawnState(w,1,0,now).alive);resolveSpawn(w,plan,{outcome:'victory'},new Date(now).toISOString());assert(!spawnState(w,1,0,now+RESPAWN_MS-1).alive);assert(spawnState(w,1,0,now+RESPAWN_MS).alive);});

test('new plans assign one boss only and never reuse spawn slots',()=>{const w=structuredClone(world);w.adventureRewards=Array.from({length:6},(_,i)=>({id:'ready'+i,monsterId:'echo-shadow',outcome:'victory',playerId:w.players[i%3].id,dungeonRulesVersion:1}));w.players.forEach(p=>{p.progressionVersion=2;p.xpReset={cycle:21,contributions:p.contributions,combatXp:0};p.combatXp=100;});const plans=makePlans(w,'2026-10-29T20:00:00Z');assert.equal(plans.filter(p=>p.monsterId==='lantern-warden').length,1);const ordinary=plans.filter(p=>p.spawnId);assert.equal(new Set(ordinary.map(p=>p.spawnId)).size,ordinary.length);assert(ordinary.every(p=>p.floor===1));});
