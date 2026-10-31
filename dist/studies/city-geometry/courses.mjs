import {ALIGNMENT,LENGTH} from './alignment.mjs';
export const COURSES=Object.freeze([{id:'city-geometry',name:'시티 투어',type:'코너 연결',tag:'곡률을 따라 부드럽게',description:'넓은 첫 코너에서 감속하고, 가운데 반대 방향 코너를 연결한 뒤 큰 곡선을 따라 돌아와요.',sectors:[[0,'출발 대로','CITY TOUR'],[.09,'첫 감속','C1 / BRAKE'],[.32,'반대 방향 코너','C3 / CHANGE DIRECTION'],[.58,'큰 복귀 곡선','C5 / HOME SWEEP']]}]);
export const getCourse=()=>COURSES[0];
export function createCourse(){
 const n=Math.ceil(LENGTH/2.5);let j=0;
 const frames=Array.from({length:n},(_,i)=>{const s=i/n*LENGTH;while(j+1<ALIGNMENT.length&&ALIGNMENT[j+1][0]<=s)j++;const a=ALIGNMENT[j],b=ALIGNMENT[(j+1)%ALIGNMENT.length],end=j+1===ALIGNMENT.length?LENGTH:b[0],t=(s-a[0])/(end-a[0]),h=a[3]+Math.atan2(Math.sin(b[3]-a[3]),Math.cos(b[3]-a[3]))*t;
 const x=-(a[2]+(b[2]-a[2])*t),z=a[1]+(b[1]-a[1])*t-299.438,tx=-Math.sin(h),tz=Math.cos(h);return{x,z,tx,tz,rx:tz,rz:-tx,s};});
 return{id:'city-geometry-1',name:'시티 투어',length:LENGTH,frames,bounds:{xmin:-485,xmax:25,zmin:-325,zmax:325}};
}
