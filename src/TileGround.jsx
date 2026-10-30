import React,{useEffect,useRef,useState} from 'react';
import {createTileScene,drawTileScene,MAP_WIDTH,MAP_HEIGHT,buildingTile} from './tileScene.mjs';
export default function TileGround({world}){
 const canvas=useRef(null),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;setError(false);
 const load=name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=`${import.meta.env.BASE_URL}tiles/${name}.png`;});
 const layers=[];
 const add=(file,id,x,y,size=64)=>layers.push({file,id,x,y,size});
 if(world.teachingState)add('invention-v22',0,24,77,48);
 if(world.planState)add('planning-v21',0,84,24,48);
 if(world.cropVisualState){add('crops-v20',2,72,31,48);add('crops-v20',1,76,31,48);}
 if(world.furnitureState){add('furniture-v3',0,24,43);add('furniture-v3',1,85,21);add('furniture-v3',2,13,44);}
 if(world.maintenanceState){add('maintenance-v17',1,21,78,48);add('maintenance-v17',2,25,78,48);}
 if(world.expeditionJournal)add('expedition-v14',0,81,26,48);
 if(world.readingState)add('reading-v9',0,27,43,48);
 if(world.measurementState)add('records-v4',0,85,27,48);
 if(world.handoffState)add('handoff-v5',0,69,71);
 if(world.constructionState){add('construction-v6',world.constructionState.usable?3:world.constructionState.progress>=90?3:0,57,68);if(!world.constructionState.usable)add('construction-v6',2,61,68,40);}
 else if(world.workState)add('work-v2',2,57,68);
 Promise.all([...new Set(['ai-city-v1',...layers.map(l=>l.file)])].map(async name=>[name,await load(name)])).then(entries=>{if(!alive||!canvas.current)return;const images=Object.fromEntries(entries),ctx=canvas.current.getContext('2d');drawTileScene(ctx,images['ai-city-v1'],createTileScene(world));for(const l of layers)ctx.drawImage(images[l.file],l.id%2*32,Math.floor(l.id/2)*32,32,32,l.x/100*MAP_WIDTH-l.size/2,l.y/100*MAP_HEIGHT-l.size/2,l.size,l.size);if(world.constructionState){ctx.font='16px sans-serif';ctx.fillStyle='#263f37';ctx.fillText(world.constructionState.usable?'확장 선반 · 사용 승인':`설치 ${world.constructionState.progress}% · 적재 금지`,MAP_WIDTH*.53,MAP_HEIGHT*.735);}}).catch(()=>{if(alive)setError(true);});
 return()=>{alive=false;};},[world]);
 return <><canvas ref={canvas} className="tile-ground" width={MAP_WIDTH} height={MAP_HEIGHT} aria-hidden="true"/>{error&&<p className="tile-error" role="alert">지도 타일을 불러오지 못했어요. 연결 후 새로고침해 주세요.</p>}</>;
}
export function BuildingTile({id}){const tile=buildingTile[id]??40;return <span className="building-tile" aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}tiles/ai-city-v1.png)`,backgroundPosition:`${tile%8/7*100}% ${Math.floor(tile/8)/7*100}%`}}/>;}
