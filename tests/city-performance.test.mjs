import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrameMeasure,formatMeasure} from '../dist/studies/city-geometry/performance.mjs';
const meta={active:true,car:'tavaculo',view:'chase',width:874,height:402,ratio:1.5,speed:10};
test('unclamped visible game intervals include stalls, excluding pause and warmup',()=>{
 const m=createFrameMeasure();m.tick(0,meta);m.tick(1000,meta);m.tick(1016,meta);m.tick(1216,meta);
 let r=m.report()[0];assert.equal(r.frames,2);assert.equal(r.slow,1);assert.equal(r.p95,200);
 m.tick(1300,{...meta,active:false});m.tick(50000,meta);m.tick(51000,meta);m.tick(51016,meta);r=m.report()[0];assert.equal(r.frames,3);assert.equal(r.p95,200);
});
test('context changes are separate and stationary samples do not count as moving',()=>{
 const m=createFrameMeasure();m.tick(0,meta);m.tick(1000,meta);m.tick(1020,{...meta,speed:0});m.tick(1030,{...meta,view:'cockpit'});m.tick(2030,{...meta,view:'cockpit'});m.tick(2046,{...meta,view:'cockpit'});
 const rows=m.report();assert.equal(rows.length,2);assert.equal(rows[0].movingSeconds,0);assert.equal(rows[0].seconds,.02);assert.match(formatMeasure(rows,'test-device'),/test-device/);
});
