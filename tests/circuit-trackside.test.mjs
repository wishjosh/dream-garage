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
import {approachBoards} from '../dist/studies/circuit-elevation/trackside.mjs';
import {DATA} from '../dist/studies/circuit-elevation/data.mjs';
test('T1 distance boards count down to the same reference and clear the road',()=>{
 const track=createCityCourse(),boards=approachBoards(track);
 assert.deepEqual(boards.map(b=>b.distance),[150,100,50]);
 for(const b of boards){
  assert.ok(Math.abs((DATA.corners[0].s-b.s+track.length)%track.length-b.distance)<1e-7);
  assert.ok(nearestTrack(track,b.x,b.z).distance>8.2+b.width/2+.5);
  assert.ok(Number.isFinite(b.heading));assert.ok(b.centreHeight-b.height/2>0);
 }
 assert.deepEqual(approachBoards(track),boards);
});

test('readable boards preserve old reference positions and leave road clearance',()=>{
 const track=createCityCourse(),old=approachBoards(track,'distance'),readable=approachBoards(track,'readable');
 for(let i=0;i<old.length;i++){
  const a=old[i],b=readable[i];
  for(const key of ['distance','s','x','z','heading','centreHeight'])assert.equal(b[key],a[key]);
  assert.ok(b.width>a.width*2);assert.ok(b.height>a.height);
  assert.ok(nearestTrack(track,b.x,b.z).distance>8.2+b.width/2+.5);
  assert.ok(b.centreHeight-b.height/2>0);
 }
 assert.throws(()=>approachBoards(track,'unknown'));
});
import {paintDistanceBoard} from '../dist/studies/circuit-elevation/distance-board.mjs';
test('distance typography fits complete glyph bounds without horizontal squeeze',()=>{
 const draws=[],ctx={fillRect(){},strokeRect(){},fillText(...args){draws.push(args);},measureText(text){const size=Number(this.font.match(/([0-9.]+)px/)[1]);return {actualBoundingBoxLeft:.04*size,actualBoundingBoxRight:(text.length*.6-.04)*size,actualBoundingBoxAscent:.72*size,actualBoundingBoxDescent:.02*size};}};
 const sizes=[];
 for(const text of ['150','100','50']){
  const fit=paintDistanceBoard(ctx,text,1024,768),[value,x,y]=draws.at(-1),m=ctx.measureText(value);
  assert.equal(draws.at(-1).length,3,'no maxWidth squeeze');
  assert.ok(fit.inkWidth<=1024*.88+.001);assert.ok(fit.inkHeight<=768*.8+.001);
  assert.ok(x-m.actualBoundingBoxLeft>=1024*.06-.001);
  assert.ok(x+m.actualBoundingBoxRight<=1024*.94+.001);
  assert.ok(y-m.actualBoundingBoxAscent>=768*.1-.001);assert.ok(y+m.actualBoundingBoxDescent<=768*.9+.001);
  sizes.push(fit.fontSize);
 }
 assert.equal(sizes[0],sizes[1]);assert.equal(sizes[1],sizes[2]);
});
