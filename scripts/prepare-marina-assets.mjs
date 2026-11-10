import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const id='modular_urban_apartments_facade',folder='dist/assets/marina-city/facade';
await fs.mkdir(folder,{recursive:true});
const [files,info]=await Promise.all([fetch('https://api.polyhaven.com/files/'+id).then(r=>r.json()),fetch('https://api.polyhaven.com/info/'+id).then(r=>r.json())]);
const source=files.gltf['1k'].gltf,records=[];
async function get(file){const response=await fetch(file.url);if(!response.ok)throw Error(response.status+' '+file.url);const bytes=Buffer.from(await response.arrayBuffer());const md5=crypto.createHash('md5').update(bytes).digest('hex');if(md5!==file.md5)throw Error('Hash mismatch '+file.url);records.push({url:file.url,bytes:bytes.length,md5});return bytes;}
const raw=await get(source),doc=JSON.parse(raw),bin=await get(source.include[doc.buffers[0].uri]);
const names=['wall_window_centered_double_01','wall_door_centered_small_01','cornice_standard_standard_01','window_centered_double_01','door_centered_small_01'];
const selected=doc.nodes.filter(n=>names.includes(n.name));if(selected.length!==names.length)throw Error('Missing module');
const out={asset:{version:'2.0',generator:'dream-garage source module extraction; no geometry simplification'},scene:0,scenes:[{nodes:names.map((_,i)=>i)}],nodes:[],meshes:[],materials:doc.materials,textures:doc.textures,images:doc.images,samplers:doc.samplers,accessors:[],bufferViews:[],buffers:[]};
const viewMap=new Map(),accessMap=new Map(),chunks=[];let offset=0;
function accessor(i){if(accessMap.has(i))return accessMap.get(i);const a=structuredClone(doc.accessors[i]);if(!viewMap.has(a.bufferView)){const v=doc.bufferViews[a.bufferView],bytes=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),pad=(4-bytes.length%4)%4;viewMap.set(a.bufferView,out.bufferViews.length);out.bufferViews.push({...v,buffer:0,byteOffset:offset});chunks.push(bytes,Buffer.alloc(pad));offset+=bytes.length+pad;}a.bufferView=viewMap.get(a.bufferView);const index=out.accessors.length;out.accessors.push(a);accessMap.set(i,index);return index;}
for(const n of selected){const m=structuredClone(doc.meshes[n.mesh]);for(const p of m.primitives){p.indices=accessor(p.indices);for(const k of Object.keys(p.attributes))p.attributes[k]=accessor(p.attributes[k]);}out.nodes.push({name:n.name,mesh:out.meshes.length});out.meshes.push(m);}
out.buffers=[{uri:'facade.bin',byteLength:offset}];out.extensionsUsed=doc.extensionsUsed;
const usedMaterials=new Set(out.meshes.flatMap(m=>m.primitives.map(p=>p.material))),usedTextures=new Set();
for(const i of usedMaterials){const m=out.materials[i];for(const item of [m.normalTexture,m.occlusionTexture,m.emissiveTexture,m.pbrMetallicRoughness?.baseColorTexture,m.pbrMetallicRoughness?.metallicRoughnessTexture])if(item)usedTextures.add(item.index);}
// Unused images remain declared but are never requested by GLTFLoader's used materials.
const usedImages=new Set([...usedTextures].map(i=>out.textures[i].source));
for(const i of usedImages){const uri=out.images[i].uri,file=source.include[uri];const bytes=await get(file);await fs.mkdir(path.dirname(path.join(folder,uri)),{recursive:true});await fs.writeFile(path.join(folder,uri),bytes);}
const mats=[...usedMaterials],texs=[...usedTextures],imgs=[...usedImages];
for(const mesh of out.meshes)for(const p of mesh.primitives)p.material=mats.indexOf(p.material);
out.materials=mats.map(i=>out.materials[i]);for(const m of out.materials)for(const item of [m.normalTexture,m.occlusionTexture,m.emissiveTexture,m.pbrMetallicRoughness?.baseColorTexture,m.pbrMetallicRoughness?.metallicRoughnessTexture])if(item)item.index=texs.indexOf(item.index);
out.textures=texs.map(i=>({...out.textures[i],source:imgs.indexOf(out.textures[i].source)}));out.images=imgs.map(i=>out.images[i]);
await fs.writeFile(path.join(folder,'facade.gltf'),JSON.stringify(out));await fs.writeFile(path.join(folder,'facade.bin'),Buffer.concat(chunks));
const report={asset:id,authors:info.authors,license:'CC0-1.0',page:'https://polyhaven.com/a/'+id,checked:'2026-11-10',selectedModules:names,originalBinaryBytes:bin.length,runtimeBinaryBytes:offset,triangles:out.meshes.map(m=>({name:m.name,count:m.primitives.reduce((sum,p)=>sum+out.accessors[p.indices].count/3,0)})),sourceFiles:records};await fs.writeFile(path.join(folder,'provenance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
