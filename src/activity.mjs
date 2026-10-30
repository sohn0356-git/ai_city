import {stepState} from './planSteps.mjs';
import {BOSS_RULES,bossProgress,floorUnlocked,spawnState,floorMonster,SLOTS} from './dungeonRules.mjs';
import {MONSTERS,monsterById,defeated,damage} from './monsters.mjs';
import {progression,combatStats} from './progression.mjs';
export const DUNGEON={id:'dungeon',name:'메아리 동굴',x:49,y:88};
export function battle(player,monster='echo-shadow'){
 const m=typeof monster==='string'?monsterById(monster):monster,stats=combatStats(player);
 let hp=stats.maxHp,enemyHp=m.hp;const turns=[],{attack,defense}=stats;
 for(let turn=1;turn<=24&&hp>0&&enemyHp>0;turn++){
  const phase=m.pattern[(turn-1)%m.pattern.length],guard=phase==='skill';
  const hit=guard?0:damage(attack,m.defense);enemyHp=Math.max(0,enemyHp-hit);
  const received=enemyHp>0&&['attack','skill'].includes(phase)?Math.max(1,Math.floor(damage(m.attack,defense,phase==='skill'?m.multiplier:1)*(guard?.5:1))):0;
  hp=Math.max(0,hp-received);turns.push({turn,hp,enemyHp,damage:hit,received,phase,skill:m.skill,guard});
  if(hp<=stats.maxHp*.3&&enemyHp>0)break;
 }
 return {enemy:m.name,monsterId:m.id,monster:m,turns,outcome:enemyHp===0?'victory':'retreat',xp:enemyHp===0?m.level:0,hp,maxHp:stats.maxHp,playerStats:stats};
}
export function route(a,b,t){const points=[a,{x:a.x,y:50},{x:b.x,y:50},b];const distances=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));let remaining=Math.min(1,Math.max(0,t))*distances.reduce((a,b)=>a+b,0);for(let i=0;i<3;i++){if(remaining<=distances[i]||i===2){const f=distances[i]?remaining/distances[i]:1;return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}remaining-=distances[i];}return b;}
export function activityState(player,world,now){
 const queued=world.queuedActivityPlans?.find(p=>p.playerId===player.id);
 const plan=queued&&now>=Date.parse(queued.startsAt)?queued:world.activityPlans?.find(p=>p.playerId===player.id);if(!plan)return null;
 if(plan.steps&&now>=Date.parse(plan.startsAt)&&now<Date.parse(plan.endsAt)){const state=stepState(plan,now);if(!state)return null;const result=state.kind==='fighting'?battle(plan.combatSnapshot||player,plan.monsterSnapshot):null;if(result){result.firstKillEligible=!defeated(world,player.id,result.monsterId);result.awardXp=result.firstKillEligible?result.xp:0;}return {...state,plan,result,turn:result?result.turns[Math.min(result.turns.length-1,Math.floor(state.progress*result.turns.length))]:null};}
 const home=world.buildings.find(b=>b.id===plan.home)||world.buildings[0],work=world.buildings.find(b=>b.id===plan.destination)||home;
 const elapsed=Math.max(0,(now-Date.parse(plan.startsAt))/60000),after=elapsed>=120;
 // Continued patrol/rest after the plan end never grants another combat reward.
 let minute=after?(elapsed-120)%30:elapsed;
 let point,kind,label,progress=0;
 if(after){kind='walking';label='다음 지시 대기 · 동네 순찰';point=route(home,work,minute<15?minute/15:1-(minute-15)/15);}
 else if(minute<20){kind='walking';label=plan.task+' · 이동';progress=minute/20;point=route(home,work,progress);}
 else if(minute<45){kind='working';label=plan.task;progress=(minute-20)/25;point={x:work.x+((Number(player.id.slice(1))%4)-1.5)*4,y:work.y+10};}
 else if(minute<65){kind='walking';label='메아리 동굴로 이동';progress=(minute-45)/20;point=route(work,DUNGEON,progress);}
 else if(minute<90){kind='fighting';label='몬스터 대련 · 최초 처치 보상 정산 대기';progress=(minute-65)/25;point={x:DUNGEON.x+((Number(player.id.slice(1))%5)-2)*4,y:82+Math.floor(Number(player.id.slice(1))/5)*2};}
 else if(minute<110){kind='walking';label='탐험 후 귀환';progress=(minute-90)/20;point=route(DUNGEON,home,progress);}
 else {kind='resting';label='회복 · 장비 정리';progress=(minute-110)/10;point={x:home.x,y:home.y+10};}
 const result=battle(plan.combatSnapshot||player,plan.monsterSnapshot||plan.monsterId||'echo-shadow');const turn=kind==='fighting'?result.turns[Math.min(result.turns.length-1,Math.floor(progress*result.turns.length))]:null;
 result.firstKillEligible=!defeated(world,player.id,result.monsterId);result.awardXp=result.firstKillEligible?result.xp:0;
 return {...point,id:kind,kind,label,progress,turn,plan,after,result};
}
export function makePlans(world,startsAt){
 const endsAt=new Date(Date.parse(startsAt)+120*60000).toISOString();
 const destinations={p001:'market',p002:'library',p003:'farm',p004:'market',p005:'studio',p006:'market',p007:'farm',p008:'library',p009:'cafe',p010:'hall',p011:'market',p012:'market',p013:'lab',p014:'garden',p015:'market',p016:'library',p017:'garden',p018:'library',p019:'garden',p020:'cafe',p021:'hall'};
 const used=new Set();
 return world.players.map(p=>{const level=progression(p,[]).level;
 const boss=BOSS_RULES.find(r=>floorUnlocked(world,r.floor)&&bossProgress(world,r.floor).ready&&level>=r.minLevel&&!used.has(r.id)&&battle(p,MONSTERS.find(m=>m.id===r.id)).outcome==='victory');
 const floors=[1,2,3].filter(f=>floorUnlocked(world,f));let floor=floors.find(f=>!defeated(world,p.id,floorMonster(f).id))||floors[floors.length-1];
 let monster,spawnId;
 if(boss){monster=MONSTERS.find(m=>m.id===boss.id);floor=boss.floor;used.add(boss.id);}
 else{let slot=Array.from({length:SLOTS},(_,i)=>i).find(i=>spawnState(world,floor,i,Date.parse(startsAt)).alive&&!used.has(`f${floor}-spawn${i}`));if(slot===undefined)throw Error('No available dungeon spawn; wait for respawn');spawnId=`f${floor}-spawn${slot}`;used.add(spawnId);monster=floorMonster(floor);}
 return {id:`plan-${world.cycle}-${p.id}`,playerId:p.id,startsAt,endsAt,home:p.location,destination:destinations[p.id]||p.location,task:p.currentAction.replace(/[。.]$/,''),encounterId:`echo-${world.cycle}-${p.id}`,monsterId:monster.id,monsterSnapshot:structuredClone(monster),combatSnapshot:{contributions:p.contributions,combatXp:p.combatXp||0,progressionVersion:p.progressionVersion,xpReset:p.xpReset?structuredClone(p.xpReset):undefined},dungeonRulesVersion:1,floor,spawnId,economyVersion:1,goldReward:boss?10:3,status:'planned'};});
}
