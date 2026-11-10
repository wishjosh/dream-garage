import {terrainHeight} from './terrain.mjs';
// All overlapping surfaces share one piecewise-linear height profile.
// Independently triangulated curved heights can otherwise intersect even
// when their vertices have the correct layer offsets.
export const SURFACE_STEP=4;
export function surfaceHeight(x){const a=Math.floor(x/SURFACE_STEP)*SURFACE_STEP,t=(x-a)/SURFACE_STEP;return terrainHeight(a)*(1-t)+terrainHeight(a+SURFACE_STEP)*t;}
function clip(poly,edge,above){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ai=above?a.x>=edge:a.x<=edge,bi=above?b.x>=edge:b.x<=edge;
  if(ai)out.push(a);
  if(ai!==bi){const t=(edge-a.x)/(b.x-a.x);out.push({x:edge,z:a.z+(b.z-a.z)*t});}
 }
 return out;
}
export function surfaceTriangles(points,index){
 const out=[];
 for(let i=0;i<index.length;i+=3){
  const tri=index.slice(i,i+3).map(n=>points[n]),lo=Math.floor(Math.min(...tri.map(p=>p.x))/SURFACE_STEP),hi=Math.floor(Math.max(...tri.map(p=>p.x))/SURFACE_STEP);
  for(let k=lo;k<=hi;k++){
   const poly=clip(clip(tri,k*SURFACE_STEP,true),(k+1)*SURFACE_STEP,false);
   for(let n=1;n+1<poly.length;n++){
    const [a,b,c]=[poly[0],poly[n],poly[n+1]];
    if(Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))>1e-9)out.push(a,b,c);
   }
  }
 }
 return out;
}
