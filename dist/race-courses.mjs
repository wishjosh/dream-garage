import {MARINA_COURSE} from './marina-city/plan.mjs';
import {CIRCUIT_COURSE} from './circuit-course.mjs?v=circuit-lineup-1';
import {createCourse as createTour,COURSES as TOUR} from './studies/city-geometry/courses.mjs';
import {COURSES,createCourse} from './studies/course-geometry/courses.mjs';
const tour=TOUR[0];
function flatCircuit(create,name){
 return ()=>({...create(),name,waterAt:()=>false});
}
export const RACE_COURSES=Object.freeze([
 {key:'tour',id:'city-geometry-1',name:'클럽 서킷',shortName:'클럽 서킷',type:'경주장 · 입문',description:tour.description,focus:'여섯 코너에서 감속과 조향 연결',sectors:tour.sectors.map(([at,name,sign],index)=>({at,name:index===0?'출발 직선':name,sign})),create:flatCircuit(createTour,'클럽 서킷')},
 ...COURSES.filter(c=>c.id!=='speed').map(c=>({...c,key:c.id,id:'geometry-'+c.id+'-1',shortName:c.name,type:'경주장 · '+c.type,focus:c.tag,sectors:c.sectors.map(([at,name,sign])=>({at,name,sign})),create:flatCircuit(()=>createCourse(c.id),c.name)})),
 CIRCUIT_COURSE,
 MARINA_COURSE
]);
const aliases={'bayfront-long-1':'tour','beginner-speed-1':'circuit',speed:'circuit','geometry-speed-1':'circuit','beginner-rhythm-1':'rhythm','beginner-braking-1':'braking'};
export const raceCourse=key=>RACE_COURSES.find(c=>c.key===(aliases[key]||key)||c.id===key)||RACE_COURSES[0];
export function courseURL(href,key,{garage=true,screen}={}){const url=new URL(href);url.searchParams.set('course',raceCourse(key).key);if(garage)url.searchParams.set('garage','1');if(screen==='race')url.searchParams.set('screen','race');else url.searchParams.delete('screen');return url.href;}
