// Signed values use the input convention: -1 is left and +1 is right.
// Camera yaw uses the opposite sign because Three.js looks along local -Z.
export const MAX_LOOK_DEGREES=6;
export const MAX_WHEEL_DEGREES=110;

const finiteClamp=(value,min,max)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):0;
export function createSteeringState(){return{amount:0,lookDegrees:0};}

// Exact first-order solutions keep the response consistent across frame rates.
// The gaze follows the moving wheel with a second lag. Releasing the wheel or
// disabling follow starts a direct, monotonic return of the gaze to the centre.
export function stepSteering(state,target,dt,follow=true){
 const input=finiteClamp(target,-1,1);
 const amount=finiteClamp(state.amount,-1,1);
 const look=finiteClamp(state.lookDegrees,-MAX_LOOK_DEGREES,MAX_LOOK_DEGREES);
 state.amount=amount;state.lookDegrees=look;
 if(!Number.isFinite(dt)||dt<=0)return state;
 const wheelRate=1/(input===0?.16:.12);
 const wheelDecay=Math.exp(-wheelRate*dt);
 state.amount=input+(amount-input)*wheelDecay;
 if(!follow||input===0){
  state.lookDegrees=look*Math.exp(-dt/.28);
 }else{
  const gazeRate=1/.20,gazeDecay=Math.exp(-gazeRate*dt);
  const destination=input*MAX_LOOK_DEGREES;
  state.lookDegrees=destination+(look-destination)*gazeDecay+
   MAX_LOOK_DEGREES*(amount-input)*gazeRate/(gazeRate-wheelRate)*(wheelDecay-gazeDecay);
 }
 // Clamp floating-point roundoff without adding a frame-dependent dead zone.
 state.amount=finiteClamp(state.amount,-1,1);
 state.lookDegrees=finiteClamp(state.lookDegrees,-MAX_LOOK_DEGREES,MAX_LOOK_DEGREES);
 return state;
}
