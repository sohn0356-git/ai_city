import {progression} from './progression.mjs';
export const ESSENCE_DROP_RATE=0.05;
export function essenceRoll(key){let n=2166136261;for(const c of key){n^=c.charCodeAt(0);n=Math.imul(n,16777619)>>>0;}return n/4294967296;}
export function dropEssence(world,plan,result,at){
 if(plan.essenceRulesVersion!==1||result.outcome!=='victory')return null;
 const reward=(world.adventureRewards||[]).find(r=>r.id===plan.encounterId&&r.playerId===plan.playerId&&r.monsterId===plan.monsterId&&r.outcome==='victory'&&r.essenceRulesVersion===1);
 if(!reward||!Number.isFinite(Date.parse(plan.endsAt))||!Number.isFinite(Date.parse(reward.at))||!Number.isFinite(Date.parse(at))||Date.parse(plan.endsAt)>Date.parse(at)||Date.parse(reward.at)>Date.parse(at))return null;
 const id='essence-'+plan.encounterId;
 if((world.essenceDrops||[]).some(d=>d.id===id))return world.essenceDrops.find(d=>d.id===id);
 if(essenceRoll('drop-v1:'+plan.encounterId)>=ESSENCE_DROP_RATE)return null;
 const skills=plan.monsterSnapshot?.essenceSkills;if(!skills?.length)return null;
 const skill=skills[Math.min(skills.length-1,Math.floor(essenceRoll('skill-v1:'+plan.encounterId)*skills.length))];
 const item={id,encounterId:plan.encounterId,ownerId:plan.playerId,monsterId:plan.monsterId,monsterName:plan.monsterSnapshot.name,skill:structuredClone(skill),at};
 world.essenceDrops??=[];world.essenceDrops.push(item);reward.essenceDropId=id;reward.essenceSkillSnapshot=structuredClone(skill);return item;
}
export function absorbEssence(world,{id,playerId,itemId,at}){
 world.essenceAbsorptions??=[];if(world.essenceAbsorptions.some(a=>a.id===id))return false;
 const p=world.players.find(p=>p.id===playerId),item=(world.essenceDrops||[]).find(d=>d.id===itemId&&d.ownerId===playerId);
 if(!p||!item)throw Error('Unknown owned essence');
 if(!Number.isFinite(Date.parse(at))||Date.parse(at)<Date.parse(item.at))throw Error('Invalid absorption time');
 if(world.essenceAbsorptions.some(a=>a.itemId===itemId))throw Error('Essence already consumed');
 const level=progression(p,[]).level;
 if(world.essenceAbsorptions.some(a=>a.playerId===playerId&&a.level===level))throw Error('One absorption per level');
 if((p.skills||[]).some(s=>s.id===item.skill.id))throw Error('Skill already learned');
 const source=(world.adventureRewards||[]).find(r=>r.id===item.encounterId&&r.playerId===playerId&&r.outcome==='victory'&&r.essenceRulesVersion===1);
 if(!source||source.essenceDropId!==item.id||source.monsterId!==item.monsterId||JSON.stringify(source.essenceSkillSnapshot)!==JSON.stringify(item.skill))throw Error('Missing actual victory source');
 const skill=structuredClone(item.skill);p.skills=[...(p.skills||[]),skill];p.skillRulesVersion=1;
 world.essenceAbsorptions.push({id,playerId,itemId,level,skill:structuredClone(skill),at});
 p.memory=[...(p.memory||[]),`${item.monsterName}의 정수에서 ${skill.name} 흡수 · Lv.${level} 슬롯 사용`].slice(-30);
 p.longTermMemory=[...(p.longTermMemory||[]),`정수 ${itemId}: ${skill.name} 영구 습득, Lv.${level} 흡수권 사용`];return true;
}
export function chooseEssence(world,p,item){
 const level=progression(p,[]).level;
 if((world.essenceAbsorptions||[]).some(a=>a.playerId===p.id&&a.level===level))return {choice:'keep',reason:`현재 Lv.${level} 흡수권을 이미 사용해 다음 성장까지 보관한다.`};
 if((p.skills||[]).some(s=>s.id===item.skill.id))return {choice:'keep',reason:'이미 배운 스킬이라 귀한 레벨별 흡수권을 쓰지 않고 보관한다.'};
 const context=Object.values(p.persona||{}).join(' ')+' '+p.goal;
 const cautious=/신중|안전|두렵|책임|완벽/.test(context),bold=/도전|탐험|전투|활달/.test(context),retreated=(world.adventureRewards||[]).some(r=>r.playerId===p.id&&r.outcome==='retreat');
 const absorb=item.skill.type==='passive'?(cautious||(p.energy??100)<50):(bold||retreated);
 return {choice:absorb?'absorb':'keep',reason:absorb?`${p.goal} 목표와 ${p.persona?.traits||'현재 상태'}를 고려해 ${item.skill.type==='passive'?'생존 보조':'전투 대응'} 능력을 선택한다.`:`${p.goal}에 바로 필요한 능력인지 더 살펴보려고 흡수를 보류한다.`};
}
export function decideEssences(world,at){
 for(const item of world.essenceDrops||[]){const p=world.players.find(p=>p.id===item.ownerId);if(!p||Date.parse(item.at)>Date.parse(at)||(world.essenceAbsorptions||[]).some(a=>a.itemId===item.id))continue;const level=progression(p,[]).level,id=`decision-${item.id}-level${level}`;world.essenceDecisions??=[];if(world.essenceDecisions.some(d=>d.id===id))continue;const d=chooseEssence(world,p,item);if(d.choice==='absorb')absorbEssence(world,{id:'absorb-'+item.id,playerId:p.id,itemId:item.id,at});world.essenceDecisions.push({id,itemId:item.id,playerId:p.id,level,at,...d});p.memory=[...(p.memory||[]),`${item.skill.name} 정수 ${d.choice==='absorb'?'흡수 선택':'보관 선택'}: ${d.reason}`].slice(-30);p.longTermMemory=[...(p.longTermMemory||[]),`정수 결정 ${id}: ${d.choice} · ${d.reason}`];}
}
export function validateEssences(world){
 const drops=world.essenceDrops||[],absorptions=world.essenceAbsorptions||[],decisions=world.essenceDecisions||[];
 if(new Set(drops.map(d=>d.id)).size!==drops.length||new Set(absorptions.map(a=>a.id)).size!==absorptions.length||new Set(absorptions.map(a=>a.itemId)).size!==absorptions.length||new Set(absorptions.map(a=>a.playerId+':'+a.level)).size!==absorptions.length||new Set(decisions.map(d=>d.id)).size!==decisions.length)throw Error('Duplicate essence or absorption slot');
 const validSkill=s=>s&&s.version===1&&typeof s.id==='string'&&typeof s.name==='string'&&((s.type==='active'&&Number.isFinite(s.multiplier)&&s.multiplier>=1&&Number.isInteger(s.cooldown)&&s.cooldown>=1)||(s.type==='passive'&&s.effect&&Object.keys(s.effect).length>0&&Object.entries(s.effect).every(([k,n])=>['attack','defense','maxHp'].includes(k)&&Number.isInteger(n)&&n>0)));
 for(const d of drops){const source=(world.adventureRewards||[]).find(r=>r.id===d.encounterId&&r.playerId===d.ownerId&&r.monsterId===d.monsterId&&r.outcome==='victory'&&r.essenceRulesVersion===1&&r.essenceDropId===d.id);if(!source||!validSkill(d.skill)||JSON.stringify(d.skill)!==JSON.stringify(source.essenceSkillSnapshot)||!world.players.some(p=>p.id===d.ownerId)||!Number.isFinite(Date.parse(d.at))||!Number.isFinite(Date.parse(source.at))||Date.parse(source.at)>Date.parse(d.at))throw Error('Invalid essence source');}
 for(const a of absorptions){const d=drops.find(d=>d.id===a.itemId&&d.ownerId===a.playerId),p=world.players.find(p=>p.id===a.playerId);if(!d||!p||!Number.isInteger(a.level)||a.level<1||a.level>50||Date.parse(a.at)<Date.parse(d.at)||!Number.isFinite(Date.parse(a.at))||JSON.stringify(a.skill)!==JSON.stringify(d.skill)||!p.skills?.some(s=>JSON.stringify(s)===JSON.stringify(a.skill)))throw Error('Invalid essence absorption');}
 for(const p of world.players){const ids=(p.skills||[]).map(s=>s.id);if(new Set(ids).size!==ids.length||(p.skills||[]).some(s=>!validSkill(s)||!absorptions.some(a=>a.playerId===p.id&&JSON.stringify(a.skill)===JSON.stringify(s))))throw Error('Unproven learned skill');}
 for(const d of decisions){const item=drops.find(i=>i.id===d.itemId&&i.ownerId===d.playerId);if(!item||!['keep','absorb'].includes(d.choice)||!d.reason||!Number.isInteger(d.level)||d.level<1||d.level>50||!Number.isFinite(Date.parse(d.at))||Date.parse(d.at)<Date.parse(item.at)||(d.choice==='absorb'&&!absorptions.some(a=>a.itemId===d.itemId&&a.playerId===d.playerId&&a.level===d.level)))throw Error('Invalid essence choice');}
 return true;
}
