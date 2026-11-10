import {MARINA_COURSE} from './marina-city/plan.mjs';
import {CIRCUIT_COURSE} from './circuit-course.mjs';
import {createCourse as createTour,COURSES as TOUR} from './studies/city-geometry/courses.mjs';
import {COURSES,createCourse} from './studies/course-geometry/courses.mjs';
const tour=TOUR[0];
export const RACE_COURSES=Object.freeze([
 {key:'tour',id:'city-geometry-1',name:'시티 투어',shortName:'시티 투어',type:'코너 연결',description:tour.description,focus:'여섯 코너에서 감속과 조향 연결',sectors:tour.sectors.map(([at,name,sign])=>({at,name,sign})),create:createTour},
 ...COURSES.map(c=>({...c,key:c.id,id:'geometry-'+c.id+'-1',shortName:c.name,focus:c.tag,sectors:c.sectors.map(([at,name,sign])=>({at,name,sign})),create:()=>createCourse(c.id)})),
 CIRCUIT_COURSE,
 MARINA_COURSE
]);
const aliases={'bayfront-long-1':'tour','beginner-speed-1':'speed','beginner-rhythm-1':'rhythm','beginner-braking-1':'braking'};
export const raceCourse=key=>RACE_COURSES.find(c=>c.key===(aliases[key]||key)||c.id===key)||RACE_COURSES[0];
export function courseURL(href,key,{garage=true,screen}={}){const url=new URL(href);url.searchParams.set('course',raceCourse(key).key);if(garage)url.searchParams.set('garage','1');if(screen==='race')url.searchParams.set('screen','race');else url.searchParams.delete('screen');return url.href;}
