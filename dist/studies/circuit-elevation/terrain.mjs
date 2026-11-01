import {DATA} from './data.mjs';
import {clamp} from '../../race-core.mjs';
export const START_X=DATA.campus.start[0],ROAD_Y=.045;
export const worldPoint=([x,y])=>({x:-y,z:x-START_X});
export const campusPoint=(x,z)=>[z+START_X,-x];
export function terrainHeight(x,z=0){const t=clamp((-x-DATA.terrain.yStart)/(DATA.terrain.yEnd-DATA.terrain.yStart),0,1);return DATA.terrain.rise*t*t*t*(10+t*(-15+6*t));}
export function terrainGradient(x,z=0){const span=DATA.terrain.yEnd-DATA.terrain.yStart,t=clamp((-x-DATA.terrain.yStart)/span,0,1);return {x:-DATA.terrain.rise/span*30*t*t*(1-t)*(1-t),z:0};}
export function inside(poly,x,z){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
export const RUNOFF=DATA.campus.outer.map(worldPoint).concat([...DATA.campus.inner].reverse().map(worldPoint));
export const FANS=DATA.corners.map(c=>c.fan.map(worldPoint));
export const SITE=DATA.campus.site.map(worldPoint);
export const inRunoff=(x,z)=>inside(RUNOFF,x,z)||FANS.some(p=>inside(p,x,z));
