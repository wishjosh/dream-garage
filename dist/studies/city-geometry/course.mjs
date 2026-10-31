import {getCourse,createCourse} from './courses.mjs';
export const COURSE_ID='city-geometry-1',COURSE_NAME='시티 투어 · 코너 연결';
export const SECTORS=getCourse().sectors.map(([at,name,sign])=>({at,name,sign}));
export const createCityCourse=createCourse;
