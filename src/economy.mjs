export const SERVICES=[{id:'cafe-rest',name:'카페 휴식 예약',place:'cafe',price:3},{id:'tool-check',name:'수리공 도구 점검 의뢰',place:'market',price:5}];
export function economy(world){return world.economy||{ledger:[],orders:[]};}
export function balance(world,id){return economy(world).ledger.reduce((sum,t)=>sum+(t.to===id?t.amount:0)-(t.from===id?t.amount:0),0);}
export function creditVictory(world,{id,playerId,amount,at}){
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid gold');
 world.economy??={ledger:[],orders:[]};
 if(world.economy.ledger.some(t=>t.id===id))return false;
 if(!world.players.some(p=>p.id===playerId))throw Error('Unknown resident');
 world.economy.ledger.push({id,from:'dungeon',to:playerId,amount,at,kind:'victory'});return true;
}
export function orderService(world,{id,playerId,serviceId,at}){
 const service=SERVICES.find(s=>s.id===serviceId);if(!service)throw Error('Unknown service');
 if(economy(world).ledger.some(t=>t.id===id))return false;
 if(!world.players.some(p=>p.id===playerId))throw Error('Unknown resident');
 if(balance(world,playerId)<service.price)throw Error('Insufficient gold');
 world.economy.ledger.push({id,from:playerId,to:'town-treasury',amount:service.price,at,kind:'order',serviceId});
 world.economy.orders.push({id,playerId,serviceId,status:'pending',at});return true;
}

// Completion needs both the customer and provider's recorded activity, never a browser timer.
export function completeService(world,{id,providerId,evidenceIds,at}){
 const order=economy(world).orders.find(o=>o.id===id);if(!order)throw Error('Unknown order');
 if(order.status==='completed')return false;
 const service=SERVICES.find(s=>s.id===order.serviceId),provider=world.players.find(p=>p.id===providerId);
 if(!provider||providerId===order.playerId||!['p004','p013'].includes(providerId)||providerId!==(service.id==='cafe-rest'?'p004':'p013'))throw Error('Invalid provider');
 const evidence=(evidenceIds||[]).map(id=>world.events.find(e=>e.id===id));
 if(evidence.length!==2||evidence.some(e=>!e||e.type!=='action'||e.cycle!==world.cycle||e.location!==service.place||Date.parse(e.at)>Date.parse(at))||!evidence.some(e=>e.actorId===order.playerId)||!evidence.some(e=>e.actorId===providerId))throw Error('Missing service evidence');
 const capacity=service.id==='cafe-rest'?2:1;
 if(economy(world).orders.filter(o=>o.serviceId===service.id&&o.completedCycle===world.cycle).length>=capacity)throw Error('Service capacity exceeded');
 Object.assign(order,{status:'completed',providerId,evidenceIds,completedAt:at,completedCycle:world.cycle});return true;
}
