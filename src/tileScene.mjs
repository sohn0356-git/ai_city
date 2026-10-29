// All IDs refer to the original 32px atlas. World data is read, never modified.
export const TILE=32, MAP_WIDTH=1536, MAP_HEIGHT=1152;
export const buildingTile={hall:46,cafe:42,studio:47,garden:51,market:44,lab:41,farm:28,library:43};
export function createTileScene(world){
 const terrain=[];const props=[];
 for(let y=0;y<36;y++)for(let x=0;x<48;x++){
  // Stable decoration, independent of simulation time and random numbers.
  let tile=(x*13+y*7)%43===0?1:0;
  if(y===18)tile=17;
  if(x===23)tile=16;
  if(x===23&&y===18)tile=18;
  if(y>=34)tile=y===34?10:8;
  terrain.push({tile,x:x*TILE,y:y*TILE,size:TILE});
 }
 for(const b of world.buildings){
  const x=Math.min(46,Math.max(1,Math.round(b.x/100*48))),y=Math.min(32,Math.max(1,Math.round(b.y/100*36)));
  for(let row=Math.min(y+1,18);row<=Math.max(y+1,18);row++)terrain.push({tile:16,x:x*TILE,y:row*TILE,size:TILE});
 }
 for(const [x,y,tile] of [[1,11,48],[3,18,49],[6,2,48],[17,2,49],[21,4,50],[28,10,48],[29,19,49],[18,19,48],[9,17,50],[3,4,51],[27,2,49]])props.push({tile,x:x*TILE,y:y*TILE,size:48,kind:'decoration'});
 const place=(tile,x,y,size=48,kind='facility')=>props.push({tile,x:x/100*MAP_WIDTH-size/2,y:y/100*MAP_HEIGHT-size/2,size,kind});
 const rack=world.projects.find(p=>p.id==='storage-rack');
 if(rack)place(rack.progress===100?32:34,41,68,64,'rack');
 if(rack?.progress===100){const n=world.storageState?.shelf??0;for(let i=0;i<n;i++)place(35,40+i%4*3.5,81+Math.floor(i/4)*3.5,28,'shelf-stock');}
 for(let i=0;i<(world.storageState?.day??0);i++)place(35,57+i*4,81,32,'day-stock');
 if(world.cycle>=2){place(57,49,23,40,'ramp');place(29,85,69,44,'barrel');place(52,24,43,48,'table');}
 if(world.projects.some(p=>p.id==='water-bike'))place(55,23,72,48,'bike');
 if(world.cycle>=9)place(56,69,71,40,'relay');
 // A recovered flag means partial recovery only; keep dry plots visible.
 for(let row=0;row<2;row++)for(let col=0;col<4;col++)place(world.fieldState?.recovered&&col<3?26:27,12+col*3.3,18+row*4.4,32,'crop');
 return {terrain,props};
}
export function drawTileScene(ctx,image,scene){
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,MAP_WIDTH,MAP_HEIGHT);
 for(const item of [...scene.terrain,...scene.props])ctx.drawImage(image,item.tile%8*TILE,Math.floor(item.tile/8)*TILE,TILE,TILE,item.x,item.y,item.size,item.size);
}
