import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapProjection,drivingReadout,nearbyCar} from '../dist/race-hud.mjs';
import {createCityCourse} from '../dist/city-course.mjs';
test('the actual circuit keeps one scale on both axes and heading follows world direction',()=>{
 const track=createCityCourse();
 for(const [width,height]of [[240,200],[720,520]]){
  const p=mapProjection(track.bounds,width,height,22),origin=p.point(0,0),x=p.point(10,0),z=p.point(0,10);
  assert.ok(Math.abs((x[0]-origin[0])-(origin[1]-z[1]))<1e-10);
  for(const f of track.frames){const [px,py]=p.point(f.x,f.z);assert.ok(px>=22&&px<=width-22&&py>=22&&py<=height-22);}
  assert.equal(p.heading({heading:0}),0);assert.equal(p.heading({heading:Math.PI/2}),Math.PI/2);
 }
});
test('common readout keeps forward/reverse/neutral consistent with the existing automatic display',()=>{
 assert.equal(drivingReadout({speed:0}).gear,'N');
 assert.equal(drivingReadout({speed:20,forwardSpeed:20}).gear,'2');
 assert.equal(drivingReadout({speed:4,forwardSpeed:-4}).gear,'R');
 assert.equal(drivingReadout({speed:0,driveMode:'reverse'}).mode,'후진');
 for(const speed of [0,1,10,100,NaN]){const r=drivingReadout({speed});assert.ok(Number.isFinite(r.ratio)&&r.ratio>=0&&r.ratio<=1);}
});
test('nearby-car indicators use driver left/right at different headings and omit distant or forward cars',()=>{
 const player={id:'p',x:0,z:0,heading:0};
 assert.equal(nearbyCar(player,[player,{id:'a',x:3,z:0}]).side,'left');
 assert.equal(nearbyCar(player,[{id:'a',x:-3,z:0}]).side,'right');
 assert.equal(nearbyCar(player,[{id:'a',x:0,z:10}]),null);
 player.heading=Math.PI/2;assert.equal(nearbyCar(player,[{id:'a',x:0,z:3}]).side,'right');
});
