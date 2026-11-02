import fs from 'node:fs/promises';
const dir='dist/studies/circuit-elevation/assets/concrete_road_barrier/';
const g=JSON.parse(await fs.readFile(dir+'concrete_road_barrier.gltf','utf8'));
const source=await fs.readFile(dir+g.buffers[0].uri);
function read(i){const a=g.accessors[i],v=g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType],start=(v.byteOffset||0)+(a.byteOffset||0);const values=[];for(let j=0;j<a.count;j++){const row=[];for(let k=0;k<n;k++){const p=start+j*(v.byteStride||size*n)+k*size;row.push(a.componentType===5126?source.readFloatLE(p):a.componentType===5123?source.readUInt16LE(p):source.readUInt32LE(p));}values.push(row);}return values;}
const p=g.meshes[0].primitives[0],pos=read(p.attributes.POSITION),norm=read(p.attributes.NORMAL),uv=read(p.attributes.TEXCOORD_0),oldIndices=read(p.indices).flat();
// Spatial clustering retains UV seams and sharp normals. Original files remain untouched.
const cells=new Map(),clusters=[],remap=[],cell=.05;
for(let i=0;i<pos.length;i++){
 const key=[...pos[i].map(v=>Math.round(v/cell)),...uv[i].map(v=>Math.round(v/.15)),...norm[i].map(v=>Math.round(v/.65))].join(',');
 let id=cells.get(key);if(id===undefined){id=clusters.length;cells.set(key,id);clusters.push({p:[0,0,0],n:[0,0,0],uv:[0,0],count:0});}
 const c=clusters[id];c.count++;pos[i].forEach((v,k)=>c.p[k]+=v);norm[i].forEach((v,k)=>c.n[k]+=v);uv[i].forEach((v,k)=>c.uv[k]+=v);remap.push(id);
}
for(const c of clusters){c.p=c.p.map(v=>v/c.count);c.uv=c.uv.map(v=>v/c.count);const len=Math.hypot(...c.n);c.n=c.n.map(v=>v/(len||1));}
let maxDisplacement=0;for(let i=0;i<pos.length;i++)maxDisplacement=Math.max(maxDisplacement,Math.hypot(...pos[i].map((v,k)=>v-clusters[remap[i]].p[k])));
const indices=[],seen=new Set();for(let i=0;i<oldIndices.length;i+=3){const t=oldIndices.slice(i,i+3).map(n=>remap[n]);if(new Set(t).size<3)continue;const key=[...t].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);indices.push(...t);}
const arrays=[new Float32Array(clusters.flatMap(c=>c.p)),new Float32Array(clusters.flatMap(c=>c.n)),new Float32Array(clusters.flatMap(c=>c.uv)),new Uint32Array(indices)];
let offset=0;g.bufferViews=arrays.map((a,i)=>{const v={buffer:0,byteOffset:offset,byteLength:a.byteLength,target:i===3?34963:34962};offset+=a.byteLength;return v;});
g.accessors=arrays.map((a,i)=>({bufferView:i,componentType:i===3?5125:5126,count:i===3?indices.length:clusters.length,type:['VEC3','VEC3','VEC2','SCALAR'][i]}));
g.accessors[0].min=[0,1,2].map(k=>Math.min(...clusters.map(c=>c.p[k])));g.accessors[0].max=[0,1,2].map(k=>Math.max(...clusters.map(c=>c.p[k])));
g.buffers=[{uri:'barrier-study.bin',byteLength:offset}];g.asset.extras={derivative:'Dream Garage circuit study spatial clustering',source:'https://polyhaven.com/a/concrete_road_barrier',cellMetres:cell,maxDisplacement};
await fs.writeFile(dir+'barrier-study.bin',Buffer.concat(arrays.map(a=>Buffer.from(a.buffer))));await fs.writeFile(dir+'barrier-study.gltf',JSON.stringify(g));
const report={sourceTriangles:oldIndices.length/3,studyTriangles:indices.length/3,vertices:clusters.length,maxDisplacement,cellMetres:cell};await fs.writeFile(dir+'optimization.json',JSON.stringify(report,null,2));console.log(report);
