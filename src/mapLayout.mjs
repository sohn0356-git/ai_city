export const WIDTH=1536,HEIGHT=1152;
const anchors={farm:[18,18],hall:[49,18],library:[80,18],cafe:[19,45],studio:[80,44],lab:[18,72],market:[49,70],garden:[80,71]};
export function layoutWorld(world){return {...world,buildings:world.buildings.map(b=>({...b,x:anchors[b.id]?.[0]??b.x,y:anchors[b.id]?.[1]??b.y}))};}
export function residentPoint(building,index,count){const cols=Math.min(count,4);return {id:building.id,x:building.x+(index%cols-(cols-1)/2)*4.4,y:building.y+9+Math.floor(index/4)*6};}
