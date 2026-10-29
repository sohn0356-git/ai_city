import React,{useRef,useEffect,useState} from 'react';
import {caveTile,CAVE_WIDTH,CAVE_HEIGHT} from './dungeonMap.mjs';
import {dungeonDecor} from './dungeonDecor.mjs';
export default function DungeonGround({floor,world}){const canvas=useRef(null),[error,setError]=useState(false);useEffect(()=>{let alive=true;setError(false);
 const load=file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=`${import.meta.env.BASE_URL}tiles/${file}`;});
 Promise.all([load('dungeon-v15.png'),load('wayfinding-v18.png'),load('survey-v19.png')]).then(([im,decor,survey])=>{if(!alive)return;const c=canvas.current.getContext('2d');c.clearRect(0,0,CAVE_WIDTH,CAVE_HEIGHT);c.imageSmoothingEnabled=false;
 for(let y=0;y<36;y++)for(let x=0;x<48;x++){const tile=caveTile(floor,x,y);c.drawImage(im,tile%4*32,Math.floor(tile/4)*32,32,32,x*32,y*32,32,32);}
 for(const p of dungeonDecor(world,floor).props)c.drawImage(decor,p.tile%2*32,Math.floor(p.tile/2)*32,32,32,p.x*32,p.y*32,32,32);
 if(floor===2&&world.surveyState){c.drawImage(survey,0,32,32,32,8*32,12*32,32,32);c.fillStyle='#fff4d7';c.font='16px sans-serif';c.fillText('지도 검토 지점 · 치수 미측정',8*32,12*32-8);}
 c.fillStyle='#ffedb8';c.font='bold 20px sans-serif';c.fillText(floor===1?'등불 회랑':floor===2?'이끼 저수굴':'수정 중심실 · 미개방 시안',70,40);
 }).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[floor,world]);return <><canvas className="dungeon-ground" ref={canvas} width={CAVE_WIDTH} height={CAVE_HEIGHT} aria-hidden="true"/>{error&&<p role="alert">동굴 타일 로드 실패 · 연결 후 다시 열어 주세요.</p>}</>;}
