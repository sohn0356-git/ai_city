import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export function validateWorld(world, roster) {
  assert.equal(world.schemaVersion,1,'Unsupported world schema');
  assert(Number.isInteger(world.cycle)&&world.cycle>=1,'Invalid cycle');
  assert.equal(world.targetPopulation,100,'Population target must remain 100');
  assert.equal(roster.length,100,'Roster must contain 100 personas');
  assert(world.players.length>0&&world.players.length<=100,'Active population must be 1..100');
  assert.equal(new Set(roster.map(p=>p.id)).size,100,'Roster IDs must be unique');
  assert.equal(new Set(roster.map(p=>p.name)).size,100,'Roster names must be unique');
  const ids=new Set(world.players.map(p=>p.id));
  const rosterIds=new Set(roster.map(p=>p.id));
  const buildings=new Set(world.buildings.map(b=>b.id));
  assert.equal(ids.size,world.players.length,'Active IDs must be unique');
  assert.equal(buildings.size,world.buildings.length,'Building IDs must be unique');
  const requiredString=(value,label)=>assert(typeof value==='string'&&value.trim().length>0,`${label} must be a nonempty string`);
  const validTime=(value,label)=>assert(Number.isFinite(Date.parse(value)),`${label} must be an ISO timestamp`);
  validTime(world.lastUpdated,'lastUpdated');validTime(world.nextUpdateAt,'nextUpdateAt');
  assert(Date.parse(world.nextUpdateAt)>Date.parse(world.lastUpdated),'Next update must follow actual update');
  for (const b of world.buildings) {assert(b.x>=0&&b.x<=100&&b.y>=0&&b.y<=100,'Building outside map');requiredString(b.name,'Building name');}
  for (const p of roster) {
    assert.equal(p.kind,'ai','Roster must contain AI characters only');
    for(const key of ['name','role','goal','quote'])requiredString(p[key],key);
    for(const key of ['traits','voice','motivation','tension'])requiredString(p.persona?.[key],`Persona ${key}`);
    assert(buildings.has(p.location),'Unknown roster location');
  }
  for (const p of world.players) {
    assert(rosterIds.has(p.id),'Active player missing from roster');
    assert.equal(p.kind,'ai','Player must be fictional AI');
    assert(buildings.has(p.location),'Unknown player location');
    assert(!p.previousLocation||buildings.has(p.previousLocation),'Unknown previous location');
    assert(p.energy>=0&&p.energy<=100,'Energy outside range');
    assert(Number.isInteger(p.contributions)&&p.contributions>=0,'Invalid contributions');
    assert(p.joinedCycle>=1&&p.joinedCycle<=world.cycle,'Invalid joined cycle');
    assert.equal(p.lastActiveCycle,world.cycle,`${p.name} did not act in current cycle`);
    assert(p.memory.length>0&&p.memory.length<=30,'Memory must contain 1..30 entries');
    assert(p.longTermMemory.length>0,'Long-term memory missing');
    for(const m of [...p.memory,...p.longTermMemory])requiredString(m,'Memory');
    requiredString(p.currentAction,'Current action');requiredString(p.mood,'Mood');
    for(const key of ['traits','voice','motivation','tension'])requiredString(p.persona?.[key],`Persona ${key}`);
    for(const r of p.relationships){assert(ids.has(r.playerId)&&r.playerId!==p.id,'Invalid relationship');assert(r.affinity>=-100&&r.affinity<=100,'Affinity outside range');requiredString(r.reason,'Relationship reason');}
    assert(world.events.some(e=>e.actorId===p.id&&e.cycle===world.cycle&&e.type==='action'),`${p.name} needs an individual action this cycle`);
  }
  assert(world.events.length<=600,'Retain at most 600 recent events');
  assert.equal(new Set(world.events.map(e=>e.id)).size,world.events.length,'Event IDs must be unique');
  for(const e of world.events){assert(ids.has(e.actorId),'Unknown event actor');assert(!e.targetId||ids.has(e.targetId),'Unknown event target');assert(buildings.has(e.location),'Unknown event location');assert(e.cycle>=1&&e.cycle<=world.cycle,'Invalid event cycle');validTime(e.at,'Event time');assert(Date.parse(e.at)<=Date.parse(world.lastUpdated),'Future activity cannot be recorded as complete');requiredString(e.text,'Event text');requiredString(e.reason,'Event reason');requiredString(e.outcome,'Event outcome');}
  for(const p of world.projects){assert(p.progress>=0&&p.progress<=100,'Invalid project progress');assert(p.ownerIds.length>0&&p.ownerIds.every(id=>ids.has(id)),'Unknown project owner');requiredString(p.nextStep,'Project next step');}
  assert(world.metrics.happiness>=0&&world.metrics.happiness<=100,'Invalid happiness');
  for(const key of ['food','materials','collaboration'])assert(Number.isFinite(world.metrics[key])&&world.metrics[key]>=0,`Invalid metric ${key}`);
  for(const u of world.updates){assert(u.cycle>=1&&u.cycle<=world.cycle,'Invalid update cycle');validTime(u.at,'Update time');requiredString(u.title,'Update title');requiredString(u.text,'Update text');}
  if(world.episode){
    const episode=world.episode;
    assert(['deliberation','resolved'].includes(episode.phase),'Invalid episode phase');
    const options=new Set(episode.options.map(o=>o.id));
    assert.equal(options.size,episode.options.length,'Episode option IDs must be unique');
    assert.equal(new Set(episode.positions.map(p=>p.playerId)).size,episode.positions.length,'One stance per resident');
    for(const position of episode.positions){assert(ids.has(position.playerId),'Unknown episode resident');assert(options.has(position.optionId),'Unknown episode option');requiredString(position.reason,'Stance reason');}
    assert(episode.steps.every(s=>['done','current','pending'].includes(s.status)),'Invalid episode step');
    if(episode.phase==='resolved'){assert(options.has(episode.result?.optionId),'Resolved episode needs a chosen option');requiredString(episode.result.summary,'Episode outcome');}
    requiredString(episode.nextQuestion,'Next episode question');
  }
  if(world.resourceLedger){
    assert.equal(world.resourceLedger.cycle,world.cycle,'Ledger cycle mismatch');
    for(const key of ['food','materials']){const entry=world.resourceLedger[key];assert.equal(entry.opening+entry.produced-entry.consumed,entry.closing,'Ledger arithmetic mismatch');assert.equal(entry.closing,world.metrics[key],'Ledger closing mismatch');}
  }
  if(world.storageState){const s=world.storageState;assert(s.shelf>=0&&s.day>=0&&s.shelf<=s.capacity&&(!s.dayCapacity||s.day<=s.dayCapacity),'Invalid storage allocation');assert.equal(s.shelf+s.day,world.metrics.food,'Storage total mismatch');}
  if(world.foodFlow){
    const f=world.foodFlow,s=world.sceneChanges?.storageBefore;
    assert.equal(f.cycle,world.cycle,'Food flow cycle mismatch');
    for(const key of ['dayConsumed','shelfConsumed','harvestToShelf','harvestToDay'])assert(Number.isInteger(f[key])&&f[key]>=0,'Invalid food flow quantity');
    assert.equal(f.dayConsumed+f.shelfConsumed,world.resourceLedger.food.consumed,'Food flow consumption mismatch');
    assert.equal(f.harvestToShelf+f.harvestToDay,world.resourceLedger.food.produced,'Food flow harvest mismatch');
    assert(s&&f.dayConsumed<=s.day&&f.shelfConsumed<=s.shelf,'Food flow exceeds previous stock');
    assert.equal(s.day-f.dayConsumed+f.harvestToDay,world.storageState.day,'Food flow day balance mismatch');
    assert.equal(s.shelf-f.shelfConsumed+f.harvestToShelf,world.storageState.shelf,'Food flow shelf balance mismatch');
  }
  if(world.measurementState){const m=world.measurementState;assert.equal(m.cycle,world.cycle,'Measurement cycle mismatch');assert.equal(m.flatMinutes+m.handoffMinutes+m.restMinutes,m.totalMinutes,'Measurement total mismatch');if(m.comparisonVerified){assert.equal(m.baselineMinutes-m.totalMinutes,m.savedMinutes,'Measurement saving mismatch');assert(m.trips>=2&&m.scope,'Verified comparison needs repeated trials and scope');}}
  if(world.constructionState){const s=world.constructionState;assert.equal(s.progress,world.projects.find(p=>p.id==='storage-extension').progress,'Construction progress mismatch');assert(!s.usable||s.progress===100,'Unfinished construction cannot be usable');}
  return true;
}
export async function loadWorld(){return Promise.all(['public/world.json','public/roster.json'].map(path=>readFile(path,'utf8').then(JSON.parse)));}
if (process.argv[1]?.endsWith('/validate-world.mjs')) { const [world,roster]=await loadWorld();validateWorld(world,roster);console.log(`World valid: cycle ${world.cycle}, ${world.players.length}/100 residents, ${world.events.length} events`); }
