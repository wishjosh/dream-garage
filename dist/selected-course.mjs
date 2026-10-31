import {raceCourse} from './race-courses.mjs?v=courses-main-1';
export const COURSE_META=raceCourse(new URLSearchParams(globalThis.location?.search||'').get('course'));
export const COURSE_ID=COURSE_META.id,COURSE_NAME=COURSE_META.name,SECTORS=COURSE_META.sectors;
export const createCityCourse=()=>COURSE_META.create();
