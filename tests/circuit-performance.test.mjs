import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrameMeasure,formatMeasure} from '../dist/studies/circuit-elevation/performance.mjs';
const meta={active:true,visible:true,focused:true,car:'tavaculo',view:'cockpit',width:874,height:402,ratio:1,speed:10};
test('focus transitions isolate measurements without absorbing the transition gap',()=>{
 const m=createFrameMeasure();m.tick(0,meta);m.tick(1000,meta);m.tick(1016,meta);
 const blurred={...meta,focused:false};m.tick(9000,blurred);m.tick(10000,blurred);m.tick(11000,blurred);
 m.tick(20000,meta);m.tick(21000,meta);m.tick(21016,meta);
 const [focused,unfocused]=m.report();assert.equal(focused.frames,2);assert.equal(focused.p95,16);assert.equal(focused.focused,true);
 assert.equal(unfocused.frames,1);assert.equal(unfocused.p95,1000);assert.equal(unfocused.focused,false);
 const text=formatMeasure(m.report(),'test');assert.match(text,/초점 있음/);assert.match(text,/초점 없음/);assert.match(text,/1000.0ms/);
});
test('hidden and paused intervals are excluded while a focused stall remains measurable',()=>{
 const m=createFrameMeasure();m.tick(0,meta);m.tick(1000,meta);m.tick(2000,meta);
 m.tick(2100,{...meta,visible:false});m.tick(60000,meta);m.tick(61000,meta);m.tick(61020,meta);
 m.tick(62000,{...meta,active:false});m.tick(90000,meta);m.tick(91000,meta);m.tick(91020,{...meta,speed:0});
 const row=m.report()[0];assert.equal(row.frames,3);assert.equal(row.p95,1000);assert.equal(row.movingSeconds,1.02);assert.equal(row.seconds,1.04);
});
