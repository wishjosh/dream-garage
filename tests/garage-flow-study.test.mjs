import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudyStore,freshStudySave,STUDY_KEY,ART_STUDY_KEY,categoriesFor,itemMarkup} from '../dist/garage-flow-study.mjs';
import {createPreviewSession} from '../dist/garage-preview-core.mjs';
import {itemById} from '../dist/garage-core.mjs';

test('comparison purchases persist independently of the main save and reload',()=>{
 const data=new Map([['hojin-city-gp:save:v1','untouched main save']]);const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const store=createStudyStore(storage),save=store.read(),preview=createPreviewSession();
 assert.equal(save.coins,1000);preview.begin(save,'tavaculo','paint-sunset');assert.equal(save.coins,1000);preview.cancel();assert.equal(save.garage.tavaculo.paint,'paint-stock');
 preview.begin(save,'tavaculo','paint-sunset');assert.equal(preview.confirm(save,'tavaculo').ok,true);
 preview.begin(save,'tavaculo','wheels-gold');assert.equal(preview.confirm(save,'tavaculo').ok,true);store.write(save);
 const otherLayout=createStudyStore(storage).read();assert.equal(otherLayout.coins,350);assert.equal(otherLayout.garage.tavaculo.paint,'paint-sunset');assert.equal(otherLayout.garage.tavaculo.wheels,'wheels-gold');
 preview.begin(otherLayout,'porsche','wheels-gold');assert.equal(preview.confirm(otherLayout,'porsche').purchased,false);assert.equal(otherLayout.coins,350);
 preview.begin(otherLayout,'porsche','engine-gt');assert.equal(preview.confirm(otherLayout,'porsche').ok,false);assert.equal(otherLayout.coins,350);
 store.write(freshStudySave());assert.equal(store.read().coins,1000);assert.equal(store.read().garage.tavaculo.wheels,'wheels-stock');assert.equal(data.get('hojin-city-gp:save:v1'),'untouched main save');assert.equal(data.size,2);assert.ok(data.has(STUDY_KEY));
});
test('blocked or malformed study storage still permits the temporary flow',()=>{
 const store=createStudyStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});assert.equal(store.read().coins,1000);assert.equal(store.write(store.read()),false);
 assert.equal(createStudyStore({getItem:()=>'{bad'}).read().coins,1000);
});
test('external appearance and performance have separate choices',()=>{assert.deepEqual(categoriesFor('customize'),['paint','wheels']);assert.deepEqual(categoriesFor('performance'),['engine','tires','brakes']);});
test('equipped item can restore the current appearance while another item is previewed',()=>{
 const args={item:itemById('paint-stock'),owned:true,equipped:true,active:false};assert.match(itemMarkup({...args,pending:false}),/disabled/);assert.doesNotMatch(itemMarkup({...args,pending:true}),/disabled/);
});

test('art comparison switches keep their wallet while leaving both existing stores unchanged',()=>{
 const data=new Map([['hojin-city-gp:save:v1','real save']]);const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const ui=createStudyStore(storage),art=createStudyStore(storage,ART_STUDY_KEY),old=ui.read();old.coins=777;ui.write(old);
 const save=art.read(),preview=createPreviewSession();preview.begin(save,'tavaculo','paint-blue');assert.equal(preview.confirm(save,'tavaculo').ok,true);art.write(save);
 const before=createStudyStore(storage,ART_STUDY_KEY).read();assert.equal(before.coins,750);assert.equal(before.garage.tavaculo.paint,'paint-blue');
 art.write(freshStudySave());assert.equal(ui.read().coins,777);assert.equal(data.get('hojin-city-gp:save:v1'),'real save');assert.equal(data.size,3);
});
