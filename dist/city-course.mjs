import * as T from './vendor/three.module.js';
export const COURSE_ID='bayfront-long-1';
export const COURSE_NAME='베이프런트 시티 투어';
export const POINTS=[[0,0],[0,180],[0,260],[-70,330],[-180,350],[-280,330],[-310,270],[-285,210],[-250,180],[-290,135],[-380,100],[-430,20],[-430,-150],[-350,-210],[-200,-220],[-75,-170],[-15,-90]];
export const SECTORS=[{at:0,name:'출발 대로',sign:'GRAND AVENUE'},{at:.18,name:'수변 커브',sign:'MARINA CURVE'},{at:.34,name:'도심 코너',sign:'DOWNTOWN'},{at:.46,name:'가든 S자',sign:'GARDEN ESSES'},{at:.63,name:'야경 직선',sign:'SKYLINE RUN'},{at:.83,name:'마지막 코너',sign:'HOME STRETCH'}];
export function createCityCourse(){
 const curve=new T.CatmullRomCurve3(POINTS.map(([x,z])=>new T.Vector3(x,0,z)),true,'catmullrom',.35);
 curve.arcLengthDivisions=2400;curve.updateArcLengths();
 const length=curve.getLength(),count=Math.ceil(length/2.8);
 const frames=Array.from({length:count},(_,i)=>{const p=curve.getPointAt(i/count),d=curve.getTangentAt(i/count).normalize();return{x:p.x,z:p.z,tx:d.x,tz:d.z,rx:d.z,rz:-d.x,s:i/count*length};});
 const xs=frames.map(f=>f.x),zs=frames.map(f=>f.z);
 return{id:COURSE_ID,name:COURSE_NAME,length,frames,bounds:{xmin:Math.min(...xs)-25,xmax:Math.max(...xs)+25,zmin:Math.min(...zs)-25,zmax:Math.max(...zs)+25}};
}
export function courseSector(progress){const p=((progress%1)+1)%1;return [...SECTORS].reverse().find(s=>p>=s.at)||SECTORS[0];}
