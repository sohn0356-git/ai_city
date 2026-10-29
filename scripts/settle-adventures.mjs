import {creditVictory} from '../src/economy.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {defeated} from '../src/monsters.mjs';
import {battle} from '../src/activity.mjs';
export function settle(world,now){
 world.adventureRewards??=[];const ids=new Set(world.adventureRewards.map(r=>r.id));let count=0;
 for(const plan of world.activityPlans||[]){if(Date.parse(plan.endsAt)>now||ids.has(plan.encounterId))continue;const p=world.players.find(p=>p.id===plan.playerId);if(!p)continue;const result=battle(plan.combatSnapshot||p,plan.monsterSnapshot||plan.monsterId||'echo-shadow');const firstKill=result.outcome==='victory'&&!defeated(world,p.id,result.monsterId);result.xp=firstKill?result.xp:0;world.adventureRewards.push({id:plan.encounterId,playerId:p.id,xp:result.xp,monsterId:result.monsterId,firstKill,outcome:result.outcome,turns:result.turns,monsterSnapshot:result.monster,at:new Date(now).toISOString()});if(plan.economyVersion===1&&result.outcome==='victory')creditVictory(world,{id:'gold-'+plan.encounterId,playerId:p.id,amount:plan.goldReward,at:new Date(now).toISOString()});p.combatXp=(p.combatXp||0)+result.xp;p.memory=[...p.memory,`${result.enemy} ${result.outcome==='victory'?'대련 승리':'안전 귀환'} · ${result.xp}XP 정산`].slice(-30);p.longTermMemory.push(`탐험 ${plan.encounterId}: ${result.xp}XP 정산 완료`);plan.status='settled';ids.add(plan.encounterId);count++;}
 return count;
}
if(process.argv[1]?.endsWith('/settle-adventures.mjs')){const path='public/world.json',world=JSON.parse(await readFile(path));const n=settle(world,Date.now());await writeFile(path,JSON.stringify(world,null,2)+'\n');console.log(`Settled ${n} encounters`);}
