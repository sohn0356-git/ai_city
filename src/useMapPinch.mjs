import {useEffect,useRef} from 'react';
export const clampZoom=n=>Math.max(.3,Math.min(2.5,n));
export function pinchFrame(start,distance,center){
 const scale=clampZoom(start.scale*distance/start.distance);
 return {scale,left:start.x*scale-center.x,top:start.y*scale-center.y};
}
export function useMapPinch(viewport,setZoom){
 const suppress=useRef(false);
 useEffect(()=>{
  const v=viewport.current;if(!v)return;let gesture=null,frame;
  const position=e=>{const [a,b]=e.touches,r=v.getBoundingClientRect();return {distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),center:{x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top}};};
  const start=e=>{if(e.touches.length!==2)return;e.preventDefault();const p=position(e),scale=v.firstElementChild.getBoundingClientRect().width/1536;suppress.current=true;gesture={distance:Math.max(1,p.distance),scale,x:(v.scrollLeft+p.center.x)/scale,y:(v.scrollTop+p.center.y)/scale};};
  const move=e=>{if(!gesture||e.touches.length!==2)return;e.preventDefault();const p=position(e),next=pinchFrame(gesture,p.distance,p.center);setZoom(String(next.scale));cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{v.scrollLeft=next.left;v.scrollTop=next.top;});};
  const end=e=>{if(e.touches.length<2)gesture=null;if(e.touches.length===0)setTimeout(()=>{suppress.current=false;},350);};
  v.addEventListener('touchstart',start,{passive:false});v.addEventListener('touchmove',move,{passive:false});v.addEventListener('touchend',end);v.addEventListener('touchcancel',end);
  return()=>{cancelAnimationFrame(frame);v.removeEventListener('touchstart',start);v.removeEventListener('touchmove',move);v.removeEventListener('touchend',end);v.removeEventListener('touchcancel',end);};
 },[viewport,setZoom]);return suppress;
}
