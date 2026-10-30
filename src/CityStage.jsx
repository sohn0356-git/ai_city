import PlanTimeline from './PlanTimeline';
import BattleReplay from './BattleReplay';
import WalletPanel from './WalletPanel';
import DungeonView from './DungeonView';
import ResidentAvatar from './ResidentAvatar';
import React, { useEffect, useState, useRef } from 'react';
import TileGround, {BuildingTile} from './TileGround';
import {layoutWorld,residentPoint,WIDTH} from './mapLayout.mjs';
import MonsterBook,{MonsterSprite} from './MonsterBook';
import {activityState,DUNGEON} from './activity.mjs';
import BuildingDetails from './BuildingDetails';
import {useMapPinch} from './useMapPinch.mjs';
const colors=['#ba7761','#6f94ad','#8a9c6a','#c19371','#a28ab3','#b49a5d','#7e9a7c','#a47e8e','#8c92b2','#6b9490'];
function Resident({player,index,position,selected,onSelect,replay,compact,activity}) {
  const [from,to]=position;
  const [arrived,setArrived]=useState(!replay);
  useEffect(()=>{
    if(!replay){setArrived(true);return;}
    setArrived(false);
    const timer=setTimeout(()=>setArrived(true),150+index*120);
    return()=>clearTimeout(timer);
  },[replay,index,from.id,to.id]);
  const point=activity||(arrived?to:from);
  const color=colors[index%colors.length];
  return <button className={`map-resident ${selected?'followed':''} ${compact?'compact':''} ${activity?.kind||''}`} style={{left:`${point.x}%`,top:`${point.y}%`,'--resident-color':color,'--walk-duration':replay?'2.6s':activity?'1s':'0s'}} onClick={()=>onSelect(player.id)} aria-label={`${player.name}, ${player.role}, ${player.currentAction}`}>
    <span className="resident-bubble">{activity?.label||player.currentAction}</span>
    <ResidentAvatar id={player.id}/>
    <strong>{player.name}</strong><span className="resident-role">{player.role}</span>
  </button>;
}
export default function CityStage({world,selected,onSelect,building,onBuilding,sceneBefore=false}) {
  world=layoutWorld(world);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const active=!sceneBefore&&world.activityPlans?.length;
  const selectedPlayer=world.players.find(p=>p.id===selected);
  const selectedActivity=active&&selectedPlayer?activityState(selectedPlayer,world,now):null;
  const [zoom,setZoom]=useState('1');
  const viewport=useRef(null);
  const [focusTick,setFocusTick]=useState(0);
  const focusResident=id=>{onSelect(id);setFocusTick(n=>n+1);};
  const [viewWidth,setViewWidth]=useState(768);
  useEffect(()=>{const o=new ResizeObserver(([e])=>setViewWidth(e.contentRect.width));o.observe(viewport.current);return()=>o.disconnect();},[]);
  const scale=zoom==='fit'?viewWidth/WIDTH:Number(zoom);
  const suppressClick=useMapPinch(viewport,setZoom);
  const [place,setPlace]=useState(null);
  const [insideDungeon,setInsideDungeon]=useState(false);
  useEffect(()=>{
    if(zoom==='fit'||!viewport.current)return;
    const p=world.players.find(p=>p.id===selected);const b=world.buildings.find(b=>b.id===(p?.location||building));
    const current=p&&active?activityState(p,world,Date.now()):null;const point=current||b;if(!point)return;const v=viewport.current;const map=v.firstElementChild;
    v.scrollTo({left:point.x/100*map.offsetWidth-v.clientWidth/2,top:point.y/100*map.offsetHeight-v.clientHeight/2,behavior:'smooth'});
  },[selected,building,world.cycle,focusTick]);
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
    return [residentPoint(source,localIndex,peers.length),residentPoint(destination,localIndex,peers.length)];
  });
  const displayed=world.players.filter(p=>{
    if(selected!=='all')return p.id===selected||world.events.some(e=>e.cycle===world.cycle&&((e.actorId===selected&&e.targetId===p.id)||(e.targetId===selected&&e.actorId===p.id)));
    if(building!=='all')return p.location===building;
    return active||allResidents||world.players.indexOf(p)<20;
  });
  return <div className={`city-stage-wrap ${insideDungeon?'view-dungeon':'view-town'}`}><div className="stage-toolbar"><span><i/>{replay?'지난 회차 이동 재생 중':active?'공유 일정 진행 중 · 작업·탐험':'현재 위치 · 마지막 회차 기준'}</span><button onClick={()=>{setRound(n=>n+1);setReplay(true);}} disabled={replay}>{replay?'재생 중…':'▶ 회차 이동 보기'}</button></div><div hidden={insideDungeon}><div className="tile-controls" role="group" aria-label="지도 확대"><span>32px TILE WORLD</span>{[['fit','전체'],['1','산책'],['1.5','가까이']].map(([value,label])=><button key={value} aria-pressed={zoom===value} onClick={()=>setZoom(value)}>{label}</button>)}</div><div className="tile-viewport" ref={viewport} onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();}}} tabIndex="0" aria-label="도시 지도, 확대 후 가로 세로로 스크롤"><div className="map-scale-space" style={{width:WIDTH*scale,height:1152*scale}}><div className="city-map visual-map tile-map" style={{width:WIDTH,height:1152,zoom:scale}} aria-label="타일로 표시한 주민과 도시 시설">
    <TileGround world={world}/><button className="dungeon-gate" style={{left:`${DUNGEON.x}%`,top:`${DUNGEON.y}%`}} onClick={()=>{setPlace(null);setInsideDungeon(true);}}><span className="dungeon-pixel"/><strong>메아리 동굴</strong><small>몬스터 대련 · 안전 귀환</small></button><div className="district-label" style={{left:"9%",top:"4%"}}>농장 지구</div><div className="district-label" style={{left:"43%",top:"4%"}}>시민 광장</div><div className="district-label" style={{left:"74%",top:"4%"}}>기록 지구</div><div className="district-label" style={{left:"42%",top:"56%"}}>시장 지구</div><div className="district-label" style={{left:"74%",top:"57%"}}>정원 지구</div>
    {world.buildings.map(b=><button key={b.id} className={`building ${building===b.id?'selected':''}`} style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={()=>setPlace(b)} aria-label={`${b.name}, 주민 ${world.players.filter(p=>p.location===b.id).length}명`}><BuildingTile id={b.id}/><strong>{b.name}<small>{world.players.filter(p=>p.location===b.id).length}명</small></strong></button>)}
    {replay&&selected!=='all'&&<svg className="follow-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{world.players.filter(p=>p.id===selected).map(p=>{const pos=positions[world.players.indexOf(p)];return <path key={p.id} d={`M${pos[0].x},${pos[0].y} L${pos[1].x},${pos[1].y}`}/>;})}</svg>}
    {displayed.map(p=>{const index=world.players.indexOf(p);return <Resident key={`${p.id}-${round}`} player={p} index={index} position={positions[index]} selected={selected===p.id} onSelect={focusResident} replay={replay} compact={displayed.length>20} activity={active&&!replay?activityState(p,world,now):null}/>;})}
    <span className="map-note">두 손가락 확대·축소 · 건물 터치로 살펴보기</span>
  </div></div></div></div>{insideDungeon&&<div className="dungeon-screen"><button className="town-return" onClick={()=>setInsideDungeon(false)}>← 마을로 돌아가기</button><DungeonView world={world} now={now} selected={selected} onSelect={focusResident}/></div>}{place&&<BuildingDetails place={place} world={world} onSelect={onSelect} onClose={()=>setPlace(null)}/>} {active&&<section className="activity-panel"><b>{selectedPlayer?`${selectedPlayer.name}의 현재 일정`:'모든 주민이 각자의 일정을 진행해요'}</b><p>{selectedActivity?.label||'주민을 선택하면 현재 작업·이동·대련 단계를 확인할 수 있어요.'}</p>{selectedActivity&&<><progress max="1" value={selectedActivity.progress}/><small>공유 시각 기준 · 재접속해도 이어지는 일정</small>{selectedActivity.turn&&<p><MonsterSprite monster={selectedActivity.result.monster} phase={selectedActivity.turn.enemyHp===0?'defeated':selectedActivity.turn.phase}/>{selectedActivity.result.enemy} HP {selectedActivity.turn.enemyHp} · 주민 HP {selectedActivity.turn.hp} · {selectedActivity.turn.turn}턴<br/>예정 결과: {selectedActivity.result.outcome==='victory'?'승리':'귀환'} / {selectedActivity.result.awardXp}XP · {selectedActivity.result.firstKillEligible?'최초 처치 시 정산':'이미 처치한 종류 · 보상 없음'}</p>}</>}<small>전투는 저장된 능력치로 계산한 대련 진행입니다. 보상은 다음 세계 갱신에서 한 번만 확정합니다.</small></section>}<PlanTimeline world={world} selected={selected}/><BattleReplay world={world} selected={selected}/><WalletPanel world={world} selected={selected}/><MonsterBook world={world} selected={selected}/><div className="tile-world-status"><span>선반 {world.storageState?.shelf??0}/{world.storageState?.capacity??0} · 당일용 {world.storageState?.day??0}</span><span>{world.fieldState?.label||'밭 상태 관찰 대기'}</span><span>{world.transportState?.label||'운반 시험 전'}</span></div><div className="stage-legend"><span>● 주민 클릭 → 따라보기</span><span>건물 클릭 → 그곳의 이야기</span>{world.players.length>20&&selected==='all'&&building==='all'&&<button onClick={()=>setAllResidents(!allResidents)}>{allResidents?'주요 주민만':'전체 주민 표시'}</button>}</div></div>;
}
