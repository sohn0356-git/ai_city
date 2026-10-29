export const CAVE_COLS=48,CAVE_ROWS=36,CAVE_WIDTH=1536,CAVE_HEIGHT=1152;
export function floorGeometry(f){const [cols,rows]=f===2?[56,40]:f===3?[44,44]:[48,36];return {cols,rows,width:cols*32,height:rows*32,exit:{x:cols-4,y:rows-4},boss:{x:cols-8,y:rows-7}};}
export function caveTile(f,x,y){
 const g=floorGeometry(f),ex=g.exit.x,ey=g.exit.y;
 if(x<=0||y<=0||x>=g.cols-1||y>=g.rows-1)return 1;
 if(x===ex&&y===ey)return 7;
 if(y===g.boss.y&&x>=g.boss.x&&x<=ex)return 0;
 if((y===3&&x>=2&&x<=ex)||(x===ex&&y>=3&&y<=ey))return 0;
 if(x>=ex-2&&x<=ex+1&&y>=ey-2&&y<=ey+1)return x===ex&&y===ey?7:0;
 if(f===3&&x>5&&y>5&&Math.abs(x-g.cols/2)+Math.abs(y-g.rows/2)>27)return 1;

 
 
 
 if(x<5&&y<5)return x===2&&y===2?7:0;
 if(f===1){if((x===15||x===31)&&y%12>3)return 1;if((y===11||y===24)&&x%16>5)return 1;if(x%12===7&&y%10===5)return 5;return 0;}
 if(f===2){if(y>=14&&y<=18)return (x>=8&&x<=10)||(x>=35&&x<=37)?4:3;if(x>=21&&x<=25&&y>=5&&y<=10)return 3;return 2;}
 if((x-24)**2+(y-18)**2<20)return 6;if((x===12||x===36)&&y>7&&y<29&&y%10>2)return 1;return (x+y)%17===0?6:0;
}
export function walkable(f,x,y){const g=floorGeometry(f);return x>0&&y>0&&x<g.cols-1&&y<g.rows-1&&![1,3,6].includes(caveTile(f,x,y));}
export function caveResidentPoint(id){const n=Number(id.slice(1))-1;return {x:3+n%5*2,y:3+Math.floor(n/5)*2};}
// Seeded adjacent-step wandering: all observers see the same position at the same UTC time.
const paths=new Map();
export function roamPoint(f,index,now){const key=f+':'+index;if(!paths.has(key)){let seed=f*1031+index*317+17,x=6+index%4*10,y=f===2?22+index%3*3:5+index%5*5;while(!walkable(f,x,y)){x++;if(x>45){x=2;y=2;}}const points=[{x,y}];for(let i=0;i<160;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const dirs=[[1,0],[0,1],[-1,0],[0,-1]],d=dirs[(seed>>>16)%4];if(walkable(f,x+d[0],y+d[1])){x+=d[0];y+=d[1];}points.push({x,y});}paths.set(key,[...points,...points.slice(1,-1).reverse()]);}const p=paths.get(key),time=now/3000,step=Math.floor(time)%p.length,a=p[step],b=p[(step+1)%p.length],t=time-Math.floor(time);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
