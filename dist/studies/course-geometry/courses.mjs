import {ALIGNMENTS} from './alignment.mjs';
export const COURSES=Object.freeze([
 {id:'speed',name:'스피드 링',type:'속도형',tag:'큰 곡선에서 속도를 유지해요',description:'긴 직선 뒤 큰 곡선과 넓은 S를 연결해요. 미리 감속하고 일정한 조향을 유지해 보세요.',sectors:[[0,'출발 직선','SPEED RING'],[.18,'큰 곡선','WIDE CORNER'],[.40,'넓은 S','HOLD THE LINE'],[.74,'복귀 곡선','HOME SWEEP']]},
 {id:'rhythm',name:'리듬 링크',type:'리듬형',tag:'중속에서 좌우를 연결해요',description:'중속 코너 사이에서 조향을 풀고 반대 방향을 준비해요. 급한 드래그보다 다음 코너를 바라보세요.',sectors:[[0,'출발 직선','RHYTHM LINK'],[.12,'첫 좌우 연결','CHANGE DIRECTION'],[.46,'중속 코너','FIND THE RHYTHM'],[.55,'다음 전환','LOOK AHEAD']]},
 {id:'braking',name:'브레이크 루프',type:'제동형',tag:'감속하고 다시 가속해요',description:'두 저속 구간을 향해 충분히 감속해요. 이어지는 코너를 빠져나온 뒤 다시 가속해 보세요.',sectors:[[0,'출발 직선','BRAKE LOOP'],[.24,'첫 저속 구간','BRAKE / CONNECT'],[.45,'두 번째 저속 구간','BRAKE / EXIT'],[.65,'재가속 직선','BUILD SPEED']]}
]);
export const getCourse=id=>COURSES.find(c=>c.id===id)||COURSES[0];
export function createCourse(id='speed'){
 const meta=getCourse(id),{rows:a,length}=ALIGNMENTS[meta.id],n=Math.ceil(length/2.5);let j=0;
 const x0=a[0][2],z0=a[0][1];
 const frames=Array.from({length:n},(_,i)=>{const s=i/n*length;while(j+1<a.length&&a[j+1][0]<=s)j++;const p=a[j],q=a[(j+1)%a.length],end=j+1===a.length?length:q[0],t=(s-p[0])/(end-p[0]),h=p[3]+Math.atan2(Math.sin(q[3]-p[3]),Math.cos(q[3]-p[3]))*t;
 const x=-(p[2]+(q[2]-p[2])*t-x0),z=p[1]+(q[1]-p[1])*t-z0,tx=-Math.sin(h),tz=Math.cos(h);return{x,z,tx,tz,rx:tz,rz:-tx,s};});
 const bounds={xmin:Math.min(...frames.map(f=>f.x))-25,xmax:Math.max(...frames.map(f=>f.x))+25,zmin:Math.min(...frames.map(f=>f.z))-25,zmax:Math.max(...frames.map(f=>f.z))+25};
 return{id:'geometry-'+meta.id+'-1',name:meta.name,length,frames,bounds};
}
