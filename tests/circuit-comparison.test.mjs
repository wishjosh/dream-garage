import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createComparisonSession} from '../dist/studies/circuit-elevation/comparison-session.mjs';
function host(){const queue=[],events={};return {queue,events,requestAnimationFrame:fn=>queue.push(fn),addEventListener:(kind,fn)=>events[kind]=fn,get localStorage(){throw Error('Comparison must not access saved game');}};}
test('static-host comparison freezes pending frames and resumes once without touching saved game',()=>{
 const h=host(),s=createComparisonSession(h,new URLSearchParams('comparison=1'));let n=0;
 assert.equal(s.enabled,true);s.schedule(()=>n++);s.setFrozen(true);h.queue.shift()(1);assert.equal(n,0);assert.equal(h.queue.length,0);
 s.setFrozen(false);s.setFrozen(false);assert.equal(h.queue.length,1);h.queue.shift()(2);assert.equal(n,1);
});
test('ordinary circuit driving cannot be frozen through the comparison gate',()=>{
 const h=host(),s=createComparisonSession(h,new URLSearchParams());let n=0;
 s.setFrozen(true);s.schedule(()=>n++);h.queue.shift()(1);assert.equal(n,1);assert.equal(s.enabled,false);assert.deepEqual(h.events,{});
});
test('public comparison records resource and promise failures without server-injected globals',()=>{
 const h=host(),s=createComparisonSession(h,new URLSearchParams('comparison=1'));
 h.events.error({target:{src:'vehicle.glb'}});h.events.unhandledrejection({reason:new Error('asset unavailable')});assert.equal(s.errors.length,2);assert.match(s.errors[0],/vehicle.glb/);assert.equal(s.errors[1],'asset unavailable');
});
