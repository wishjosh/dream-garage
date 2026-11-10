// Fictional city plan inspired by Marina Bay. Metres; x east, z south.
export const JUNCTIONS=[[-360,-280],[220,-280],[220,-100],[80,-100],[80,80],[300,80],[300,300],[-160,300],[-160,140],[-360,140]];
export const CORNER_RADIUS=35;
export const STREETS=[
 {a:[-540,-280],b:[500,-280],width:21,name:'Republic Boulevard'},
 {a:[-540,-100],b:[500,-100],width:19,name:'Civic Avenue'},
 {a:[-540,80],b:[430,80],width:19,name:'Esplanade Avenue'},
 {a:[-540,300],b:[430,300],width:21,name:'Marina Promenade'},
 {a:[-360,-440],b:[-360,460],width:19,name:'Old Town Road'},
 {a:[-160,-440],b:[-160,460],width:19,name:'Park Street'},
 {a:[80,-440],b:[80,80],width:19,name:'Civic Street'},
 {a:[220,-440],b:[220,80],width:19,name:'Tower Street'},
 {a:[300,80],b:[300,460],width:21,name:'Channel Bridge'},
 {a:[-360,140],b:[-160,140],width:19,name:'Garden Link'}
];
export const WATER=[
 [[-90,175],[90,125],[245,140],[245,190],[430,190],[430,250],[240,250],[165,270],[-80,270]],
 [[430,40],[1250,40],[1250,850],[430,850]]
];
// Blocks follow the street grid; parks and water remain unbuilt.
export const BLOCKS=[
 {id:'old-north',kind:'midrise',x:-260,z:-190,w:146,d:110,h:18},
 {id:'civic-north',kind:'midrise',x:-40,z:-190,w:176,d:110,h:24},
 {id:'tower-north',kind:'office',x:150,z:-190,w:94,d:104,h:82},
 {id:'tower-east',kind:'office',x:336,z:-180,w:150,d:136,h:104},
 {id:'civic-square',kind:'park',x:-40,z:-10,w:176,d:112,h:0},
 {id:'old-square',kind:'midrise',x:-260,z:0,w:142,d:126,h:15},
 {id:'museum',kind:'civic',x:184,z:-10,w:138,d:112,h:12},
 {id:'garden',kind:'park',x:-260,z:220,w:142,d:104,h:0},
 {id:'promenade',kind:'park',x:45,z:354,w:340,d:40,h:0},
 {id:'south-west',kind:'office',x:-265,z:376,w:126,d:94,h:68},
 {id:'outer-west',kind:'midrise',x:-450,z:-165,w:100,d:150,h:30},
 {id:'outer-south',kind:'office',x:130,z:455,w:290,d:96,h:110}
];
export function pointInPolygon(x,z,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export const inWater=(x,z)=>WATER.some(p=>pointInPolygon(x,z,p));
export const bridgeDeck=(x,z)=>Math.abs(x-300)<15&&z>175&&z<265;
export function streetDistance(x,z,s){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((x-s.a[0])*dx+(z-s.a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-s.a[0]-dx*t,z-s.a[1]-dz*t);}
export function createMarinaCourse(){
 const r=CORNER_RADIUS,n=JUNCTIONS.length,corners=JUNCTIONS.map((p,i)=>{const prev=JUNCTIONS[(i+n-1)%n],next=JUNCTIONS[(i+1)%n],il=Math.hypot(p[0]-prev[0],p[1]-prev[1]),ol=Math.hypot(next[0]-p[0],next[1]-p[1]),u=[(p[0]-prev[0])/il,(p[1]-prev[1])/il],v=[(next[0]-p[0])/ol,(next[1]-p[1])/ol],entry=[p[0]-u[0]*r,p[1]-u[1]*r],exit=[p[0]+v[0]*r,p[1]+v[1]*r],center=[entry[0]+v[0]*r,entry[1]+v[1]*r];return{entry,exit,center,sign:Math.sign(u[0]*v[1]-u[1]*v[0]),a:Math.atan2(entry[1]-center[1],entry[0]-center[0])};});
 const pieces=[];let length=0;
 for(let i=0;i<n;i++){const a=corners[i].exit,b=corners[(i+1)%n].entry,c=corners[(i+1)%n],len=Math.hypot(b[0]-a[0],b[1]-a[1]);pieces.push({s:length,len,sample:t=>({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,tx:(b[0]-a[0])/len,tz:(b[1]-a[1])/len})});length+=len;const arc=r*Math.PI/2;pieces.push({s:length,len:arc,sample:t=>{const h=c.a+c.sign*t*Math.PI/2;return{x:c.center[0]+r*Math.cos(h),z:c.center[1]+r*Math.sin(h),tx:-Math.sin(h)*c.sign,tz:Math.cos(h)*c.sign};}});length+=arc;}
 const count=Math.ceil(length/2),frames=[];let j=0;for(let i=0;i<count;i++){const s=i/count*length;while(j+1<pieces.length&&pieces[j+1].s<=s)j++;const p=pieces[j],f=p.sample((s-p.s)/p.len);frames.push({...f,rx:f.tz,rz:-f.tx,s});}
 return{id:'marina-city-1',name:'마리나 시티',length,frames,turns:pieces.filter((_,i)=>i%2).map((p,i)=>({s:p.s,number:i+1,direction:corners[(i+1)%n].sign})),bounds:{xmin:-360,xmax:300,zmin:-280,zmax:300}};
}
export const MARINA_COURSE={key:'marina',id:'marina-city-1',name:'마리나 시티',shortName:'마리나 시티',type:'도심 · 수변',description:'도심 교차로를 이어 달리고, 공원과 수변 교량을 지나 돌아오는 저녁 경주예요.',focus:'교차로 감속과 수변 직선의 대비',sectors:[{at:0,name:'리퍼블릭 대로',sign:'REPUBLIC'},{at:.28,name:'시민 지구',sign:'CIVIC DISTRICT'},{at:.48,name:'수변 교량',sign:'MARINA BRIDGE'},{at:.65,name:'마리나 산책로',sign:'BAYFRONT'},{at:.84,name:'가든 링크',sign:'GARDEN LINK'}],create:createMarinaCourse};
