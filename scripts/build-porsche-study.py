"""Prepare the CC BY Porsche source without changing its surface topology.
Python 3 + Pillow. Original input remains read-only. See study README for provenance.
"""
import argparse,collections,copy,gzip,hashlib,io,json,math,struct
from pathlib import Path
from PIL import Image

ap=argparse.ArgumentParser();ap.add_argument('source',type=Path);ap.add_argument('output',type=Path);args=ap.parse_args()
raw=args.source.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];src=json.loads(raw[20:20+jl]);binary=20+jl+8
assert hashlib.sha256(raw).hexdigest()=='aef53d169d8778124bafea96b0385f2228493664cc1f231f9847cb35806c989f','Unexpected source revision'
def accessor(i):
 a=src['accessors'][i];v=src['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];f={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']];size=struct.calcsize(f)*n;base=binary+v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+f*n,raw,base+k*v.get('byteStride',size)) for k in range(a['count'])]
def eye4():return [1.,0,0,0,0,1.,0,0,0,0,1.,0,0,0,0,1.]
def multiply(a,b):return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
def point(m,p,w=1):return tuple(sum(m[k*4+r]*p[k] for k in range(3))+m[12+r]*w for r in range(3))
def unit(v):
 d=math.sqrt(sum(x*x for x in v)) or 1;return tuple(x/d for x in v)
nodes=copy.deepcopy(src['nodes']);nodes[114]['matrix']=copy.deepcopy(nodes[81]['matrix']) # Close the posed door using its mirrored closed-frame transform.
world={}
def walk(i,parent):
 n=nodes[i];world[i]=multiply(parent,n.get('matrix',eye4()))
 for child in n.get('children',[]):walk(child,world[i])
for i in src['scenes'][src.get('scene',0)]['nodes']:walk(i,eye4())
mesh_nodes={n['mesh']:i for i,n in enumerate(nodes) if 'mesh' in n}
parts=[]
for mi,m in enumerate(src['meshes']):
 pr=m['primitives'][0];attrs={s:accessor(a) for s,a in pr['attributes'].items()};ix=[x[0] for x in accessor(pr['indices'])];matrix=world[mesh_nodes[mi]]
 # Source: +X forward. Game: -Z forward; use a single rigid rotation and uniform scale.
 p=[point(matrix,v) for v in attrs['POSITION']];p=[(v[2],v[1],-v[0]) for v in p]
 normals=[unit(point(matrix,v,0)) for v in attrs['NORMAL']];normals=[(v[2],v[1],-v[0]) for v in normals]
 attrs['POSITION']=p;attrs['NORMAL']=normals
 if 'TANGENT' in attrs:
  attrs['TANGENT']=[(*(lambda v:(v[2],v[1],-v[0]))(unit(point(matrix,t[:3],0))),t[3]) for t in attrs['TANGENT']]
 parts.append({'mi':mi,'name':m['name'],'raw':accessor(pr['attributes']['POSITION']),'attributes':attrs,'indices':ix,'material':pr['material']})
body=next(p for p in parts if p['name']=='body_all_body_main_0')['attributes']['POSITION'];lo=[min(v[k] for v in body) for k in range(3)];hi=[max(v[k] for v in body) for k in range(3)];scale=4.535/(hi[2]-lo[2]);center=[(lo[k]+hi[k])/2 for k in range(3)];floor=min(v[1] for p in parts for v in p['attributes']['POSITION'])
def normalize(p):return ((p[0]-center[0])*scale,(p[1]-floor)*scale,(p[2]-center[2])*scale)
for p in parts:p['attributes']['POSITION']=[normalize(v) for v in p['attributes']['POSITION']]
# Fit the horn's circular chrome ring: the ring centre, rather than the flattened
# outer grip bounds, defines the steering axis. Source hash fixes this component.
hubpart=parts[19];hp=hubpart['raw'];parent=list(range(len(hp)))
def hfind(a):
 while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
 return a
def hunion(a,b):
 a,b=hfind(a),hfind(b)
 if a!=b:parent[b]=a
weld={}
for i,v in enumerate(hp):
 key=tuple(round(x*1000) for x in v)
 if key in weld:hunion(i,weld[key])
 else:weld[key]=i
for j in range(0,len(hubpart['indices']),3):
 a,b,c=hubpart['indices'][j:j+3];hunion(a,b);hunion(a,c)
hub=[v for i,v in enumerate(hp) if hfind(i)==833];assert len(hub)>100
steer_source=tuple((min(v[k] for v in hub)+max(v[k] for v in hub))/2 for k in range(3))
mean=[sum(v[k] for v in hub)/len(hub) for k in range(3)];cov=[[sum((v[a]-mean[a])*(v[b]-mean[b]) for v in hub)/len(hub) for b in range(3)] for a in range(3)];ev=[[float(a==b) for b in range(3)] for a in range(3)]
for iteration in range(30):
 a,b=max(((0,1),(0,2),(1,2)),key=lambda ij:abs(cov[ij[0]][ij[1]]))
 if abs(cov[a][b])<1e-12:break
 theta=.5*math.atan2(2*cov[a][b],cov[b][b]-cov[a][a]);c=math.cos(theta);ss=math.sin(theta)
 rot=[[float(i==j) for j in range(3)] for i in range(3)];rot[a][a]=rot[b][b]=c;rot[a][b]=ss;rot[b][a]=-ss
 temp=[[sum(cov[i][k]*rot[k][j] for k in range(3)) for j in range(3)] for i in range(3)];cov=[[sum(rot[k][i]*temp[k][j] for k in range(3)) for j in range(3)] for i in range(3)];ev=[[sum(ev[i][k]*rot[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
k=min(range(3),key=lambda i:cov[i][i]);raw_axis=unit(tuple(ev[i][k] for i in range(3)))
if raw_axis[0]<0:raw_axis=tuple(-x for x in raw_axis)
steer_world=point(world[51],steer_source);steer_center=normalize((steer_world[2],steer_world[1],-steer_world[0]));axis_world=point(world[51],raw_axis,0);steer_axis=unit((axis_world[2],axis_world[1],-axis_world[0]))
def wheel_key(p):return ('f' if p[2]<0 else 'r')+('l' if p[0]<0 else 'r')
tire=next(p for p in parts if p['name']=='AO_tire_main_tires_0');wheel_centers={}
for key in ['fl','fr','rl','rr']:
 points=[p for p in tire['attributes']['POSITION'] if wheel_key(p)==key];wheel_centers[key]=tuple((min(p[k] for p in points)+max(p[k] for p in points))/2 for k in range(3))
def steering_components(p):
 if 'door' in p['name']:return set()
 if not any(s in p['name'] for s in ['leather_all','chrome_int','glossy_plastic','logo_all','plastic_all','carbon_all','steering_wheel']):return set()
 points=p['raw'];parent=list(range(len(points)))
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 def union(a,b):
  a,b=find(a),find(b)
  if a!=b:parent[b]=a
 weld={}
 for i,v in enumerate(points):
  key=tuple(round(x*1000) for x in v)
  if key in weld:union(i,weld[key])
  else:weld[key]=i
 ix=p['indices']
 for j in range(0,len(ix),3):union(ix[j],ix[j+1]);union(ix[j],ix[j+2])
 components=collections.defaultdict(list)
 for i in range(len(points)):components[find(i)].append(i)
 selected=set()
 for indices in components.values():
  values=[points[i] for i in indices];ds=[(v[0]+204.1)*.9457-(v[2]-64.14)*.325 for v in values];rs=[math.hypot(v[1]-33.99,.325*(v[0]+204.1)+.9457*(v[2]-64.14)) for v in values]
  if min(ds)>=-4 and max(ds)<=6.2 and max(rs)<=20:selected.update(indices)
 return selected

prepared=[];counts=collections.Counter();wheel_crossings=0
wheel_meshes={'wheel_rim_rim_black_0','wheel_rim_rim_chrome_0','AO_tire_main_tires_0','discs_Discs_0'}
for p in parts:
 steering=steering_components(p);buckets=collections.defaultdict(list);ix=p['indices'];positions=p['attributes']['POSITION']
 for j in range(0,len(ix),3):
  triangle=ix[j:j+3]
  if p['name'] in wheel_meshes or p['name']=='brakes_all_brakes_0':
   keys=[wheel_key(positions[i]) for i in triangle]
   if len(set(keys))!=1:wheel_crossings+=1;raise ValueError('Wheel triangle crosses partition: '+p['name']+' '+str([positions[i] for i in triangle]))
   key=('brake_' if p['name']=='brakes_all_brakes_0' else 'wheel_')+keys[0]
  elif p['name'] in ['metal_parts_rim_chrome_0','logo_all_LOGO1_0']:
   near=[]
   for wk,c in wheel_centers.items():
    if all(abs(positions[i][0]-c[0])<.23 and math.hypot(positions[i][1]-c[1],positions[i][2]-c[2])<.33 for i in triangle):near.append(wk)
   if len(near)==1:
    wk=near[0];c=wheel_centers[wk];hub=all(math.hypot(positions[i][1]-c[1],positions[i][2]-c[2])<.15 for i in triangle);key=('wheel_' if hub or p['name'].startswith('metal_parts') else 'brake_')+wk
   else:key='steering_wheel' if all(i in steering for i in triangle) else 'body'
  elif all(i in steering for i in triangle):key='steering_wheel'
  else:key='body'
  buckets[key].extend(triangle);counts[key]+=1
 for key,indices in buckets.items():
  remap={};used=[];compact=[]
  for i in indices:
   if i not in remap:remap[i]=len(used);used.append(i)
   compact.append(remap[i])
  attrs={s:[rows[i] for i in used] for s,rows in p['attributes'].items()}
  pivot=steer_center if key=='steering_wheel' else wheel_centers[key.split('_')[1]] if key.startswith(('wheel_','brake_')) else (0,0,0)
  attrs['POSITION']=[tuple(v[k]-pivot[k] for k in range(3)) for v in attrs['POSITION']]
  prepared.append({'name':p['name']+'_'+key,'group':key,'attributes':attrs,'indices':compact,'material':p['material']})
assert sum(counts.values())==sum(len(p['indices'])//3 for p in parts)
assert 4000<counts['steering_wheel']<25000,counts

def write_variant(cap,name):
 g={'asset':copy.deepcopy(src['asset']),'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'porsche_911_turbo_s','children':[]}],'meshes':[],'materials':copy.deepcopy(src['materials']),'textures':copy.deepcopy(src['textures']),'samplers':copy.deepcopy(src.get('samplers',[])),'images':[],'bufferViews':[],'accessors':[],'buffers':[{}],'extensionsUsed':list(set(src.get('extensionsUsed',[])+['KHR_mesh_quantization'])),'extensionsRequired':['KHR_mesh_quantization']}
 g['asset']['generator']='Dream Garage Porsche study builder';g['asset']['extras']['modifications']='Closed source door pose; preserved all source triangles; split wheels and steering; quantized attributes; '+('source image resolution' if cap is None else 'texture resolution capped at '+str(cap))
 data=bytearray();max_error=0;pixel_count=0
 def view(blob,target=None,stride=None):
  while len(data)%4:data.append(0)
  v={'buffer':0,'byteOffset':len(data),'byteLength':len(blob)}
  if target:v['target']=target
  if stride:v['byteStride']=stride
  data.extend(blob);g['bufferViews'].append(v);return len(g['bufferViews'])-1
 def acc(blob,ctype,typ,count,normalized=False,lo=None,hi=None,target=34962,stride=None):
  a={'bufferView':view(blob,target,stride),'componentType':ctype,'type':typ,'count':count}
  if normalized:a['normalized']=True
  if lo is not None:a['min']=lo;a['max']=hi
  g['accessors'].append(a);return len(g['accessors'])-1
 groups={'body':0}
 for key in ['fl','fr','rl','rr']:
  for prefix in ['wheel_','brake_']:
   index=len(g['nodes']);groups[prefix+key]=index;g['nodes'].append({'name':prefix+key,'translation':wheel_centers[key],'children':[]});g['nodes'][0]['children'].append(index)
 groups['steering_wheel']=len(g['nodes']);g['nodes'].append({'name':'steering_wheel','translation':steer_center,'children':[]});g['nodes'][0]['children'].append(groups['steering_wheel'])
 for p in prepared:
  pts=p['attributes']['POSITION'];lo=[min(v[k] for v in pts) for k in range(3)];hi=[max(v[k] for v in pts) for k in range(3)];extent=max(max(b-a for a,b in zip(lo,hi)),.00001);quant=[tuple(round((v[k]-lo[k])/extent*65535) for k in range(3)) for v in pts];max_error=max(max_error,extent/65535/2*math.sqrt(3));attrs={}
  attrs['POSITION']=acc(b''.join(struct.pack('<HHHH',*v,0) for v in quant),5123,'VEC3',len(pts),True,[min(v[k] for v in quant) for k in range(3)],[max(v[k] for v in quant) for k in range(3)],stride=8)
  for semantic,rows in p['attributes'].items():
   if semantic=='POSITION':continue
   n=len(rows[0]);typ={2:'VEC2',3:'VEC3',4:'VEC4'}[n]
   if semantic in ['NORMAL','TANGENT']:
    quant=[tuple(max(-32767,min(32767,round(x*32767))) for x in row) for row in rows];blob=b''.join(struct.pack('<'+'h'*n,*v)+(b'\0\0' if n==3 else b'') for v in quant);attrs[semantic]=acc(blob,5122,typ,len(rows),True,stride=8)
   elif semantic.startswith('TEXCOORD') and all(0<=x<=1 for row in rows for x in row):attrs[semantic]=acc(b''.join(struct.pack('<HH',*(round(x*65535) for x in row)) for row in rows),5123,typ,len(rows),True,stride=4)
   else:attrs[semantic]=acc(b''.join(struct.pack('<'+'f'*n,*row) for row in rows),5126,typ,len(rows))
  fmt='H' if len(pts)<=65536 else 'I';index=acc(struct.pack('<'+fmt*len(p['indices']),*p['indices']),5123 if fmt=='H' else 5125,'SCALAR',len(p['indices']),target=34963);mesh=len(g['meshes']);g['meshes'].append({'name':p['name'],'primitives':[{'attributes':attrs,'indices':index,'material':p['material']}]});node=len(g['nodes']);g['nodes'].append({'name':p['name'],'mesh':mesh,'translation':lo,'scale':[extent]*3});g['nodes'][groups[p['group']]].setdefault('children',[]).append(node)
 for im in src['images']:
  v=src['bufferViews'][im['bufferView']];start=binary+v.get('byteOffset',0);blob=raw[start:start+v['byteLength']];picture=Image.open(io.BytesIO(blob));mime=im['mimeType']
  if cap is not None and max(picture.size)>cap:
   picture.thumbnail((cap,cap),Image.Resampling.LANCZOS);out=io.BytesIO();picture.save(out,format='JPEG' if mime=='image/jpeg' else 'PNG',quality=94,optimize=True,compress_level=9);blob=out.getvalue()
  pixel_count+=picture.width*picture.height;g['images'].append({'bufferView':view(blob),'mimeType':mime})
 while len(data)%4:data.append(0)
 g['buffers'][0]['byteLength']=len(data);js=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);out=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data;compressed=gzip.compress(out,compresslevel=9,mtime=0);(args.output/(name+'.gz')).write_bytes(compressed)
 return {'file':name+'.gz','bytes':len(compressed),'decodedBytes':len(out),'imagePixels':pixel_count,'rgba8MiB':pixel_count*4/1048576,'quantizationMaxPositionErrorMetres':max_error,'meshCount':len(prepared)}
args.output.mkdir(parents=True,exist_ok=True)
variants=[write_variant(None,'porsche-reference.glb'),write_variant(512,'porsche-mobile.glb')]
manifest={'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceBytes':len(raw),'sourceTriangles':sum(counts.values()),'trianglesPreserved':True,'lengthMetres':4.535,'bodyDimensions':[scale*(hi[k]-lo[k]) for k in range(3)],'wheelCenters':wheel_centers,'wheelRadius':(max(p[1] for p in tire['attributes']['POSITION'])-min(p[1] for p in tire['attributes']['POSITION']))/2,'steeringCenter':steer_center,'steeringAxis':steer_axis,'eye':[steer_center[0],steer_center[1]+.25,steer_center[2]+.45],'forward':[0,0,-1],'triangleGroups':dict(counts),'wheelCrossingTriangles':wheel_crossings,'variants':variants,'doorPose':'closed using source mirrored transform','sourceUrl':src['asset']['extras']['source'],'author':src['asset']['extras']['author'],'license':'CC BY 4.0'}
(args.output/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8',newline='\n');print(json.dumps(manifest,indent=2))
