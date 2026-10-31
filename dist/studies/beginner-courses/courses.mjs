import * as T from '../../vendor/three.module.js';
// Original layouts inspired by the driving tasks discussed in the reference review.
// Shared 16.4m road; no crossings. Existing city landmarks stay outside the road.
export const COURSES=Object.freeze([
 {id:'speed',name:'베이프런트 루프',type:'속도형',tag:'큰 곡선을 부드럽게',description:'긴 직선에서 속도를 올리고, 넓은 곡선에서 조향을 유지해요.',focus:'코너를 빠져나오며 가속하기',points:[[0,0],[0,150],[0,230],[-30,295],[-100,325],[-200,325],[-280,295],[-330,230],[-350,150],[-320,50],[-330,-40],[-300,-120],[-230,-175],[-125,-190],[-50,-160],[-10,-90]],sectors:[[0,'출발 대로','START AVENUE'],[.22,'큰 수변 커브','MARINA SWEEP'],[.48,'완만한 전환','GENTLE ESSES'],[.74,'마지막 곡선','HOME CURVE']]},
 {id:'rhythm',name:'가든 플로우',type:'리듬형',tag:'좌우로 이어지는 리듬',description:'완만한 S자를 연결하며 다음 코너를 미리 바라봐요.',focus:'한 번에 꺾기보다 부드럽게 연결하기',points:[[0,0],[0,130],[-15,205],[-65,260],[-140,280],[-220,250],[-270,185],[-260,115],[-205,60],[-200,-5],[-250,-65],[-275,-125],[-255,-180],[-200,-215],[-145,-220],[-100,-200],[-40,-145],[-10,-75]],sectors:[[0,'출발 직선','START AVENUE'],[.20,'첫 큰 곡선','OPENING SWEEP'],[.40,'가든 S자','GARDEN FLOW'],[.67,'좌우 연결','LINKED CURVES'],[.85,'돌아오는 길','HOME STRETCH']]},
 {id:'braking',name:'마리나 턴',type:'제동형',tag:'줄이고, 돌고, 다시 가속',description:'직선 끝의 넓은 저속 코너에서 브레이크와 재가속을 익혀요.',focus:'코너에 들어가기 전에 속도 줄이기',points:[[0,0],[0,145],[-5,225],[-35,270],[-85,280],[-130,250],[-145,195],[-145,110],[-170,65],[-245,45],[-305,10],[-335,-40],[-320,-95],[-265,-125],[-165,-125],[-110,-155],[-65,-190],[-20,-175],[0,-125],[0,-60]],sectors:[[0,'출발 직선','START AVENUE'],[.20,'첫 감속 코너','BRAKE AND TURN'],[.42,'재가속 구간','CORNER EXIT'],[.62,'마리나 코너','MARINA TURN'],[.83,'마지막 감속','FINAL TURN']]}
]);
export function getCourse(id){return COURSES.find(c=>c.id===id)||COURSES[0];}
export function createCourse(id){
 const def=getCourse(id),curve=new T.CatmullRomCurve3(def.points.map(([x,z])=>new T.Vector3(x,0,z)),true,'catmullrom',.5);
 curve.arcLengthDivisions=2400;curve.updateArcLengths();const length=curve.getLength(),count=Math.ceil(length/2.8);
 const frames=Array.from({length:count},(_,i)=>{const p=curve.getPointAt(i/count),d=curve.getTangentAt(i/count).normalize();return{x:p.x,z:p.z,tx:d.x,tz:d.z,rx:d.z,rz:-d.x,s:i/count*length};});
 const xs=frames.map(f=>f.x),zs=frames.map(f=>f.z);
 return{id:'beginner-'+def.id+'-1',name:def.name,length,frames,bounds:{xmin:Math.min(...xs)-25,xmax:Math.max(...xs)+25,zmin:Math.min(...zs)-25,zmax:Math.max(...zs)+25}};
}
