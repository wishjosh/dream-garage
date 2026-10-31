import {createCityCourse,COURSE_ID,COURSE_NAME,SECTORS} from './city-course.mjs?v=city-tour-1';
import {COURSES,createCourse} from './beginner-courses.mjs?v=courses-main-1';
export const RACE_COURSES=Object.freeze([
 {key:'tour',id:COURSE_ID,name:COURSE_NAME,shortName:'시티 투어',type:'기존 코스',description:'수변에서 도심까지, 여섯 구간을 한 바퀴 달려요.',focus:'기존 기록에 다시 도전하기',sectors:SECTORS,create:createCityCourse},
 ...COURSES.map(c=>({...c,key:c.id,id:'beginner-'+c.id+'-1',shortName:c.name,sectors:c.sectors.map(([at,name,sign])=>({at,name,sign})),create:()=>createCourse(c.id)}))
]);
export const raceCourse=key=>RACE_COURSES.find(c=>c.key===key||c.id===key)||RACE_COURSES[0];
export function courseURL(href,key,{garage=true}={}){const url=new URL(href);url.searchParams.set('course',raceCourse(key).key);if(garage)url.searchParams.set('garage','1');return url.href;}
