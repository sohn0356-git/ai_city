export function encounterStatus(world,playerId){
 const settled=new Set((world.adventureRewards||[]).map(r=>r.id));
 const plans=[...(world.activityPlans||[]),...(world.queuedActivityPlans||[])].filter(p=>!playerId||p.playerId===playerId);
 return {settled:plans.filter(p=>settled.has(p.encounterId)).length,pending:plans.filter(p=>!settled.has(p.encounterId)).length};
}
