import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeRacer,recordProgress,finishRacer,PRIZES,rankOf} from '../dist/race-core.mjs';
const frames=Array.from({length:360},(_,i)=>{const a=i/360*Math.PI*2;return{x:60*Math.cos(a),z:60*Math.sin(a),tx:-Math.sin(a),tz:Math.cos(a),rx:Math.cos(a),rz:Math.sin(a)};});
const track={length:Math.PI*120,frames};
test('start line alone cannot award a lap, reversing subtracts progress',()=>{const r=makeRacer(track);recordProgress(r,track,3);assert.equal(finishRacer(r,track,1),false);recordProgress(r,track,1);assert.ok(Math.abs(r.distance-1)<.01);});
test('ordered full circuit is required, a teleport never completes a race',()=>{const r=makeRacer(track);recordProgress(r,track,track.length/2);assert.equal(r.distance,0);assert.equal(r.gate,0);const good=makeRacer(track);for(let d=1;d<=Math.ceil(track.length);d++)recordProgress(good,track,d%track.length);assert.equal(good.gate,4);assert.equal(finishRacer(good,track,30),true);assert.equal(finishRacer(good,track,31),false);});
test('rank and prize schedule agree with real progress',()=>{const p=makeRacer(track),a=makeRacer(track,{s:10}),b=makeRacer(track,{s:20});assert.equal(rankOf(p,[p,a,b]),3);assert.ok(PRIZES[0]>PRIZES[1]&&PRIZES[1]>PRIZES[2]&&PRIZES[2]>0);});
