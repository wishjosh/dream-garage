import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoSave,createPreviewSession} from '../dist/studies/garage-preview/preview-core.mjs';

test('preview and cancel never change money, ownership or equipped parts',()=>{
 const save=createDemoSave(),before=structuredClone(save),p=createPreviewSession();
 assert.equal(p.begin(save,'tavaculo','paint-blue').ok,true);
 assert.equal(p.loadout(save,'tavaculo').paint,'paint-blue');assert.equal(save.garage.tavaculo.paint,'paint-stock');
 assert.equal(p.quote(save).after,450);assert.deepEqual(save,before);
 p.cancel();assert.deepEqual(p.loadout(save,'tavaculo'),before.garage.tavaculo);assert.deepEqual(save,before);
});
test('confirmation charges once, equips selected item and leaves the other car intact',()=>{
 const save=createDemoSave(),other=structuredClone(save.garage.f2002),p=createPreviewSession();p.begin(save,'tavaculo','paint-blue');
 assert.equal(p.confirm(save,'tavaculo').purchased,true);assert.equal(save.coins,450);assert.ok(save.owned.includes('paint-blue'));assert.equal(save.garage.tavaculo.paint,'paint-blue');
 const after=structuredClone(save);assert.equal(p.confirm(save,'tavaculo').ok,false);assert.deepEqual(save,after);assert.deepEqual(save.garage.f2002,other);
});
test('owned items and original appearance confirm without spending',()=>{
 const save=createDemoSave(),p=createPreviewSession();for(const id of ['paint-mint','paint-stock','wheels-gold','wheels-stock']){
  p.begin(save,'tavaculo',id);assert.equal(p.quote(save).cost,0);assert.equal(p.confirm(save,'tavaculo').purchased,false);assert.equal(save.coins,700);
 }
});
test('unaffordable item remains previewable but neither confirmation nor balance changes can overspend',()=>{
 const save=createDemoSave(),p=createPreviewSession();p.begin(save,'tavaculo','wheels-neon');save.coins=100;
 const before=structuredClone(save);assert.equal(p.quote(save).affordable,false);assert.equal(p.loadout(save,'tavaculo').wheels,'wheels-neon');
 assert.equal(p.confirm(save,'tavaculo').reason,'funds');assert.deepEqual(save,before);assert.equal(p.pending.id,'wheels-neon');p.cancel();assert.equal(p.loadout(save,'tavaculo').wheels,'wheels-stock');
});
test('switching candidates replaces the preview; selecting the equipped item cancels it',()=>{
 const save=createDemoSave(),p=createPreviewSession();p.begin(save,'tavaculo','paint-blue');p.begin(save,'tavaculo','wheels-neon');
 assert.equal(p.loadout(save,'tavaculo').paint,'paint-stock');assert.equal(p.loadout(save,'tavaculo').wheels,'wheels-neon');
 p.begin(save,'tavaculo','wheels-stock');assert.equal(p.pending,null);assert.equal(save.coins,700);
});
test('pending selection cannot be applied to a different car or a performance item',()=>{
 const save=createDemoSave(),before=structuredClone(save),p=createPreviewSession();p.begin(save,'tavaculo','paint-blue');
 assert.deepEqual(p.loadout(save,'f2002'),before.garage.f2002);assert.equal(p.confirm(save,'f2002').ok,false);assert.deepEqual(save,before);
 assert.equal(p.begin(save,'f2002','engine-gt').ok,false);assert.equal(p.begin(save,'missing','paint-blue').ok,false);assert.equal(p.begin(save,'f2002','missing').ok,false);assert.deepEqual(save,before);
});
test('prototype dependency graph cannot reach persistent game saves or transfer controls',async()=>{
 const pending=[new URL('../dist/studies/garage-preview/app.mjs',import.meta.url)],visited=new Set();
 while(pending.length){const url=pending.pop();url.search='';if(visited.has(url.href))continue;visited.add(url.href);
  assert.doesNotMatch(url.pathname,/save-transfer|\/game\.mjs$/);const code=await readFile(url,'utf8');assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage|indexedDB)\b/,'Persistence in '+url.pathname);
  for(const m of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(m[1].startsWith('.'))pending.push(new URL(m[1],url));
 }
 assert.ok(visited.size>10);
});
