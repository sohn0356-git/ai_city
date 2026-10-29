import React,{useRef,useEffect,useState} from 'react';
import ResidentAvatar from './ResidentAvatar';
import {activityState} from './activity.mjs';
import {FLOORS,floorFor,dungeonPoint,floorTile} from './dungeon.mjs';
export default function DungeonView({world,now,selected,onSelect}){
 const [floor,setFloor]=useState(1),[focus,setFocus]=useState(null),[nonce,setNonce]=useState(0);const viewport=useRef(null);
 const present=world.players.filter(p=>activityState(p,world,now)?.kind==='fighting');
 const follow=p=>{const a=activityState(p,world,now);onSelect(p.id);setFloor(floorFor(a.plan));setFocus(p.id);setNonce(n=>n+1);};
 useEffect(()=>{const p=present.find(p=>p.id===selected);if(p){setFloor(floorFor(activityState(p,world,now).plan));setFocus(p.id);setNonce(n=>n+1);}},[selected]);
 useEffect(()=>{if(!focus)return;const p=dungeonPoint(focus);viewport.current.scrollTo({left:p.x*32-viewport.current.clientWidth/2+16,top:p.y*32-viewport.current.clientHeight/2+16,behavior:'smooth'});},[floor,focus,nonce]);
 const f=FLOORS.find(f=>f.id===floor);
 return <section className={`dungeon-view ${f.theme}`}><h3>메아리 동굴 · 지하 {floor}층</h3><p>{f.name} · {f.description}</p><nav aria-label="던전 층 선택">{FLOORS.map(f=><button key={f.id} aria-pressed={floor===f.id} onClick={()=>{setFloor(f.id);setFocus(null);}}>{f.id}층 {f.name}{f.id===3?' · 미개방':''}</button>)}</nav><div className="dungeon-viewport" ref={viewport}><div className="dungeon-grid">{Array.from({length:432},(_,i)=><span key={i} className={`cave-tile ${floorTile(floor,i%24,Math.floor(i/24))}`}/>)}<span className="cave-stairs" style={{left:64,top:64}}>⇧ 입구</span>{present.filter(p=>floorFor(activityState(p,world,now).plan)===floor).map(p=>{const pos=dungeonPoint(p.id);return <button key={p.id} className={`cave-resident ${focus===p.id?'focused':''}`} style={{left:pos.x*32,top:pos.y*32}} onClick={()=>follow(p)}><ResidentAvatar id={p.id}/><strong>{p.name}</strong></button>;})}</div></div><p>{present.length?`현재 대련 중 ${present.length}명 · 주민을 누르면 해당 층·위치로 이동`:'현재 던전에 머무는 주민이 없습니다. 층별 지도를 둘러볼 수 있습니다.'}</p><div className="dungeon-roster">{present.map(p=><button key={p.id} onClick={()=>follow(p)}><ResidentAvatar id={p.id}/>{p.name} · 지하 {floorFor(activityState(p,world,now).plan)}층 · 대련 중</button>)}</div><small>층은 배정된 몬스터의 대련 구역입니다. 층 선택은 관찰만 하며 전투·처치·보상을 만들지 않습니다. 3층은 미개방 시안입니다.</small></section>;
}
