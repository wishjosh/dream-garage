// Actual unclamped game RAF intervals. No storage or network access.
export function createFrameMeasure(){
 const groups=new Map();let previous=null,lastKey=null,warm=0;
 return {tick(now,meta){
  const key=JSON.stringify([meta.car,meta.view,meta.width,meta.height,meta.ratio]);
  if(!meta.active){previous=null;lastKey=null;warm=0;return;}
  if(previous===null||lastKey!==key){previous=now;lastKey=key;warm=now;return;}
  const dt=now-previous;previous=now;if(now-warm<=1000||dt<=0)return;
  let g=groups.get(key);if(!g){g={...meta,samples:[],moving:0};groups.set(key,g);}
  if(g.samples.length>=18000)return;g.samples.push(dt);if(meta.speed>=1)g.moving+=dt;
 },report(){return [...groups.values()].map(g=>{const a=[...g.samples].sort((a,b)=>a-b),ms=g.samples.reduce((a,b)=>a+b,0);return {car:g.car,view:g.view,width:g.width,height:g.height,ratio:g.ratio,seconds:ms/1000,movingSeconds:g.moving/1000,frames:a.length,fps:1000*a.length/ms,p95:a[Math.max(0,Math.ceil(a.length*.95)-1)],slow:a.filter(x=>x>1000/30).length};});}};
}
export function formatMeasure(rows,userAgent){return ['시티 투어 실제 주행 · city-geometry-2',...rows.map(r=>`${r.car==='porsche'?'Porsche':'Ferrari'} ${r.view==='cockpit'?'운전석':'외관'}: ${r.fps.toFixed(1)} fps / 33.3ms 초과 ${r.slow}/${r.frames} / p95 ${r.p95.toFixed(1)}ms\n측정 ${r.seconds.toFixed(1)}초 · 이동 ${r.movingSeconds.toFixed(1)}초 · 화면 ${r.width}×${r.height} / 배율 ${r.ratio}`),'주행 화면 간격 측정 · 조작 지연/발열은 체감 확인',userAgent].join('\n');}
