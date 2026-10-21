import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSave,transact,tuning,CATALOG} from '../dist/garage-core.mjs';
import {RacePhysics,VEHICLES} from '../dist/vehicle-physics.mjs';
import {makeRacer} from '../dist/race-core.mjs';
import fs from 'node:fs';
test('old wallet, records, settings survive garage migration',()=>{
 const old={version:1,coins:2345,best:{tavaculo:44.4},car:'f2002',view:'cockpit',assist:false,auto:true};
 const save=normalizeSave(old);for(const key of Object.keys(old))assert.deepEqual(save[key],old[key]);assert.equal(save.garage.tavaculo.engine,'engine-stock');assert.equal(save.garage.f2002.paint,'paint-stock');
});
test('purchase deducts once, persists ownership, and equips freely on either car',()=>{
 const save=normalizeSave({version:1,coins:650});assert.equal(transact(save,'tavaculo','engine-sprint').purchased,true);assert.equal(save.coins,0);
 assert.equal(transact(save,'tavaculo','engine-stock').ok,true);assert.equal(transact(save,'tavaculo','engine-sprint').purchased,false);
 assert.equal(transact(save,'f2002','engine-sprint').ok,true);assert.equal(save.coins,0);const reloaded=normalizeSave(JSON.parse(JSON.stringify(save)));assert.deepEqual(reloaded,save);assert.equal(tuning(reloaded,'f2002').force,1.18);
});
test('insufficient funds and unknown products leave wallet and equipment intact',()=>{
 const save=normalizeSave({version:1,coins:149}),before=JSON.stringify(save);assert.equal(transact(save,'tavaculo','paint-mint').reason,'funds');assert.equal(transact(save,'bad','paint-mint').reason,'invalid');assert.equal(transact(save,'tavaculo','bad').reason,'invalid');assert.equal(JSON.stringify(save),before);
});
test('a last-place 150 C prize buys first paint without a second currency',()=>{
 const save=normalizeSave({version:1,coins:150});assert.equal(transact(save,'tavaculo','paint-mint').ok,true);assert.equal(save.coins,0);assert.equal(save.garage.tavaculo.paint,'paint-mint');assert.equal(save.garage.f2002.paint,'paint-stock');
});
test('malformed and unowned loadouts fall back safely to stock',()=>{
 const save=normalizeSave({version:1,coins:-30,owned:['nonsense'],garage:{tavaculo:{engine:'engine-gt',paint:'engine-stock'}}});assert.equal(save.coins,0);assert.equal(save.garage.tavaculo.engine,'engine-stock');assert.equal(save.garage.tavaculo.paint,'paint-stock');assert.ok(!save.owned.includes('nonsense'));assert.equal(new Set(CATALOG.map(i=>i.id)).size,CATALOG.length);
});
test('equipped parts change real physics and leave opponents at stock settings',()=>{
 const rigs=JSON.parse(fs.readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
 const frames=Array.from({length:360},(_,i)=>{const a=i/360*Math.PI*2;return{x:60*Math.cos(a),z:60*Math.sin(a),tx:-Math.sin(a),tz:Math.cos(a),rx:Math.cos(a),rz:Math.sin(a)};});const track={length:Math.PI*120,frames};
 const p=new RacePhysics(track,[makeRacer(track),makeRacer(track,{id:'bot0',s:10})],rigs,{barriers:false,playerTuning:{force:1.18,maxSpeed:1.08,grip:1.18,brake:1.2}});
 assert.equal(p.entries[0].config.force,VEHICLES.tavaculo.force*1.18);assert.equal(p.entries[0].config.maxSpeed,VEHICLES.tavaculo.maxSpeed*1.08);assert.equal(p.entries[0].car.wheelInfos[0].frictionSlip,VEHICLES.tavaculo.grip*1.18);assert.equal(p.entries[0].config.brake,VEHICLES.tavaculo.brake*1.2);assert.equal(p.entries[1].config.force,VEHICLES.tavaculo.force);assert.equal(VEHICLES.tavaculo.force,5900);p.dispose();
});
