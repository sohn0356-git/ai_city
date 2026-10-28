import React, { useEffect, useState, useRef } from 'react';
import TileGround, {BuildingTile} from './TileGround';
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
    {player.id==='p020'?<span className="resident-pixel" aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}tiles/resident-v8.png)`}}/>:<>    <svg viewBox="0 0 38 52" aria-hidden="true"><ellipse cx="19" cy="48" rx="12" ry="3" fill="#35514530"/><path className="resident-legs" d="M14 36 12 46m12-10 3 10" stroke="#4f5f52" strokeWidth="5" strokeLinecap="round"/><path d="M11 23q8-6 16 0l2 14H9Z" fill={color}/><path d="m10 25-4 9m22-9 4 9" stroke="#e7bb98" strokeWidth="4" strokeLinecap="round"/><circle cx="19" cy="14" r="10" fill="#ecc5a3"/><path d="M9 13C6 1 29-2 29 13L25 9 20 7 13 10Z" fill={index%2?'#65584b':'#444c48'}/><path d="M15 15h1m6 0h1" stroke="#5e594d" strokeWidth="1.8" strokeLinecap="round"/></svg></>}
    <strong>{player.name}</strong><span className="resident-role">{player.role}</span>
  </button>;
}
export default function CityStage({world,selected,onSelect,building,onBuilding,sceneBefore=false}) {
  const [zoom,setZoom]=useState('fit');
  const viewport=useRef(null);
  useEffect(()=>{
    if(zoom==='fit'||!viewport.current)return;
    const p=world.players.find(p=>p.id===selected);const b=world.buildings.find(b=>b.id===(p?.location||building));
    if(!b)return;const v=viewport.current;const map=v.firstElementChild;
    v.scrollTo({left:b.x/100*map.offsetWidth-v.clientWidth/2,top:b.y/100*map.offsetHeight-v.clientHeight/2,behavior:'smooth'});
  },[selected,building,zoom,world]);
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
  return <div className="city-stage-wrap"><div className="stage-toolbar"><span><i/>{replay?'지난 회차 이동 재생 중':'현재 위치 · 마지막 회차 기준'}</span><button onClick={()=>{setRound(n=>n+1);setReplay(true);}} disabled={replay}>{replay?'재생 중…':'▶ 회차 이동 보기'}</button></div><div className="tile-controls" role="group" aria-label="지도 확대"><span>32px TILE WORLD</span>{[['fit','전체'],['1','확대'],['1.5','더 확대']].map(([value,label])=><button key={value} aria-pressed={zoom===value} onClick={()=>setZoom(value)}>{label}</button>)}</div><div className="tile-viewport" ref={viewport} tabIndex="0" aria-label="도시 지도, 확대 후 가로 세로로 스크롤"><div className="city-map visual-map tile-map" style={{width:zoom==='fit'?'100%':`${1024*Number(zoom)}px`}} aria-label="타일로 표시한 주민과 도시 시설">
    <TileGround world={world}/>
    {world.buildings.map(b=><button key={b.id} className={`building ${building===b.id?'selected':''}`} style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={()=>onBuilding(building===b.id?'all':b.id)} aria-label={`${b.name}, 주민 ${world.players.filter(p=>p.location===b.id).length}명`}><BuildingTile id={b.id}/><strong>{b.name}<small>{world.players.filter(p=>p.location===b.id).length}명</small></strong></button>)}
    {replay&&selected!=='all'&&<svg className="follow-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{world.players.filter(p=>p.id===selected).map(p=>{const pos=positions[world.players.indexOf(p)];return <path key={p.id} d={`M${pos[0].x},${pos[0].y} L${pos[1].x},${pos[1].y}`}/>;})}</svg>}
    {displayed.map(p=>{const index=world.players.indexOf(p);return <Resident key={`${p.id}-${round}`} player={p} index={index} position={positions[index]} selected={selected===p.id} onSelect={onSelect} replay={replay} compact={displayed.length>20}/>;})}
    <span className="map-note">주민 클릭 · 확대 후 밀어서 이동</span>
  </div></div><div className="tile-world-status"><span>선반 {world.storageState?.shelf??0}/{world.storageState?.capacity??0} · 당일용 {world.storageState?.day??0}</span><span>{world.fieldState?.label||'밭 상태 관찰 대기'}</span><span>{world.transportState?.label||'운반 시험 전'}</span></div><div className="stage-legend"><span>● 주민 클릭 → 따라보기</span><span>건물 클릭 → 그곳의 이야기</span>{world.players.length>20&&selected==='all'&&building==='all'&&<button onClick={()=>setAllResidents(!allResidents)}>{allResidents?'주요 주민만':'전체 주민 표시'}</button>}</div></div>;
}
