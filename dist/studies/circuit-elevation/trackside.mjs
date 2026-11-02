import {trackFrame,mod} from '../../race-core.mjs';
import {DATA} from './data.mjs';
import {HOLD_Z} from './pit.mjs';
// Display layers; keep access paving clear of independently triangulated grass.
export const SURFACE={grass:.042,runoff:.0435,road:.045,pit:.044,access:.085,apron:.09,marking:.115};
export function cornerMarkers(track){
 return DATA.corners.map(c=>{
  const before=trackFrame(track,c.s-24),after=trackFrame(track,c.s+24);
  const turn=before.tx*after.tz-before.tz*after.tx;
  const direction=turn>0?'right':'left',side=turn>0?1:-1;
  const s=mod(c.s-55,track.length),f=trackFrame(track,s);
  return {number:c.number,direction,s,x:f.x+f.rx*side*12,z:f.z+f.rz*side*12,
   heading:Math.atan2(f.tx,f.tz)+Math.PI,label:`T${c.number} ${direction==='right'?'→':'←'}`};
 });
}
export function pitSignal(player,merge){
 if(!player?.pit?.active)return{state:'idle',label:'PIT 50',color:'#a7b7bd',advice:''};
 if(player.pit.released)return{state:'go',label:'GO →',color:'#62d7b0',advice:'피트 50 · 안내선을 따라 합류'};
 const near=HOLD_Z-player.z<3;
 return {state:near?'wait':'approach',label:near?'WAIT':'STOP 50',color:'#efb54e',
  advice:near?(merge?.clear?'정지 확인 중 · 출발 신호를 기다려요':merge?.reason==='교통 예측 불가'?'본선 교통 확인 중 · 대기':'본선 차량 통과 대기'):'피트 50 · 흰 대기선 앞에서 정지'};
}

// Pilot: distances along the centreline to the existing T1 reference, not brake commands.
export function approachBoards(track){
 const corner=DATA.corners[0],direction=cornerMarkers(track)[0].direction;
 return [150,100,50].map(distance=>{
  const s=mod(corner.s-distance,track.length),f=trackFrame(track,s),side=direction==='right'?-1:1;
  return {corner:1,distance,s,x:f.x+f.rx*side*10.5,z:f.z+f.rz*side*10.5,
   heading:Math.atan2(f.tx,f.tz)+Math.PI,width:1,height:1.25,centreHeight:1.2};
 });
}
