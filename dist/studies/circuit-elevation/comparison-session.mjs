// Standalone comparison: no local server injection and no browser storage access.
export function createComparisonSession(host,params){
 const enabled=params.get('comparison')==='1',errors=[],waiting=new Set();let frozen=false;
 const schedule=callback=>host.requestAnimationFrame(time=>{if(enabled&&frozen)waiting.add(callback);else callback(time);});
 const setFrozen=value=>{if(!enabled)return;frozen=!!value;if(!frozen){const queued=[...waiting];waiting.clear();queued.forEach(schedule);}};
 if(enabled){
  host.addEventListener('error',e=>errors.push(String(e.message||('불러오기 실패: '+(e.target?.src||e.target?.href||'파일')))),true);
  host.addEventListener('unhandledrejection',e=>errors.push(String(e.reason?.message||e.reason)));
 }
 return {enabled,errors,schedule,setFrozen};
}
