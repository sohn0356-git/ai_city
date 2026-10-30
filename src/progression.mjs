import {passiveBonus,equippedSkills} from './essenceSkills.mjs';
// v3: only first-species combat XP; city contributions are historical activity counts.
export function progression(player, events){
 const cycles=new Set(events.filter(e=>e.actorId===player.id&&e.type==='action'&&(!player.xpReset||e.cycle>player.xpReset.cycle)).map(e=>e.cycle));
 // Snapshot-scoped events prevent future-cycle XP leaking into comparison scenes.
 const credited=Math.max(cycles.size,Math.max(0,(Number.isInteger(player.contributions)?player.contributions:0)-(player.xpReset?.contributions||0)));
 const xp=(player.progressionVersion===3?0:credited*10)+Math.max(0,(player.combatXp||0)-(player.xpReset?.combatXp||0));
 const v2=player.progressionVersion>=2;
 let level=1,threshold=player.progressionVersion===3?1:v2?100:30,remaining=xp;
 while(remaining>=threshold&&(!v2||level<50)){remaining-=threshold;level++;threshold=player.progressionVersion===3?level:v2?100+(level-1)*50:30+(level-1)*10;}
 return {level,xp,inLevel:v2&&level===50?threshold:remaining,required:threshold,toNext:v2&&level===50?0:threshold-remaining,activeCycles:credited};
}

export function combatStats(player){const level=progression(player,[]).level;const base=player.progressionVersion>=2?{level,maxHp:30+(level-1)*6,attack:8+(level-1)*2,defense:2+Math.floor((level-1)/2)}:{level,maxHp:24+level*4,attack:6+level*2,defense:1+Math.floor(level/2)};const bonus=passiveBonus(equippedSkills(player));return {...base,maxHp:base.maxHp+bonus.maxHp,attack:base.attack+bonus.attack,defense:base.defense+bonus.defense};}
