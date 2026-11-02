// All coordinates and dimensions are metres; campus box = [along, -worldX, along, -worldX].
export const STAND=Object.freeze({box:[-2,-100,82,-80],apronBox:[-5,-103,85,-77],rows:12,rowPitch:.85,rise:.32,seatPitch:.55,seatWidth:.50,seatDepth:.43,blocks:4,seatsPerBlock:30,firstRowX:83,firstSeatAlong:2.275,blockPitch:20,roofHeight:6.2});
export const PARKING=Object.freeze({box:[-26,-199,70,-129],bayWidth:2.7,bayDepth:5.5,aisleWidth:7,columns:24,firstAlong:-12,rows:[135,147.5,154,166.5,173,185.5],aisles:[[140.5,147.5],[159.5,166.5],[178.5,185.5]],access:[{box:[-44,-224,-36,-191],points:[[-40,-220],[-40,-195]]},{box:[-40,-199,-20,-191],points:[[-40,-195],[-20,-195]]}]});
export function spectatorVariant(id='scaled'){if(!['before','scaled'].includes(id))throw Error('Unknown spectator layout: '+id);return id;}
export function parkingBays(){return PARKING.rows.flatMap((x,row)=>Array.from({length:PARKING.columns},(_,i)=>({row,index:i,x:x+PARKING.bayDepth/2,along:PARKING.firstAlong+(i+.5)*PARKING.bayWidth,width:PARKING.bayWidth,depth:PARKING.bayDepth})));}
export function withinSpectatorPaving(x,along,variant){return variant==='scaled'&&[PARKING,...PARKING.access].some(({box:[a,b,c,d]})=>along>=a&&along<=c&&x>=-d&&x<=-b);}
export function spectatorStats(variant){return {variant,stand:variant==='scaled'?{...STAND,seats:STAND.rows*STAND.blocks*STAND.seatsPerBlock}:null,parking:variant==='scaled'?{...PARKING,spaces:parkingBays().length}:null};}
export function spectatorReviewPose(id,wide){
 if(id==='parking')return {car:{x:150.25,along:21.75,heading:Math.PI/2},camera:wide?[217,22,-20]:[168,8,3.75],target:wide?[168,0,22]:[150.25,.5,21.75]};
 return {car:{x:73,along:40,heading:0},camera:wide?[32,12,-10]:[61,3.6,28],target:wide?[88,2,40]:[85,1.8,44]};
}
