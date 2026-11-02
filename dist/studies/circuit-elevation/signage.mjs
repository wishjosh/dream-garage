import {trackFrame} from '../../race-core.mjs';
import {cornerMarkers} from './trackside.mjs';
import {HOLD_Z} from './pit.mjs';
import {START_X} from './terrain.mjs';
// Game presentation dimensions, not a real circuit signage standard.
const before={corner:{width:3.8,aspect:2.5,height:1.65},entry:{width:6,aspect:2.5,height:2.5},exit:{width:8,aspect:6,height:5.65},signal:{width:7,aspect:4,height:3.5},merge:{width:5,aspect:3,height:1.8}};
const scaled={corner:{width:2,aspect:2.5,height:1.4},entry:{width:1.8,aspect:2.25,height:1.8},exit:{width:4,aspect:6,height:5.65},signal:{width:3.2,aspect:4,height:3.5},merge:{width:2.4,aspect:3,height:1.8}};
export function signageLayout(id='scaled'){if(!['before','scaled'].includes(id))throw Error('Unknown signage layout');return {id,...(id==='before'?before:scaled)};}
export function signageReviewPose(track,layout,id,wide=false){
 let x,z,tx=0,tz=1;
 if(id==='corner'){const m=cornerMarkers(track)[0],f=trackFrame(track,m.s);x=f.x;z=f.z;tx=f.tx;tz=f.tz;}
 else if(id==='entry'){x=layout.centerX;z=160-START_X;}
 else if(id==='exit'){x=layout.centerX;z=HOLD_Z+2.35;}
 else throw Error('Unknown signage review');
 const rx=tz,rz=-tx,car={x:x-tx*7,z:z-tz*7,heading:Math.atan2(tx,tz)};
 // Oblique close view includes the unchanged car and the board; wide view is an approach.
 const back=wide?43:19,side=wide?0:-7;
 return {car,camera:[x-tx*back+rx*side,wide?3.2:3,z-tz*back+rz*side],target:[x+rx*(id==='corner'?6:id==='entry'?4:0),id==='exit'?2.8:1.1,z]};
}
