export const BATTLE_HISTORY_LIMIT=100;
export function retainBattleLogs(logs){const counts=new Map(),kept=[];for(let i=logs.length-1;i>=0;i--){const r=logs[i],n=counts.get(r.playerId)||0;if(n<BATTLE_HISTORY_LIMIT){kept.push(r);counts.set(r.playerId,n+1);}}return kept.reverse();}
export function recordBattle(world,record){world.battleLogs??=[];if(!world.battleLogs.some(r=>r.id===record.id))world.battleLogs.push(record);world.battleLogs=retainBattleLogs(world.battleLogs);}
export function replayFrame(log,index){const initial=log.playerStats||{maxHp:log.turns[0]?.hp+(log.turns[0]?.received||0)};return index===0?{hp:initial.maxHp,enemyHp:log.monsterSnapshot.hp,turn:0,damage:0,received:0}:log.turns[Math.min(index,log.turns.length)-1];}
