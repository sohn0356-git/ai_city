import React,{useEffect,useRef,useState} from 'react';
import {createTileScene,drawTileScene,MAP_WIDTH,MAP_HEIGHT,buildingTile} from './tileScene.mjs';
export default function TileGround({world}){
 const canvas=useRef(null);const [error,setError]=useState(false);
 useEffect(()=>{
  let alive=true;setError(false);const image=new Image();
  image.onload=()=>{if(alive&&canvas.current)drawTileScene(canvas.current.getContext('2d'),image,createTileScene(world));};
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
