// A north-up schematic of the actual course. One scale for both axes preserves
// corner proportions on compact and expanded maps; car heading alone rotates.
export function mapProjection(bounds,width,height,padding=18){
 const dx=Math.max(1,bounds.xmax-bounds.xmin),dz=Math.max(1,bounds.zmax-bounds.zmin);
 const scale=Math.max(0,Math.min((width-padding*2)/dx,(height-padding*2)/dz));
 const cx=(bounds.xmin+bounds.xmax)/2,cz=(bounds.zmin+bounds.zmax)/2;
 return{scale,point:(x,z)=>[width/2+(x-cx)*scale,height/2-(z-cz)*scale],heading:r=>Math.atan2(Math.sin(r.heading),Math.cos(r.heading))};
}
export function drivingReadout(player){
 const kmh=Math.round(Math.max(0,Number.isFinite(player.speed)?player.speed:0)*3.6);
 const reverse=player.forwardSpeed<-.25||player.driveMode==='reverse';
 const gear=reverse?'R':kmh<1?'N':String(Math.min(6,Math.floor(kmh/37)+1));
 const rpm=kmh<1?950:reverse?Math.min(8000,1200+kmh*170):1700+(kmh%37)/37*5900;
 return{kmh,gear,rpm,ratio:Math.max(0,Math.min(1,(rpm-900)/7100)),mode:reverse?'후진':'AT'};
}
export function nearbyCar(player,racers){
 const sin=Math.sin(player.heading),cos=Math.cos(player.heading);
 let result=null;
 for(const car of racers){
  if(car===player||car.id===player.id)continue;
  const dx=car.x-player.x,dz=car.z-player.z;
  const forward=dx*sin+dz*cos,right=-dx*cos+dz*sin,distance=Math.hypot(dx,dz);
  if(Math.abs(forward)<5.5&&Math.abs(right)>1&&Math.abs(right)<5.2&&(!result||distance<result.distance))result={side:right<0?'left':'right',distance};
 }
 return result;
}
export function createCircuitMap(canvas,track){
 const context=canvas.getContext('2d'),{width,height}=canvas;
 const projection=mapProjection(track.bounds,width,height,22),points=track.frames.map(f=>projection.point(f.x,f.z));
 // Static course is cached; live passes draw only progress and four markers.
 const base=document.createElement('canvas');base.width=width;base.height=height;
 const baseContext=base.getContext('2d');
 baseContext.lineJoin='round';baseContext.lineCap='round';baseContext.strokeStyle='#9ab6c5';baseContext.lineWidth=5;
 baseContext.beginPath();points.forEach((p,i)=>i?baseContext.lineTo(...p):baseContext.moveTo(...p));baseContext.closePath();baseContext.stroke();
 const first=points[0];baseContext.fillStyle='#edf4f8';baseContext.fillRect(first[0]-4,first[1]-4,8,8);baseContext.fillStyle='#17313f';baseContext.fillRect(first[0]-4,first[1]-4,4,4);baseContext.fillRect(first[0],first[1],4,4);
 function draw(player,racers){
  context.clearRect(0,0,width,height);context.drawImage(base,0,0);
  if(!player)return;
  const progress=Math.max(0,Math.min(1,player.distance/track.length));
  context.strokeStyle='#8ff4d1';context.lineWidth=5;context.lineJoin='round';context.beginPath();
  const count=Math.floor(progress*(points.length-1));for(let i=0;i<=count;i++)i?context.lineTo(...points[i]):context.moveTo(...points[i]);context.stroke();
  for(const r of racers){if(r===player)continue;const p=projection.point(r.x,r.z);context.fillStyle='#ffc0cd';context.strokeStyle='#102536';context.lineWidth=2;context.beginPath();context.arc(...p,4.2,0,Math.PI*2);context.fill();context.stroke();}
  const p=projection.point(player.x,player.z);context.save();context.translate(...p);context.rotate(projection.heading(player));context.beginPath();context.moveTo(0,-9);context.lineTo(6.5,6);context.lineTo(0,3);context.lineTo(-6.5,6);context.closePath();context.fillStyle='#a2ffdc';context.strokeStyle='#071824';context.lineWidth=2;context.fill();context.stroke();context.restore();
 }
 return{draw,projection};
}
