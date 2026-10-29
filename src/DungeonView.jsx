import DungeonGround from './DungeonGround';
import {caveResidentPoint as dungeonPoint,roamPoint} from './dungeonMap.mjs';
import {MONSTERS} from './monsters.mjs';
import {MonsterSprite} from './MonsterBook';
import {useMapPinch} from './useMapPinch.mjs';
import React,{useRef,useEffect,useState} from 'react';
import ResidentAvatar from './ResidentAvatar';
import {activityState} from './activity.mjs';
import {FLOORS,floorFor} from './dungeon.mjs';
export default function DungeonView({world,now,selected,onSelect}){
 const [floor,setFloor]=useState(1),[focus,setFocus]=useState(null),[nonce,setNonce]=useState(0);const viewport=useRef(null);
 const [zoom,setZoom]=useState('1'),[monster,setMonster]=useState(null);
 const suppress=useMapPinch(viewport,setZoom);
 const present=world.players.filter(p=>activityState(p,world,now)?.kind==='fighting');
 const follow=p=>{const a=activityState(p,world,now);onSelect(p.id);setFloor(floorFor(a.plan));setFocus(p.id);setNonce(n=>n+1);};
 useEffect(()=>{const p=present.find(p=>p.id===selected);if(p){setFloor(floorFor(activityState(p,world,now).plan));setFocus(p.id);setNonce(n=>n+1);}},[selected]);
 useEffect(()=>{if(!focus)return;const p=dungeonPoint(focus);viewport.current.scrollTo({left:p.x*32*Number(zoom)-viewport.current.clientWidth/2+16,top:p.y*32*Number(zoom)-viewport.current.clientHeight/2+16,behavior:'smooth'});},[floor,focus,nonce,zoom]);
 const roaming=floor<3?Array.from({length:10},(_,i)=>({key:i,monster:MONSTERS.find(m=>m.id===(floor===1?'echo-shadow':'cave-slime')),point:roamPoint(floor,i,now)})):[];
 const f=FLOORS.find(f=>f.id===floor);
 return <section className={`dungeon-view ${f.theme}`}><h3>메아리 동굴 · 지하 {floor}층</h3><p>{f.name} · {f.description}</p><nav aria-label="던전 층 선택">{FLOORS.map(f=><button key={f.id} aria-pressed={floor===f.id} onClick={()=>{setFloor(f.id);setFocus(null);}}>{f.id}층 {f.name}{f.id===3?' · 미개방':''}</button>)}</nav><div className="dungeon-map-controls"><span>48×36 타일 · 1536×1152</span>{['0.5','1','1.5'].map(z=><button key={z} onClick={()=>setZoom(z)} aria-pressed={zoom===z}>{Number(z)*100}%</button>)}<small>두 손가락 확대 · 한 손가락 이동</small></div><div className="dungeon-viewport" ref={viewport} onClickCapture={e=>{if(suppress.current){e.preventDefault();e.stopPropagation();}}}><div style={{width:1536*Number(zoom),height:1152*Number(zoom)}}><div className="dungeon-grid" style={{zoom:Number(zoom)}}><DungeonGround floor={floor}/>{roaming.map(r=><button key={r.key} className="roaming-monster" style={{left:r.point.x*32,top:r.point.y*32}} onClick={()=>setMonster(r.monster)} aria-label={`${r.monster.name} Lv.${r.monster.level} 서식 개체`}><MonsterSprite monster={r.monster}/><small>Lv.{r.monster.level}</small></button>)}<span className="cave-stairs" style={{left:64,top:64}}>⇧ 입구</span>{present.filter(p=>floorFor(activityState(p,world,now).plan)===floor).map(p=>{const pos=dungeonPoint(p.id);return <button key={p.id} className={`cave-resident ${focus===p.id?'focused':''}`} style={{left:pos.x*32,top:pos.y*32}} onClick={()=>follow(p)}><ResidentAvatar id={p.id}/><strong>{p.name}</strong></button>;})}</div></div></div>{monster&&<div className="habitat-info"><button onClick={()=>setMonster(null)}>닫기</button><MonsterSprite monster={monster}/><b>{monster.name} · Lv.{monster.level}</b><p>HP {monster.hp} · 공격 {monster.attack} · 방어 {monster.defense} · 최초 처치 {monster.xp}XP</p><small>서식 개체의 배회 표현입니다. 터치로 전투·보상이 발생하지 않습니다.</small></div>}<p>{present.length?`현재 대련 중 ${present.length}명 · 주민을 누르면 해당 층·위치로 이동`:'현재 던전에 머무는 주민이 없습니다. 층별 지도를 둘러볼 수 있습니다.'}</p><div className="dungeon-roster">{present.map(p=><button key={p.id} onClick={()=>follow(p)}><ResidentAvatar id={p.id}/>{p.name} · 지하 {floorFor(activityState(p,world,now).plan)}층 · 대련 중</button>)}</div><small>층은 배정된 몬스터의 대련 구역입니다. 층 선택은 관찰만 하며 전투·처치·보상을 만들지 않습니다. 3층은 미개방 시안입니다. 배회는 공유 시각 기반의 서식지 연출이며 실제 조우 확률·보스 해금은 아직 연결되지 않았습니다.</small></section>;
}
