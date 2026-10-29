import ResidentAvatar from './ResidentAvatar';
import {activityState} from './activity.mjs';
import React,{useEffect,useRef,useState} from 'react';
export default function BuildingDetails({place,world,onClose,onSelect}){
 const dialog=useRef(null);
 useEffect(()=>{const d=dialog.current;d.showModal();return()=>d.close();},[]);
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const current=p=>{const a=activityState(p,world,now);if(!a)return p.location;return a.kind==='walking'?null:a.kind==='fighting'?'dungeon':a.kind==='working'?a.plan.destination:a.plan.home;};
 const residents=world.players.filter(p=>current(p)===place.id);
 const projects=world.projects.filter(p=>p.location===place.id);
 const events=world.events.filter(e=>e.location===place.id).slice(-5).reverse();
 return <dialog className="building-details" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}} aria-labelledby="place-title"><button className="place-close" onClick={onClose} aria-label="시설 정보 닫기">닫기 ×</button><h2 id="place-title">{place.name}</h2><p>{place.description}</p><h3>현재 머무는 주민 · 공유 일정 기준</h3>{residents.length?residents.map(p=><button className="place-resident" key={p.id} onClick={()=>{onSelect(p.id);onClose();}}><ResidentAvatar id={p.id}/><b>{p.name} · {p.role}</b><span>{activityState(p,world,now)?.label||p.currentAction}</span><small>주민 따라보기 →</small></button>):<p>현재 머무는 주민이 없습니다. 이동 중인 주민은 지도에서 확인하세요.</p>}<h3>시설 프로젝트</h3>{projects.length?projects.map(p=><div key={p.id}><b>{p.name} · {p.progress}%</b><progress max="100" value={p.progress}/><p>{p.nextStep||p.description}</p></div>):<p>등록된 프로젝트가 없습니다.</p>}<h3>최근 이곳의 이야기</h3>{events.map(e=><p key={e.id}>{world.players.find(p=>p.id===e.actorId)?.name} · {e.text}<br/><small>{e.outcome}</small></p>)}{!events.length&&<p>기록된 활동이 없습니다.</p>}<small>관찰 전용 · 주민 지시나 자원 변경 없이 공개 세계 기록을 살펴봅니다.</small></dialog>;
}
