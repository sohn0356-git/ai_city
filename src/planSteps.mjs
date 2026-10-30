export function validateSteps(plan,world){
 if(!Array.isArray(plan.steps)||!plan.steps.length)throw Error('Missing steps');
 const places=new Set([...world.buildings.map(b=>b.id),'dungeon']);let cursor=Date.parse(plan.startsAt);
 for(const s of plan.steps){if(!['walking','working','resting','fighting'].includes(s.kind)||Date.parse(s.startsAt)!==cursor||!(Date.parse(s.endsAt)>cursor)||!s.label?.trim()||!places.has(s.placeId))throw Error('Invalid step or gap');if(s.kind!=='walking'&&(!Number.isFinite(s.point?.x)||!Number.isFinite(s.point?.y)))throw Error('Missing stationary position');if(s.kind==='walking'&&s.path?.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Invalid route coordinates');if(s.kind==='walking'&&(!places.has(s.from)||!places.has(s.to)||!Array.isArray(s.path)||s.path.length<2))throw Error('Invalid route');if(s.partnerIds?.some(id=>!world.players.some(p=>p.id===id)))throw Error('Unknown partner');cursor=Date.parse(s.endsAt);}
 if(cursor!==Date.parse(plan.endsAt)||cursor-Date.parse(plan.startsAt)!==7200000)throw Error('Steps must span 120 minutes');
 if(plan.steps.filter(s=>s.kind==='fighting').length>1)throw Error('Only one encounter per plan');
 if(plan.steps.some(s=>s.kind==='fighting')&&!plan.monsterSnapshot)throw Error('Missing combat snapshot');return true;
}
export function stepState(plan,now){const step=plan.steps.find(s=>now>=Date.parse(s.startsAt)&&now<Date.parse(s.endsAt));if(!step)return null;const progress=(now-Date.parse(step.startsAt))/(Date.parse(step.endsAt)-Date.parse(step.startsAt));let point=step.point;
 if(step.kind==='walking'){const path=step.path,dist=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y));let remaining=progress*dist.reduce((a,b)=>a+b,0);for(let i=0;i<dist.length;i++){if(remaining<=dist[i]||i===dist.length-1){const t=dist[i]?remaining/dist[i]:1;point={x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t};break;}remaining-=dist[i];}}
 return {...point,kind:step.kind,id:step.kind,label:step.label,placeId:step.placeId,progress,step,after:false};}
