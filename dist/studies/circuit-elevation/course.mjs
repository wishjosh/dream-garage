import {createCourse} from '../course-geometry/courses.mjs';
import {terrainHeight} from './terrain.mjs';
export const COURSE_ID='circuit-elevation-study-1',COURSE_NAME='스피드 링 · 지형 주행 시안';
export const SECTORS=[{at:0,name:'출발 직선',sign:'SPEED RING'},{at:.18,name:'오르막',sign:'RISE / LOOK AHEAD'},{at:.40,name:'높은 S',sign:'HOLD THE LINE'},{at:.74,name:'내리막 복귀',sign:'HOME SWEEP'}];
export function createCityCourse(){const track=createCourse('speed');track.id=COURSE_ID;track.name=COURSE_NAME;for(const f of track.frames)f.y=terrainHeight(f.x,f.z);return track;}
