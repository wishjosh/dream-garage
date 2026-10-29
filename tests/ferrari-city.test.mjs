import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarize} from '../dist/studies/ferrari-city/measure.mjs';

test('city timing reports stalls in the average and tail, not only median FPS',()=>{
 const r=summarize([...Array(19).fill(1000/60),100]);
 assert.equal(r.frames,20);assert.equal(r.over33ms,1);assert.equal(r.p95Ms,100);
 assert.ok(Math.abs(r.medianFps-60)<1e-10);assert.ok(Math.abs(r.averageFps-48)<1e-10);
 const empty=summarize([]);assert.equal(empty.averageFps,0);assert.equal(empty.frames,0);
});

test('the isolated city entry cannot reach the original save/import modules or browser storage',async()=>{
 const pending=[new URL('../dist/studies/ferrari-city/game.mjs',import.meta.url)],visited=new Set;
 while(pending.length){const url=pending.pop();url.search='';if(visited.has(url.href))continue;visited.add(url.href);
  assert.doesNotMatch(url.pathname,/save-transfer|original-cockpit|cockpit-source/);
  const code=await readFile(url,'utf8');assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage|indexedDB)\b/,'Persistent storage in '+url.pathname);
  for(const m of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(m[1].startsWith('.'))pending.push(new URL(m[1],url));
 }
 assert.ok(visited.size>15,'Follow the game dependencies, not just its entry');
});
