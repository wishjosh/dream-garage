import {createFrameMeasure as createBaseMeasure,formatMeasure as formatBase} from '../course-geometry/performance.mjs';
// Keep loss of page focus separate without dropping stalls in an active sample.
export function createFrameMeasure(){
 const buckets=new Map();let previous=null;
 return {tick(now,meta){
  const key=meta.focused===true?'focused':'unfocused';
  if(!meta.active||meta.visible===false){for(const m of buckets.values())m.tick(now,{active:false});previous=null;return;}
  if(previous!==key){for(const m of buckets.values())m.tick(now,{active:false});previous=key;}
  if(!buckets.has(key))buckets.set(key,createBaseMeasure());
  buckets.get(key).tick(now,meta);
 },report(){return [...buckets].flatMap(([key,m])=>m.report().map(row=>({...row,focused:key==='focused'})));}};
}
export function formatMeasure(rows,userAgent){
 const sections=rows.map(row=>{
  const lines=formatBase([row],'').split('\n');
  return (row.focused?'페이지에 입력 초점 있음':'페이지에 입력 초점 없음')+'\n'+lines.slice(1,3).join('\n');
 });
 return ['스피드 링 독립 지형 주행 · circuit-elevation-2',...sections,
  '숨긴 화면·일시정지·초점 전환 뒤 첫 1초는 제외합니다.',
  '입력 초점만으로 창 가림이나 브라우저의 속도 제한 여부를 확정할 수 없습니다.',
  '화면 간격 측정 · 조작 지연/발열은 직접 확인',userAgent].join('\n');
}
