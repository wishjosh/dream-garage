import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {artReviewPose,backdropHeight,groundTint,DAYLIGHT} from '../dist/studies/circuit-elevation/daylight.mjs';
import {createCityCourse} from '../dist/studies/circuit-elevation/course.mjs';
import {nearestTrack} from '../dist/race-core.mjs';

test('art comparison poses keep the car on the original course and use a fixed camera',()=>{
 const track=createCityCourse();for(const id of ['start','pit','corner']){const p=artReviewPose(track,id);assert.ok(nearestTrack(track,p.car.x,p.car.z).distance<.01);assert.equal(p.fov,62);assert.deepEqual(p,artReviewPose(track,id));assert.ok(Math.hypot(p.camera[0]-p.car.x,p.camera[2]-p.car.z)>10);}
 assert.throws(()=>artReviewPose(track,'unknown'));
});
test('remote landscape joins the unchanged flat apron continuously',()=>{
 for(const x of [-940,550])for(const z of [-769,911]){assert.equal(backdropHeight(0,x,z),0);assert.ok(Math.abs(backdropHeight(.001,x,z))<1e-7);for(const c of groundTint(x,z,true))assert.ok(c>=0&&c<=1);}
});
test('self-hosted daylight sky matches the attributed original',()=>{
 const data=readFileSync(new URL('../dist/studies/circuit-elevation/assets/kloofendal_48d_partly_cloudy_1k.hdr',import.meta.url));assert.equal(data.length,DAYLIGHT.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),'5477b7dbb2aea4a6947cb36b96339c119f90bf36a03b039af3254b5e6a22896d');
});
