export const MONSTERS=[
 {id:'echo-shadow',name:'동굴 그림자',level:1,hp:22,attack:5,defense:1,xp:15,sprite:3,available:true,skill:'그림자 손길',multiplier:1.2,pattern:['warn','skill','rest']},
 {id:'cave-slime',name:'동굴 슬라임',level:1,hp:30,attack:6,defense:2,xp:15,sprite:0,available:true,skill:'점프 압착',multiplier:1.5,pattern:['warn','skill','rest']},
 {id:'cave-bat',name:'동굴 박쥐',level:2,hp:24,attack:9,defense:1,xp:22,sprite:1,available:false,skill:'급강하',multiplier:1.3,pattern:['attack','attack','warn','skill','rest']},
 {id:'stone-golem',name:'돌 골렘',level:4,hp:80,attack:14,defense:7,xp:50,sprite:2,available:false,skill:'내려찍기',multiplier:1.8,pattern:['attack','warn','skill','rest','rest']}
];
export function monsterById(id){const m=MONSTERS.find(m=>m.id===id);if(!m)throw Error(`Unknown monster ${id}`);return m;}
export function defeated(world,playerId,monsterId){return (world.adventureRewards||[]).some(r=>r.playerId===playerId&&(r.monsterId||'echo-shadow')===monsterId&&r.outcome==='victory');}
export const damage=(attack,defense,multiplier=1)=>Math.max(1,Math.floor(attack*multiplier-defense));
