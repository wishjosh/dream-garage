// Keep most cabin roll with the driver's head. A small horizon stabilization
// remains; this only affects presentation, never steering, tyres or collisions.
export const CABIN_ROLL_FOLLOW = .85;
export function setCabinUp(up, bodyQuaternion, worldUp) {
 return up.copy(worldUp).applyQuaternion(bodyQuaternion).lerp(worldUp,1-CABIN_ROLL_FOLLOW).normalize();
}

