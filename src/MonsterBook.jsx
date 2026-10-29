import React from 'react';
import {MONSTERS,defeated} from './monsters.mjs';
export function MonsterSprite({monster,phase='idle'}){return <span className={`monster-sprite monster-${phase}`} aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}tiles/monsters-v11.png)`,backgroundPosition:`${monster.sprite%2*100}% ${Math.floor(monster.sprite/2)*100}%`}}/>;}
export default function MonsterBook({world,selected}){
 const p=world.players.find(p=>p.id===selected);
 return <details className="monster-book"><summary>몬스터 도감 · {p?`${p.name} ${MONSTERS.filter(m=>defeated(world,p.id,m.id)).length}/${MONSTERS.length}종 처치`:'주민별 최초 처치 수집'}</summary><p>주민마다 종류별 최초 처치에만 XP. 반복 처치·후퇴는 0XP. 잠긴 종류는 아직 출현하지 않습니다.</p><div className="monster-grid">{MONSTERS.map(m=><article key={m.id}><MonsterSprite monster={m}/><h3>{m.name} · Lv.{m.level}</h3><b>{m.available?'출현 중':'준비 중 · 미출현'} · {p&&defeated(world,p.id,m.id)?'처치 완료':'최초 처치 미완료'}</b><p>HP {m.hp} / 공격 {m.attack} / 방어 {m.defense}</p><p>{m.skill} · {Math.round(m.multiplier*100)}% 공격</p><small>패턴: {m.pattern.map(x=>({attack:'일반 공격',warn:'공격 예고',skill:m.skill,rest:'휴식'})[x]).join(' → ')}</small><p>최초 처치 {m.xp}XP · 재처치 0XP</p></article>)}</div></details>;
}
