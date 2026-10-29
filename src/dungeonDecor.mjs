import {floorGeometry} from './dungeonMap.mjs';
import {bossProgress,floorUnlocked} from './dungeonRules.mjs';
// Observer navigation overlays, not newly built facilities or produced inventory.
export function dungeonDecor(world,floor){
 const g=floorGeometry(floor);
 const props=[{id:'entry-arrow',tile:0,x:5,y:3},{id:'junction-arrow',tile:0,x:27,y:3},{id:'return-lantern',tile:2,x:3,y:5},{id:'boss-altar',tile:3,x:g.boss.x,y:g.boss.y}];
 if(floor<3&&!floorUnlocked(world,floor+1))props.push({id:'locked-exit',tile:1,x:g.exit.x-1,y:g.exit.y-1});
 return {props,bossDefeated:bossProgress(world,floor).defeated};
}
