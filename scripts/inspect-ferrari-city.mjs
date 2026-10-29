import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as T from '../dist/vendor/three.module.js';
if(!process.argv[2])throw Error('Usage: node scripts/inspect-ferrari-city.mjs <output-json-path>');
const decoderDir=new URL('../dist/studies/vehicle-compare/draco/',import.meta.url);
const context={module:{exports:{}},exports:{},require:createRequire(import.meta.url),__dirname:new URL('.',decoderDir).pathname,console,process,Buffer,WebAssembly,TextDecoder,TextEncoder,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(new URL('draco_wasm_wrapper.js',decoderDir),'utf8'),context);
const draco=await context.module.exports({wasmBinary:fs.readFileSync(new URL('draco_decoder.wasm',decoderDir))});
const file=fs.readFileSync(new URL('../dist/assets/vehicle-compare/ferrari/ferrari.glb',import.meta.url));
const len=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+len)),bin=file.subarray(28+len);
const parents=new Map;gltf.nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));
function matrix(i){const n=gltf.nodes[i],m=new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));return parents.has(i)?matrix(parents.get(i)).multiply(m):m;}
const result=[];
for(let i=0;i<gltf.nodes.length;i++){
 const n=gltf.nodes[i];if(n.mesh===undefined)continue;
 for(const p of gltf.meshes[n.mesh].primitives){
 const ex=p.extensions.KHR_draco_mesh_compression,v=gltf.bufferViews[ex.bufferView],data=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),buffer=new draco.DecoderBuffer();buffer.Init(new Int8Array(data),data.length);const decoder=new draco.Decoder,mesh=new draco.Mesh;decoder.DecodeBufferToMesh(buffer,mesh);const attr=decoder.GetAttributeByUniqueId(mesh,ex.attributes.POSITION),values=new draco.DracoFloat32Array;decoder.GetAttributeFloatForAllPoints(mesh,attr,values);
 const pts=[];for(let k=0;k<mesh.num_points();k++)pts.push(new T.Vector3(values.GetValue(k*3),values.GetValue(k*3+1),values.GetValue(k*3+2)).applyMatrix4(matrix(i)));
 const faces=new draco.DracoInt32Array,links=Array.from({length:pts.length},()=>[]);for(let f=0;f<mesh.num_faces();f++){decoder.GetFaceFromMesh(mesh,f,faces);const a=faces.GetValue(0),b=faces.GetValue(1),c=faces.GetValue(2);links[a].push(b,c);links[b].push(a,c);links[c].push(a,b);}
 const seen=new Set,parts=[];for(let k=0;k<pts.length;k++){if(seen.has(k))continue;const queue=[k],part=[];seen.add(k);while(queue.length){const j=queue.pop();part.push(pts[j]);for(const h of links[j])if(!seen.has(h)){seen.add(h);queue.push(h);}}const b=new T.Box3().setFromPoints(part);if(part.length>15)parts.push({points:part.length,center:b.getCenter(new T.Vector3()).toArray(),size:b.getSize(new T.Vector3()).toArray()});}
 const b=new T.Box3().setFromPoints(pts);result.push({name:n.name,material:gltf.materials[p.material]?.name,center:b.getCenter(new T.Vector3()).toArray(),size:b.getSize(new T.Vector3()).toArray(),parts:parts.filter(p=>p.center[1]>.55&&p.center[2]<.7&&p.center[2]>-1.2)});
 for(const o of[faces,values,mesh,decoder,buffer])draco.destroy(o);
 }
}
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
console.log('Inspected '+result.length+' source mesh primitives; component bounds saved.');
