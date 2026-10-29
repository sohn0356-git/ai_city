// One award per resident per recorded action cycle. Repeated dialogue cannot farm XP.
export function progression(player, events){
 const cycles=new Set(events.filter(e=>e.actorId===player.id&&e.type==='action').map(e=>e.cycle));
 // Snapshot-scoped events prevent future-cycle XP leaking into comparison scenes.
 const credited=Math.max(cycles.size,Number.isInteger(player.contributions)?player.contributions:0);
 const xp=credited*10+(player.combatXp||0);
 let level=1,threshold=30,remaining=xp;
 while(remaining>=threshold){remaining-=threshold;level++;threshold=30+(level-1)*10;}
 return {level,xp,inLevel:remaining,required:threshold,toNext:threshold-remaining,activeCycles:credited};
}
