import React,{useEffect,useRef,useState} from 'react';
import {createTileScene,drawTileScene,MAP_WIDTH,MAP_HEIGHT,buildingTile} from './tileScene.mjs';
export default function TileGround({world}){
 const canvas=useRef(null);const [error,setError]=useState(false);
 useEffect(()=>{
  let alive=true;setError(false);const image=new Image();
  image.onload=()=>{if(alive&&canvas.current){const ctx=canvas.current.getContext('2d');drawTileScene(ctx,image,createTileScene(world));if(world.furnitureState){const furniture=new Image();furniture.onload=()=>{if(alive){ctx.imageSmoothingEnabled=false;const f=world.furnitureState;if(f.table)ctx.drawImage(furniture,0,0,32,32,300,350,64,64);if(f.readingDesk)ctx.drawImage(furniture,32,0,32,32,830,175,64,64);if(f.restBench)ctx.drawImage(furniture,0,32,32,32,200,370,64,64);}};furniture.onerror=()=>{if(alive)setError(true);};furniture.src=`${import.meta.env.BASE_URL}tiles/furniture-v3.png`;}if(world.workState){const work=new Image();work.onload=()=>{if(alive){ctx.imageSmoothingEnabled=false;ctx.drawImage(work,32,0,32,32,620,480,64,64);ctx.globalAlpha=0.35;ctx.drawImage(work,0,32,32,32,370,450,64,64);ctx.globalAlpha=1;ctx.fillStyle="#263f37";ctx.font="14px sans-serif";ctx.fillText("증설 구상 · 미시공",350,525);}};work.src=`${import.meta.env.BASE_URL}tiles/work-v2.png`;}}};
  image.onerror=()=>{if(alive)setError(true);};
  image.src=`${import.meta.env.BASE_URL}tiles/ai-city-v1.png`;
  return()=>{alive=false;};
 },[world]);
 return <><canvas ref={canvas} className="tile-ground" width={MAP_WIDTH} height={MAP_HEIGHT} aria-hidden="true"/>{error&&<p className="tile-error" role="alert">타일 이미지를 불러오지 못했어요. 연결 후 새로고침해 주세요. 주민 선택은 계속 사용할 수 있어요.</p>}</>;
}
export function BuildingTile({id}){
 const tile=buildingTile[id]??40;
 return <span className="building-tile" aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}tiles/ai-city-v1.png)`,backgroundPosition:`${tile%8/7*100}% ${Math.floor(tile/8)/7*100}%`}}/>;
}
