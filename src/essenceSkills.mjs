// Versioned skill snapshots are copied into drops and plans, never looked up during replay.
const passive=(id,name,effect)=>({id,name,type:'passive',effect,version:1});
const active=(id,name,multiplier)=>({id,name,type:'active',multiplier,cooldown:3,version:1});
const skills={
 'echo-shadow':[active('shadow-touch','그림자 손길',1.2),passive('shadow-veil','흐릿한 형체',{defense:1})],
 'cave-slime':[active('slime-press','점프 압착',1.5),passive('soft-body','말랑한 몸',{maxHp:4})],
 'cave-bat':[active('bat-dive','급강하',1.3),passive('cave-senses','동굴 감각',{attack:1})],
 'stone-golem':[active('golem-slam','내려찍기',1.8),passive('stone-skin','돌가죽',{defense:2})],
 'lantern-warden':[active('lantern-wave','등불 파동',1.5),passive('lantern-warmth','등불의 온기',{maxHp:6})],
 'moss-salamander':[active('water-wave','수로 물결',1.6),passive('moss-scales','이끼 비늘',{defense:2})],
 'crystal-stag':[active('resonant-charge','공명 돌진',1.7),passive('crystal-resonance','수정 공명',{attack:2})]
};
export function monsterSkills(id){return structuredClone(skills[id]||[]);}
export function passiveBonus(list=[]){return list.filter(s=>s.type==='passive').reduce((a,s)=>({attack:a.attack+(s.effect?.attack||0),defense:a.defense+(s.effect?.defense||0),maxHp:a.maxHp+(s.effect?.maxHp||0)}),{attack:0,defense:0,maxHp:0});}
export function describeSkill(s){return s.type==='active'?`${Math.round(s.multiplier*100)}% 공격 · 재사용 ${s.cooldown}턴`:[s.effect?.attack&&`공격 +${s.effect.attack}`,s.effect?.defense&&`방어 +${s.effect.defense}`,s.effect?.maxHp&&`최대 HP +${s.effect.maxHp}`].filter(Boolean).join(' · ');}
export function equippedSkills(player){return player.skillRulesVersion===1?(player.skills||[]):[];}
export function nextActiveSkill(skills,turn,lastUsed){return skills.filter(s=>s.type==='active'&&turn-(lastUsed.get(s.id)??-Infinity)>=s.cooldown).sort((a,b)=>b.multiplier-a.multiplier||a.id.localeCompare(b.id))[0];}
