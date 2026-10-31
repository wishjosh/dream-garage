import {getCourse,createCourse} from './courses.mjs';
const selected=getCourse(typeof location==='undefined'?'speed':new URLSearchParams(location.search).get('course'));
export const COURSE_ID='geometry-'+selected.id+'-1',COURSE_NAME=selected.name+' · '+selected.type;
export const SECTORS=selected.sectors.map(([at,name,sign])=>({at,name,sign}));
export const createCityCourse=()=>createCourse(selected.id);
