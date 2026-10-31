import {getCourse,createCourse} from './courses.mjs?v=courses-1';
const selected=getCourse(new URLSearchParams(location.search).get('course'));
export const COURSE_ID='beginner-'+selected.id+'-1',COURSE_NAME=selected.name;
export const SECTORS=selected.sectors.map(([at,name,sign])=>({at,name,sign}));
export const createCityCourse=()=>createCourse(selected.id);
