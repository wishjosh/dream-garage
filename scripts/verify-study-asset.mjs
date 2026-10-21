// Offline GLB/source comparison. Uses only Node built-ins; never starts a browser.
// node scripts/verify-study-asset.mjs conversion-report.json [output-report.json]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

const assetPath=fileURLToPath(new URL('../dist/assets/cockpit-study/gallardo/gallardo-interior.glb',import.meta.url));
const manifestPath=fileURLToPath(new URL('../dist/assets/cockpit-study/gallardo/manifest.json',import.meta.url));
const [sourceReportPath,outputPath,...extra]=process.argv.slice(2);
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const emptyBounds=()=>({min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const expand=(bounds,point)=>point.forEach((v,i)=>{bounds.min[i]=Math.min(bounds.min[i],v);bounds.max[i]=Math.max(bounds.max[i],v);});
const center=b=>b.min.map((v,i)=>(v+b.max[i])/2);
const size=b=>b.min.map((v,i)=>b.max[i]-v);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const boundsDelta=(a,b)=>Math.max(...a.min.map((v,i)=>Math.abs(v-b.min[i])),...a.max.map((v,i)=>Math.abs(v-b.max[i])));
function multiply(a,b){const r=Array(16).fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
function localMatrix(node){
 if(node.matrix){ensure(node.matrix.length===16&&node.matrix.every(Number.isFinite),'Invalid node matrix');return node.matrix;}
 const [x,y,z,w]=node.rotation||[0,0,0,1],[sx,sy,sz]=node.scale||[1,1,1],[tx,ty,tz]=node.translation||[0,0,0];
 const xx=2*x*x,yy=2*y*y,zz=2*z*z,xy=2*x*y,xz=2*x*z,yz=2*y*z,wx=2*w*x,wy=2*w*y,wz=2*w*z;
 const m=[(1-yy-zz)*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-xx-zz)*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-xx-yy)*sz,0,tx,ty,tz,1];
 ensure(m.every(Number.isFinite),'Non-finite node transform');return m;
}
function readGeometry(buffer){
 ensure(buffer.length>=20&&buffer.readUInt32LE(0)===0x46546c67&&buffer.readUInt32LE(4)===2,'Expected GLB version 2');
 ensure(buffer.readUInt32LE(8)===buffer.length,'GLB declared length mismatch');
 let json,bin;
 for(let offset=12;offset<buffer.length;){
  ensure(offset+8<=buffer.length,'Truncated GLB chunk');const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4);
  ensure(offset+8+length<=buffer.length,'Truncated GLB payload');const data=buffer.subarray(offset+8,offset+8+length);
  if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8'));if(type===0x004e4942)bin=data;offset+=8+length;
 }
 ensure(json&&bin,'GLB JSON or binary chunk missing');
 ensure(!json.extensionsRequired?.includes('KHR_draco_mesh_compression'),'Compressed positions require a separate verifier');
 const nodes=[],overall=emptyBounds(),seen=new Set();let primitiveCount=0,triangles=0,vertexEntries=0;
 function visit(index,parent){
  ensure(!seen.has(index),'Repeated or cyclic scene node');seen.add(index);
  const node=json.nodes[index];ensure(node,'Scene node missing');const matrix=multiply(parent,localMatrix(node));
  if(node.mesh!==undefined){
   const bounds=emptyBounds();let partTriangles=0,partPrimitives=0;
   for(const primitive of json.meshes[node.mesh].primitives){
    ensure((primitive.mode??4)===4,'Non-triangle primitive is not supported');
    const a=json.accessors[primitive.attributes.POSITION],view=json.bufferViews[a.bufferView];
    ensure(a.componentType===5126&&a.type==='VEC3'&&!a.sparse&&view.buffer===0,'Unsupported position accessor');
    ensure(Number.isInteger(a.count)&&a.count>0,'Empty position accessor');
    const stride=view.byteStride||12,accessorOffset=a.byteOffset||0,start=(view.byteOffset||0)+accessorOffset;
    ensure(stride>=12&&accessorOffset+(a.count-1)*stride+12<=view.byteLength&&start+(a.count-1)*stride+12<=bin.length,'Position data exceeds its buffer view');
    for(let i=0;i<a.count;i++){
     const at=start+i*stride,x=bin.readFloatLE(at),y=bin.readFloatLE(at+4),z=bin.readFloatLE(at+8);
     const p=[matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]];
     ensure(p.every(Number.isFinite),'Non-finite GLB vertex');expand(bounds,p);
    }
    const count=primitive.indices===undefined?a.count:json.accessors[primitive.indices].count;
    ensure(Number.isInteger(count/3),'Incomplete triangle');partTriangles+=count/3;partPrimitives++;vertexEntries+=a.count;
   }
   expand(overall,bounds.min);expand(overall,bounds.max);triangles+=partTriangles;primitiveCount+=partPrimitives;
   nodes.push({name:node.name||`node-${index}`,bounds,center:center(bounds),size:size(bounds),triangles:partTriangles,primitives:partPrimitives});
  }
  for(const child of node.children||[])visit(child,matrix);
 }
 for(const root of json.scenes[json.scene||0].nodes)visit(root,identity());
 ensure(nodes.length>0,'GLB contains no scene meshes');
 return{nodes,overall:{...overall,size:size(overall)},primitiveCount,triangles,vertexEntries};
}

try{
 ensure(sourceReportPath&&!extra.length,'Usage: node scripts/verify-study-asset.mjs conversion-report.json [output-report.json]');
 const [asset,sourceText,manifestText]=await Promise.all([readFile(assetPath),readFile(sourceReportPath,'utf8'),readFile(manifestPath,'utf8')]);
 const source=JSON.parse(sourceText),manifest=JSON.parse(manifestText),geometry=readGeometry(asset),s=source.scale,origin=source.sourceOriginY;
 ensure(Number.isFinite(s)&&s>0&&Number.isFinite(origin)&&Array.isArray(source.objects),'Invalid source conversion report');
 ensure(source.sourceSha256&&source.sourceSha256===manifest.sourceSha256,'Manifest and conversion source hashes differ');
 ensure(manifest.forward?.length===3&&manifest.forward.every((v,i)=>v===[0,0,-1][i]),'Manifest does not use -Z forward');
 const sourceBounds=b=>({min:[-b.max[0]*s,b.min[2]*s,(b.min[1]-origin)*s],max:[-b.min[0]*s,b.max[2]*s,(b.max[1]-origin)*s]});
 const exportBounds=b=>({min:[b.min[0],b.min[2],-b.max[1]],max:[b.max[0],b.max[2],-b.min[1]]});
 const errors=[],checks=[];const tolerance={exportMeters:1e-6,unreducedSourceMeters:1e-5,reducedSourceMeters:.002};
 for(const object of source.objects){
  const actual=geometry.nodes.find(n=>n.name===object.node);if(!actual){errors.push('Missing '+object.node);continue;}
  const check={name:object.source,node:object.node,decimateRatio:object.decimateRatio||null,sourceBoundsDeltaMeters:boundsDelta(actual.bounds,sourceBounds(object.sourceBounds)),exportBoundsDeltaMeters:boundsDelta(actual.bounds,exportBounds(object.blenderOutputBounds))};
  if(check.exportBoundsDeltaMeters>tolerance.exportMeters)errors.push('Export bounds mismatch '+object.node);
  if(check.sourceBoundsDeltaMeters>(check.decimateRatio?tolerance.reducedSourceMeters:tolerance.unreducedSourceMeters))errors.push('Source bounds mismatch '+object.node);
  checks.push(check);
 }
 for(const actual of geometry.nodes)if(!source.objects.some(o=>o.node===actual.name))errors.push('Unexpected '+actual.name);
 const intact=source.objects.filter(o=>!o.decimateRatio);let pairCount=0,pairMax=0,pairNames=[];
 for(let i=0;i<intact.length;i++)for(let j=i+1;j<intact.length;j++){
  const a=intact[i],b=intact[j],aa=geometry.nodes.find(n=>n.name===a.node),bb=geometry.nodes.find(n=>n.name===b.node);if(!aa||!bb)continue;
  const delta=Math.abs(distance(center(sourceBounds(a.sourceBounds)),center(sourceBounds(b.sourceBounds)))-distance(aa.center,bb.center));pairCount++;
  if(delta>pairMax){pairMax=delta;pairNames=[a.node,b.node];}
 }
 if(pairMax>tolerance.unreducedSourceMeters)errors.push('Relative part-center distances changed');
 const result={passed:errors.length===0,checkedAt:new Date().toISOString(),method:'Independent GLB position-buffer decoding and scene transforms; comparison to evaluated conversion-source bounds. Bounds and center distances do not prove every surface or visual simplification quality.',sourceSha256:source.sourceSha256,assetSha256:createHash('sha256').update(asset).digest('hex'),assetBytes:asset.length,objects:geometry.nodes.length,primitives:geometry.primitiveCount,triangles:geometry.triangles,vertexEntries:geometry.vertexEntries,overall:geometry.overall,tolerance,partChecks:checks,pairDistances:{count:pairCount,maxDeltaMeters:pairMax,parts:pairNames},top8:geometry.nodes.slice().sort((a,b)=>b.triangles-a.triangles).slice(0,8).map(n=>({name:n.name,triangles:n.triangles})),errors};
 if(outputPath){
  const destination=path.resolve(outputPath),inputs=[assetPath,manifestPath,path.resolve(sourceReportPath)].map(p=>path.resolve(p).toLowerCase());
  ensure(path.extname(destination).toLowerCase()==='.json'&&!inputs.includes(destination.toLowerCase()),'Output must be a separate JSON report');
  await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify({passed:result.passed,objects:result.objects,primitives:result.primitives,triangles:result.triangles,assetBytes:result.assetBytes,maxExportDeltaMeters:Math.max(0,...checks.map(c=>c.exportBoundsDeltaMeters)),maxUnreducedSourceDeltaMeters:Math.max(0,...checks.filter(c=>!c.decimateRatio).map(c=>c.sourceBoundsDeltaMeters)),maxReducedSourceDeltaMeters:Math.max(0,...checks.filter(c=>c.decimateRatio).map(c=>c.sourceBoundsDeltaMeters)),pairDistances:result.pairDistances,top8:result.top8,errors,output:outputPath||null},null,2));
 if(!result.passed)process.exitCode=1;
}catch(error){console.error('Study asset verification failed: '+error.message);process.exitCode=1;}
