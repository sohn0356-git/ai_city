export const MONSTERS=[
 {id:'echo-shadow',name:'동굴 그림자',level:1,hp:22,attack:5,defense:1,xp:1,sprite:3,available:true,skill:'그림자 손길',multiplier:1.2,pattern:['warn','skill','rest']},
 {id:'cave-slime',name:'동굴 슬라임',level:1,hp:30,attack:6,defense:2,xp:1,sprite:0,available:true,skill:'점프 압착',multiplier:1.5,pattern:['warn','skill','rest']},
 {id:'cave-bat',name:'동굴 박쥐',level:2,hp:24,attack:9,defense:1,xp:2,sprite:1,available:false,skill:'급강하',multiplier:1.3,pattern:['attack','attack','warn','skill','rest']},
 {id:'stone-golem',name:'돌 골렘',level:4,hp:80,attack:14,defense:7,xp:4,sprite:2,available:false,skill:'내려찍기',multiplier:1.8,pattern:['attack','warn','skill','rest','rest']}
 ,{id:'lantern-warden',name:'등불지기',level:3,hp:48,attack:8,defense:3,xp:3,sprite:4,available:false,boss:true,floor:1,skill:'등불 파동',multiplier:1.5,pattern:['warn','skill','rest','attack','rest']}
 ,{id:'moss-salamander',name:'이끼도롱뇽',level:5,hp:76,attack:12,defense:4,xp:5,sprite:5,available:false,boss:true,floor:2,skill:'수로 물결',multiplier:1.6,pattern:['attack','warn','skill','rest','rest']}
 ,{id:'crystal-stag',name:'수정 메아리 사슴',level:8,hp:110,attack:16,defense:6,xp:8,sprite:6,available:false,boss:true,floor:3,skill:'공명 돌진',multiplier:1.7,pattern:['warn','skill','rest','attack','warn','skill','rest','rest']}
];
export function monsterById(id){const m=MONSTERS.find(m=>m.id===id);if(!m)throw Error(`Unknown monster ${id}`);return m;}
export function defeated(world,playerId,monsterId){return (world.adventureRewards||[]).some(r=>r.playerId===playerId&&(r.monsterId||'echo-shadow')===monsterId&&r.outcome==='victory');}
export const damage=(attack,defense,multiplier=1)=>Math.max(1,Math.floor(attack*multiplier-defense));
