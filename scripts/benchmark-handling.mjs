import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as before from '../dist/handling-baseline.mjs';
import * as after from '../dist/handling-physics.mjs';
import * as local from '../tests/fixtures/handling-local-slip.mjs';
import * as contact from '../tests/fixtures/handling-contact.mjs';
import {benchmark,SPEC,SOURCES} from '../dist/handling-bench.mjs';
const results={spec:SPEC,sources:SOURCES,executedSDKs:[],nativePhoneVerified:false,hashes:{normalization:'UTF-8 with LF line endings'},before:benchmark(before),after:benchmark(after),iterations:[]};
for(const [name,m] of [['수정 전',before],['1차 · 바퀴 방향의 속도 계산',local],['2차 · 저속 접지와 작은 시간 간격',contact],['최종 · 제동 방향과 속도 좌표 회전',after]]){
 const b=benchmark(m);results.iterations.push({name,maxLowError:Math.max(...b.low.map(x=>Math.abs(x.errorPercent))),convergenceMetres:b.convergence.find(x=>x.dt===1/120).positionError,checks:b.checks});
}
for(const [key,file] of [['before','handling-baseline.mjs'],['after','handling-physics.mjs']])results.hashes[key]=createHash('sha256').update((await fs.readFile(new URL('../dist/'+file,import.meta.url),'utf8')).replace(/\r\n/g,'\n')).digest('hex');
await fs.writeFile(new URL('../dist/handling-results.json',import.meta.url),JSON.stringify(results));
console.log(JSON.stringify({iterations:results.iterations,braking:results.after.braking.map(({speed,stop})=>({speed,stop})),recovery:results.after.recovery.filter(x=>x.sign===1&&x.brake===.4).map(({speed,time})=>({speed,time}))},null,2));
if(results.after.checks.some(x=>!x.pass))process.exitCode=1;
