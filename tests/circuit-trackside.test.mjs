import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cornerMarkers,pitSignal,SURFACE} from '../dist/studies/circuit-elevation/trackside.mjs';
import {createCityCourse} from '../dist/studies/circuit-elevation/course.mjs';
import {nearestTrack} from '../dist/race-core.mjs';
import {HOLD_Z} from '../dist/studies/circuit-elevation/pit.mjs';
test('nine corner boards distinguish the two left bends and stay outside the driving surface',()=>{
 const t=createCityCourse(),markers=cornerMarkers(t);assert.equal(markers.length,9);
 assert.deepEqual(markers.filter(m=>m.direction==='left').map(m=>m.number),[4,6]);
 for(const m of markers){assert.ok(nearestTrack(t,m.x,m.z).distance>8.2+1);assert.ok(Number.isFinite(m.heading));assert.ok(m.label.includes(m.direction==='left'?'←':'→'));}
});
test('a clear prediction cannot show GO before the mandatory stop releases the car',()=>{
 const player={z:HOLD_Z,pit:{active:true,released:false}};
 for(const clear of [false,true]){const s=pitSignal(player,{clear});assert.equal(s.state,'wait');assert.notEqual(s.label,'GO →');}
 const go=pitSignal({...player,pit:{active:true,released:true}},{clear:false});assert.equal(go.state,'go');assert.match(go.advice,/합류/);
 assert.equal(pitSignal(null,null).state,'idle');assert.equal(pitSignal({...player,z:HOLD_Z-30},null).state,'approach');
});
test('access paving and its markings clear the terrain display layer',()=>{
 assert.ok(SURFACE.access-SURFACE.grass>.04);assert.ok(SURFACE.apron>SURFACE.access);assert.ok(SURFACE.marking>SURFACE.apron);
});
