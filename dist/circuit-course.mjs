import {createCourse} from './studies/course-geometry/courses.mjs';
import {terrainHeight} from './studies/circuit-elevation/terrain.mjs';
export const CIRCUIT_ID='speed-ring-circuit-1';
export const CIRCUIT_LAYOUT=Object.freeze({layout:'compact',facilities:'split',spectators:'scaled',signage:'scaled',approach:'circuit'});
export function createCircuitCourse(){const track=createCourse('speed');track.id=CIRCUIT_ID;track.name='스피드 링 서킷';for(const f of track.frames)f.y=terrainHeight(f.x,f.z);return track;}
export const CIRCUIT_COURSE=Object.freeze({key:'circuit',id:CIRCUIT_ID,name:'스피드 링 서킷',shortName:'스피드 링 서킷',type:'전용 서킷',description:'오르막과 내리막을 달리고, 상금으로 다음 경주를 준비해요.',focus:'코너 전 감속 · 한 바퀴 경주',sectors:[{at:0,name:'출발 직선',sign:'SPEED RING'},{at:.18,name:'오르막',sign:'RISE'},{at:.40,name:'높은 S',sign:'HOLD THE LINE'},{at:.74,name:'내리막 복귀',sign:'HOME SWEEP'}],create:createCircuitCourse});
