import test from 'node:test';
import assert from 'node:assert/strict';
import {activityState} from '../src/activity.mjs';
test('ended explicit city schedule never invents a battle',()=>{const plan={playerId:'p001',startsAt:'2026-10-30T07:00:00Z',endsAt:'2026-10-30T09:00:00Z',steps:[{kind:'working',placeId:'hall',label:'도면 검토',point:{x:49,y:26},startsAt:'2026-10-30T07:00:00Z',endsAt:'2026-10-30T09:00:00Z'}]};for(const delta of [0,1,3600000]){const s=activityState({id:'p001'},{activityPlans:[plan]},Date.parse(plan.endsAt)+delta);assert.equal(s.result,null);assert.equal(s.turn,null);assert.equal(s.kind,'resting');assert.equal(s.x,49);assert.equal(s.y,26);assert(s.after);}});
