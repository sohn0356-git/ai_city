import {progression} from './progression.mjs';
export const DUNGEON={id:'dungeon',name:'메아리 동굴',x:49,y:88};
export function battle(player){
 const level=progression(player,[]).level;
 let hp=24+level*4,enemyHp=18+level*2;const turns=[];
 for(let turn=1;turn<=8&&hp>0&&enemyHp>0;turn++){const damage=4+level;enemyHp=Math.max(0,enemyHp-damage);if(enemyHp>0)hp=Math.max(0,hp-3);turns.push({turn,hp,enemyHp,damage});}
 return {enemy:'동굴 그림자',turns,outcome:enemyHp===0?'victory':'retreat',xp:enemyHp===0?15:5,hp,maxHp:24+level*4};
}
export function route(a,b,t){const points=[a,{x:a.x,y:50},{x:b.x,y:50},b];const distances=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));let remaining=Math.min(1,Math.max(0,t))*distances.reduce((a,b)=>a+b,0);for(let i=0;i<3;i++){if(remaining<=distances[i]||i===2){const f=distances[i]?remaining/distances[i]:1;return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}remaining-=distances[i];}return b;}
export function activityState(player,world,now){
 const plan=world.activityPlans?.find(p=>p.playerId===player.id);if(!plan)return null;
 const home=world.buildings.find(b=>b.id===plan.home)||world.buildings[0],work=world.buildings.find(b=>b.id===plan.destination)||home;
 const elapsed=Math.max(0,(now-Date.parse(plan.startsAt))/60000),after=elapsed>=120;
 // Continued patrol/rest after the plan end never grants another combat reward.
 let minute=after?(elapsed-120)%30:elapsed;
 let point,kind,label,progress=0;
 if(after){kind='walking';label='다음 지시 대기 · 동네 순찰';point=route(home,work,minute<15?minute/15:1-(minute-15)/15);}
 else if(minute<20){kind='walking';label=plan.task+' · 이동';progress=minute/20;point=route(home,work,progress);}
 else if(minute<45){kind='working';label=plan.task;progress=(minute-20)/25;point={x:work.x+((Number(player.id.slice(1))%4)-1.5)*4,y:work.y+10};}
 else if(minute<65){kind='walking';label='메아리 동굴로 이동';progress=(minute-45)/20;point=route(work,DUNGEON,progress);}
 else if(minute<90){kind='fighting';label='동굴 그림자 대련 · 보상 정산 대기';progress=(minute-65)/25;point={x:DUNGEON.x+((Number(player.id.slice(1))%5)-2)*4,y:82+Math.floor(Number(player.id.slice(1))/5)*2};}
 else if(minute<110){kind='walking';label='탐험 후 귀환';progress=(minute-90)/20;point=route(DUNGEON,home,progress);}
 else {kind='resting';label='회복 · 장비 정리';progress=(minute-110)/10;point={x:home.x,y:home.y+10};}
 const result=battle(plan.combatSnapshot||player);const turn=kind==='fighting'?result.turns[Math.min(result.turns.length-1,Math.floor(progress*result.turns.length))]:null;
 return {...point,id:kind,kind,label,progress,turn,plan,after,result};
}
export function makePlans(world,startsAt){
 const endsAt=new Date(Date.parse(startsAt)+120*60000).toISOString();
 const destinations={p001:'market',p002:'library',p003:'farm',p004:'market',p005:'studio',p006:'market',p007:'farm',p008:'library',p009:'cafe',p010:'hall',p011:'market',p012:'market',p013:'lab',p014:'garden',p015:'market',p016:'library',p017:'garden',p018:'library',p019:'garden',p020:'cafe',p021:'hall'};
 return world.players.map(p=>({id:`plan-${world.cycle}-${p.id}`,playerId:p.id,startsAt,endsAt,home:p.location,destination:destinations[p.id]||p.location,task:p.currentAction.replace(/[。.]$/,''),encounterId:`echo-${world.cycle}-${p.id}`,combatSnapshot:{contributions:p.contributions,combatXp:p.combatXp||0},status:'planned'}));
}
