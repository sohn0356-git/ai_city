import React, { useEffect, useState } from 'react';
const colors=['#ba7761','#6f94ad','#8a9c6a','#c19371','#a28ab3','#b49a5d','#7e9a7c','#a47e8e','#8c92b2','#6b9490'];
function Resident({player,index,position,selected,onSelect,replay,compact}) {
  const [from,to]=position;
  const [arrived,setArrived]=useState(!replay);
  useEffect(()=>{
    if(!replay){setArrived(true);return;}
    setArrived(false);
    const timer=setTimeout(()=>setArrived(true),150+index*120);
    return()=>clearTimeout(timer);
  },[replay,index,from.id,to.id]);
  const point=arrived?to:from;
  const color=colors[index%colors.length];
  return <button className={`map-resident ${selected?'followed':''} ${compact?'compact':''}`} style={{left:`${point.x}%`,top:`${point.y}%`,'--resident-color':color,'--walk-duration':replay?'2.6s':'0s'}} onClick={()=>onSelect(player.id)} aria-label={`${player.name}, ${player.role}, ${player.currentAction}`}>
    <span className="resident-bubble">{player.currentAction}</span>
    <svg viewBox="0 0 38 52" aria-hidden="true"><ellipse cx="19" cy="48" rx="12" ry="3" fill="#35514530"/><path className="resident-legs" d="M14 36 12 46m12-10 3 10" stroke="#4f5f52" strokeWidth="5" strokeLinecap="round"/><path d="M11 23q8-6 16 0l2 14H9Z" fill={color}/><path d="m10 25-4 9m22-9 4 9" stroke="#e7bb98" strokeWidth="4" strokeLinecap="round"/><circle cx="19" cy="14" r="10" fill="#ecc5a3"/><path d="M9 13C6 1 29-2 29 13L25 9 20 7 13 10Z" fill={index%2?'#65584b':'#444c48'}/><path d="M15 15h1m6 0h1" stroke="#5e594d" strokeWidth="1.8" strokeLinecap="round"/></svg>
    <strong>{player.name}</strong><span className="resident-role">{player.role}</span>
  </button>;
}
export default function CityStage({world,selected,onSelect,building,onBuilding,Building,sceneBefore=false}) {
  const rack=world.projects.find(p=>p.id==='storage-rack');
  const rackComplete=rack?.progress===100;
  const [replay,setReplay]=useState(false);
  const [round,setRound]=useState(0);
  const [allResidents,setAllResidents]=useState(false);
  useEffect(()=>{if(!replay)return;const timer=setTimeout(()=>setReplay(false),7500);return()=>clearTimeout(timer);},[replay,round]);
  const buildingById=id=>world.buildings.find(b=>b.id===id)||world.buildings[0];
  const positions=world.players.map((p,index)=>{
    const destination=buildingById(p.location);
    const actions=world.events.filter(e=>e.actorId===p.id&&e.cycle===world.cycle&&e.type==='action');
    const source=buildingById(actions[0]?.fromLocation||p.previousLocation||p.location);
    const peers=world.players.filter(other=>other.location===p.location);
    const localIndex=peers.findIndex(other=>other.id===p.id);
    const columns=Math.min(peers.length,5);
    const x=destination.x+(localIndex%columns-(columns-1)/2)*6;
    const y=destination.y+13+Math.floor(localIndex/5)*7;
    return [{id:source.id,x:source.x,y:source.y+13},{id:destination.id,x:Math.max(5,Math.min(95,x)),y:Math.max(10,Math.min(89,y))}];
  });
  const displayed=world.players.filter(p=>{
    if(selected!=='all')return p.id===selected||world.events.some(e=>e.cycle===world.cycle&&((e.actorId===selected&&e.targetId===p.id)||(e.targetId===selected&&e.actorId===p.id)));
    if(building!=='all')return p.location===building;
    return allResidents||world.players.indexOf(p)<20;
  });
  return <div className="city-stage-wrap"><div className="stage-toolbar"><span><i/>{replay?'지난 회차 이동 재생 중':'현재 위치 · 마지막 회차 기준'}</span><button onClick={()=>{setRound(n=>n+1);setReplay(true);}} disabled={replay}>{replay?'재생 중…':'▶ 회차 이동 보기'}</button></div><div className="city-map visual-map" aria-label="주민들의 현재 위치와 지난 회차 이동을 보여주는 도시 지도">
    <svg className="roads" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><path d="M0 325 1000 325M500 0V650M180 145 850 520M240 520 840 120"/><path className="river" d="M-20 600Q220 390 330 520T1050 590"/></svg>
    {world.sceneChanges&&<div className="world-props" aria-label={sceneBefore?'축제 전 도시 시설':'축제 후 도시 시설'}><div className="food-store"><span>공동 창고</span><div>{Array.from({length:sceneBefore?world.sceneChanges.foodBefore:world.metrics.food},(_,i)=><i key={i}>▰</i>)}</div><b>{sceneBefore?world.sceneChanges.foodBefore:world.metrics.food}묶음</b></div>{(world.cycle>=2||!sceneBefore)&&<><div className="festival-table"><span>공동 식탁 완성</span><svg viewBox="0 0 140 70" aria-hidden="true"><path d="M5 25 65 4 135 30 75 55Z" fill="#b87843" stroke="#714a32" strokeWidth="3"/><path d="M25 34v23m80-17v24" stroke="#714a32" strokeWidth="6"/>{[35,65,95].map((x)=><g key={x}><ellipse cx={x} cy="28" rx="12" ry="5" fill="#fff2cc"/><circle cx={x} cy="26" r="4" fill="#8baf57"/></g>)}</svg><b>♫ 세 곡 공연 완료</b></div><div className="scene-ramp"><span>새 경사판</span><svg viewBox="0 0 90 45"><path d="M5 40 80 6 80 40Z" fill="#bb995e" stroke="#806439" strokeWidth="3"/><path d="M22 32 35 39M40 24 55 35M60 15 76 28" stroke="#e9cb8d" strokeWidth="3"/></svg></div><div className="scene-water"><span>설치한 빗물통</span><svg viewBox="0 0 60 80"><path d="M10 15h40v50q-20 15-40 0Z" fill="#6cbbc8" stroke="#377a92" strokeWidth="3"/><ellipse cx="30" cy="15" rx="20" ry="8" fill="#bce4e8"/><path d="M16 42h28" stroke="#c5f0ed" strokeWidth="4"/></svg></div></>}</div>}
    {rack&&<div className="storage-rack" aria-label={rackComplete?'완성 보관 선반, 최대 6묶음':'미완성 보관 선반, 적재 금지'}><span>{rackComplete?'사용 가능 · 한도 6묶음':'공사 중 · 적재 금지'}</span><svg viewBox="0 0 120 85">{rackComplete&&<><path d="M12 22h96v9H12Zm0 33h96v9H12Z" fill="#b88c55" stroke="#6e5031" strokeWidth="2"/><path d="M12 9h96v10H12Z" fill="#acc1a2"/></>}<path d="M15 75V10h90v65M15 40h90" fill="none" stroke="#805a35" strokeWidth="7"/><path d="m20 70 80-55" stroke="#b7965c" strokeWidth="4"/><path d="M5 77h110" stroke="#debc64" strokeWidth="3"/></svg>{rackComplete&&<div className="rack-stock">▰ ▰ ▰<br/>▰ ▰ ▰</div>}<b>{rackComplete?'상판·덮개 설치 완료':`상판 미완성 ${rack.progress}%`}</b></div>}
    <span className="map-compass">N<br/>↑</span><span className="map-tree tree-a">♧</span><span className="map-tree tree-b">♧</span><span className="map-tree tree-c">♧</span>
    {world.buildings.map(b=><button key={b.id} className={`building ${building===b.id?'selected':''}`} style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={()=>onBuilding(building===b.id?'all':b.id)} aria-label={`${b.name}, 주민 ${world.players.filter(p=>p.location===b.id).length}명`}><Building color={b.color} kind={b.kind}/><strong>{b.name}<small>{world.players.filter(p=>p.location===b.id).length}명</small></strong></button>)}
    {replay&&selected!=='all'&&<svg className="follow-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{world.players.filter(p=>p.id===selected).map(p=>{const pos=positions[world.players.indexOf(p)];return <path key={p.id} d={`M${pos[0].x},${pos[0].y} L${pos[1].x},${pos[1].y}`}/>;})}</svg>}
    {displayed.map(p=>{const index=world.players.indexOf(p);return <Resident key={`${p.id}-${round}`} player={p} index={index} position={positions[index]} selected={selected===p.id} onSelect={onSelect} replay={replay} compact={displayed.length>20}/>;})}
    <span className="map-note">주민을 누르면 지금 하는 일과 속마음이 보여요</span>
  </div><div className="stage-legend"><span>● 주민 클릭 → 따라보기</span><span>건물 클릭 → 그곳의 이야기</span>{world.players.length>20&&selected==='all'&&building==='all'&&<button onClick={()=>setAllResidents(!allResidents)}>{allResidents?'주요 주민만':'전체 주민 표시'}</button>}</div></div>;
}
