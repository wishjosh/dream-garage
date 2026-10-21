import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
let count=0;
async function inspect(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) await inspect(file);
    else if(/\.(mjs|js|cjs)$/.test(entry.name)){
      const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
      if(result.status!==0) process.exit(result.status||1);
      count++;
    }
  }
}
for(const folder of ['dist','scripts','tests']) await inspect(path.join(root,folder));
console.log(`Syntax checked ${count} JavaScript files.`);
