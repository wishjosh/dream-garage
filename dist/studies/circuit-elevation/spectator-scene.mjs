import {STAND,PARKING,parkingBays} from './spectators.mjs';
// Reuse the study's existing materials and batched boxes: no per-seat mesh objects.
export function drawSpectators({box,label,polygon,worldPoint,start,surface,road,concrete,roof,seat,white,dark}){
 const z=a=>a-start;
 function stand(){
  const s=STAND,[a,b,c,d]=s.apronBox;polygon([[a,b],[c,b],[c,d],[a,d]].map(worldPoint),concrete,surface.apron);
  for(let block=0;block<s.blocks;block++)for(let row=0;row<s.rows;row++){
   const x=s.firstRowX+row*s.rowPitch,h=.45+row*s.rise,along=2+block*s.blockPitch+8.25;
   box(x,h/2,z(along),s.rowPitch,h,16.5,concrete);
   for(let col=0;col<s.seatsPerBlock;col++){
    const bz=z(s.firstSeatAlong+block*s.blockPitch+col*s.seatPitch);
    box(x,h+.195,bz,.10,.39,.10,dark);
    box(x,h+.43,bz,s.seatDepth,.08,s.seatWidth,seat);
    box(x+.24,h+.67,bz,.08,.48,s.seatWidth,seat);
   }
  }
  // Half-rise steps in three 3.5 m gaps; 2 m walking strip between handrails.
  for(const along of [20.25,40.25,60.25]){
   for(let step=0;step<24;step++){const x=82.8+step*.425,h=.29+step*.16;box(x,h/2,z(along),.425,h,2,concrete);box(x-.18,h+.012,z(along),.06,.024,2,white);}
   for(const side of [-1,1])for(let row=0;row<12;row++){const x=83+row*.85,h=.45+row*.32;box(x,h+.48,z(along+side*1.12),.05,.96,.05,dark);box(x,h+.98,z(along+side*1.12),.86,.05,.05,dark);}
  }
  const backH=.45+11*.32;
  box(95.625,backH/2,z(40),5.75,backH,80,concrete);
  for(let along=0;along<=80;along+=4)box(98.2,backH+.55,z(along),.06,1.1,.06,dark);
  box(98.2,backH+1.1,z(40),.06,.06,80,dark);
  // Modest canopy with columns aligned to the transverse circulation gaps.
  box(90.5,s.roofHeight,z(40),19,.22,84,roof);
  for(const along of [-1,20.25,40.25,60.25,81]){
   for(const x of [81,99])box(x,s.roofHeight/2,z(along),.18,s.roofHeight,.18,dark);
   box(90,s.roofHeight-.2,z(along),18,.22,.2,dark);
  }
  label('GRANDSTAND',80.8,z(40),5.55,8,-Math.PI/2,10);
  return {rows:s.rows,seats:s.rows*s.blocks*s.seatsPerBlock};
 }
 function parking(){
  const [a,b,c,d]=PARKING.box;polygon([[a,b],[c,b],[c,d],[a,d]].map(worldPoint),road,surface.apron);
  for(const bay of parkingBays()){
   for(const side of [-1,1])box(bay.x,surface.marking,z(bay.along+side*bay.width/2),bay.depth,.02,.10,white);
   // Both closed ends make each car-sized rectangle legible, with aisles remaining empty.
   for(const side of [-1,1])box(bay.x+side*bay.depth/2,surface.marking,z(bay.along),.10,.02,bay.width,white);
  }
  for(const [lo,hi] of PARKING.aisles)for(const along of [-8,10,28,46])box((lo+hi)/2,surface.marking,z(along),.12,.02,2.8,white);
  label('P / VISITORS',201,z(-20),2.1,2.4,Math.PI/2,2);box(201,1,z(-20),.08,2,.08,dark);
  return {spaces:parkingBays().length};
 }
 return {stand,parking};
}
