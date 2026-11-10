import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {raceCourse,courseURL} from '../dist/race-courses.mjs';
import {loadCourseRuntime} from '../dist/course-runtime.mjs';
import {makeRacer,trackFrame,nearestTrack,finishRacer} from '../dist/race-core.mjs';
import {surfaceHeight,surfaceTriangles} from '../dist/studies/circuit-elevation/surface-mesh.mjs';
import {terrainHeight} from '../dist/studies/circuit-elevation/terrain.mjs';
const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
for(const key of ['circuit','speed'])test(key+' recovery preserves the last raced point and the physical finish line',async()=>{
 const course=raceCourse(key),track=course.create(),runtime=await loadCourseRuntime(course),r=makeRacer(track),p=runtime.createPhysics(track,[r],rigs,{}),e=p.entries[0];
 const at=(s,lateral=0)=>{const f=trackFrame(track,s);Object.assign(e.s,{x:f.x+f.rx*lateral,z:f.z+f.rz*lateral});p.sync(e,true);};
 try{
  for(let s=1;s<=100;s++)at(s);
  const before={s:r.s,distance:r.distance};
  at(155,30);at(155);
  assert.equal(r.missedRoute,true);assert.equal(r.s,before.s);assert.equal(r.distance,before.distance);
  assert.equal(p.recover(r),true);assert.equal(r.missedRoute,false);
  assert.ok(Math.abs(nearestTrack(track,r.x,r.z).s-before.s)<.02);
  assert.equal(r.distance,before.distance);
  for(let s=101;s<track.length-1;s++)at(s);
  assert.equal(finishRacer(r,track,100),false);
  at(track.length-.1);assert.equal(finishRacer(r,track,100),false);
  at(track.length+.1);assert.equal(finishRacer(r,track,101),true);
  assert.ok(nearestTrack(track,r.x,r.z).s<.2);
 }finally{p.dispose();}
});
for(const key of ['circuit','speed'])test(key+' finished opponents keep clearing the finish line',async()=>{
 const course=raceCourse(key),track=course.create(),runtime=await loadCourseRuntime(course);
 const player=makeRacer(track,{s:track.length*.5}),bot=makeRacer(track,{id:'bot',s:10,lane:2.3});bot.finished=true;
 const p=runtime.createPhysics(track,[player,bot],rigs,{}),start={x:bot.x,z:bot.z};
 try{for(let i=0;i<4*60;i++)p.step(1/60,{brake:true});assert.ok(Math.hypot(bot.x-start.x,bot.z-start.z)>20);assert.equal(bot.finished,true);}finally{p.dispose();}
});
test('overlapping ground triangles retain the road layer through the whole hill',()=>{
 const points=[{x:-450,z:-300},{x:100,z:-300},{x:100,z:650},{x:-450,z:650}];
 for(const index of [[0,1,2,0,2,3],[0,1,3,1,2,3]]){
  const tris=surfaceTriangles(points,index);
  for(let i=0;i<tris.length;i+=3){const [a,b,c]=tris.slice(i,i+3);
   for(const weights of [[1/3,1/3,1/3],[.1,.3,.6]]){
    const x=a.x*weights[0]+b.x*weights[1]+c.x*weights[2];
    const y=surfaceHeight(a.x)*weights[0]+surfaceHeight(b.x)*weights[1]+surfaceHeight(c.x)*weights[2];
    assert.ok(Math.abs(y-surfaceHeight(x))<1e-10);
    assert.ok(y+.0435<surfaceHeight(x)+.045);
   }
  }
 }
 let error=0;for(let x=-600;x<100;x+=.17)error=Math.max(error,Math.abs(surfaceHeight(x)-terrainHeight(x)));
 assert.ok(error<.005,'rendered support stays within 5 mm of the physical surface: '+error);
});
test('course changes return to race preparation without making ordinary garage links start a race',()=>{
 const href='https://example.test/dream-garage/?study=garage-art&look=daylight';
 const url=new URL(courseURL(href,'circuit',{screen:'race'}));
 assert.equal(url.searchParams.get('garage'),'1');assert.equal(url.searchParams.get('screen'),'race');
 assert.equal(url.searchParams.get('study'),'garage-art');assert.equal(url.searchParams.get('look'),'daylight');
 assert.equal(new URL(courseURL(url.href,'speed')).searchParams.has('screen'),false);
});
