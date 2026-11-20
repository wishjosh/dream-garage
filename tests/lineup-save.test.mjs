import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LOADOUT,normalizeSave,transact} from '../dist/garage-core.mjs';
import {createTransfer,parseTransfer,validateSave} from '../dist/save-transfer.mjs';
import {LINEUP} from '../dist/lineup-shapes.mjs';
import {opponentCars} from '../dist/main-vehicles.mjs';

test('a previous three-car garage upgrades without changing purchases, course records or selection',()=>{
  const old=normalizeSave({version:1,car:'porsche',coins:900});
  old.courseBest['geometry-braking-1']={porsche:103.5};
  for(const id of Object.keys(LINEUP))delete old.garage[id];
  const next=validateSave(old);
  assert.deepEqual(next.courseBest,old.courseBest);
  assert.equal(next.coins,900);assert.equal(next.car,'porsche');
  for(const id of Object.keys(LINEUP))assert.deepEqual(next.garage[id],DEFAULT_LOADOUT);
});

test('the two new cars can race and save independent finishes and loadouts',()=>{
  const save=normalizeSave({version:1,coins:1000});
  for(const [id,paint] of [['rally-hatch','paint-mint'],['muscle-coupe','paint-sunset']]){
    save.car=id;assert(transact(save,id,paint).ok);
    save.best[id]=101.4;
    const next=parseTransfer(createTransfer(save)).save;
    assert.equal(next.car,id);assert.deepEqual(next.garage,save.garage);
    assert.equal(next.best[id],101.4);
    assert.equal(new Set([id,...opponentCars(id)]).size,4);
    delete next.garage[id];
    assert.throws(()=>validateSave(next),e=>e.code==='invalid_save');
  }
  assert.equal(save.coins,600);assert.deepEqual(save.garage.tavaculo,DEFAULT_LOADOUT);
});
