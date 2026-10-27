import React, {useState} from 'react';
import CityStage from './CityStage';
export default function ComparisonStage(props){
 const [before,setBefore]=useState(false);
 const changes=props.world.sceneChanges;
 if(!changes)return <CityStage {...props}/>;
 const view=before?{...props.world,players:changes.playersBefore||props.world.players.map(p=>({...p,location:p.previousLocation||p.location,currentAction:`이전 회차 위치 · ${p.name}`,previousLocation:p.previousLocation||p.location})),projects:changes.projectsBefore||props.world.projects,events:[],cycle:changes.fromCycle}:props.world;
 return <section className="comparison-stage"><div className="comparison-controls"><div><small>직접 바꿔서 확인하세요</small><h3>{before?(changes.beforeTitle||'이전 회차'):(changes.afterTitle||'이번 회차의 변화')}</h3></div><div className="phase-buttons" role="group" aria-label="회차 비교"><button aria-pressed={before} onClick={()=>setBefore(true)}>{changes.fromCycle}회차 · 이전</button><button aria-pressed={!before} onClick={()=>setBefore(false)}>{changes.toCycle}회차 · 이후</button></div></div><div className="scene-counters"><span>식재료 <b>{before?changes.foodBefore:props.world.metrics.food}</b>묶음</span><span>공동 재료 <b>{before?changes.materialsBefore:props.world.metrics.materials}</b>개</span><span>{before?(changes.beforeStatus||'이전 상태'):(changes.afterStatus||'현재 상태')}</span></div><div className={`scene-view ${before?'before':'after'}`}><CityStage {...props} world={view} sceneBefore={before}/></div><div className="change-chips">{changes.items.map(item=><button key={item.location} onClick={()=>props.onBuilding(item.location)}><b>{item.title}</b><span>{before?item.before:item.after}</span><small>지도에서 보기 ↗</small></button>)}</div><p className="comparison-caption">저장된 두 회차를 비교합니다. 전환 버튼은 세계를 변경하지 않아요.</p></section>;
}
