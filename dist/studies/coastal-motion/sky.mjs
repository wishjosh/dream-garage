import * as T from '../../vendor/three.module.js';

// The photographed sun is at 65.7% of the full turn. The city and bay face the grid.
const gridLongitude = 0.812;
const sunBearing = (gridLongitude - 0.657) * 2 * Math.PI;
export const sunDirection = new T.Vector3(Math.sin(sunBearing), 0.20, Math.cos(sunBearing));

export function addCoastalSky(scene, overview, horizon) {
  for (const map of [overview, horizon]) map.wrapS = T.RepeatWrapping;
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      overview: {value: overview}, horizon: {value: horizon}, gridLongitude: {value: gridLongitude}
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
        gl_Position = clip.xyww;
      }`,
    fragmentShader: `
      uniform sampler2D overview, horizon;
      uniform float gridLongitude;
      varying vec3 direction;
      void main() {
        const float pi = 3.14159265359;
        vec3 d = normalize(direction);
        float u = gridLongitude - atan(d.x, d.z) / (2. * pi);
        // Lift the distant waterfront above the real-time verge. Inland, the foreground of
        // the photographed road stays below the circuit. The horizon stays level over water.
        float coast = smoothstep(0.08, 0.68, cos((u - 0.726) * 2. * pi));
        float v = 0.5 + asin(clamp(d.y, -1., 1.)) / pi - mix(-0.027, 0.037, coast);
        vec2 uv = vec2(u, v);
        vec2 dx = dFdx(uv), dy = dFdy(uv);
        // Crossing the longitude seam is one texel step, never a full-turn mip footprint.
        dx.x -= floor(dx.x + 0.5);
        dy.x -= floor(dy.x + 0.5);
        vec3 sky = textureGrad(overview, uv, dx, dy).rgb;
        // Rows 1536..2303 of the 8192 x 4096 source. The detailed band shares the
        // overview's longitude and latitude, including in cockpit and mirror cameras.
        const float low = 0.4375, span = 0.1875;
        float t = (v - low) / span;
        vec2 scale = vec2(1., 1. / span);
        vec3 detail = textureGrad(horizon, vec2(u, t), dx * scale, dy * scale).rgb;
        float weight = smoothstep(0., 0.075, t) * (1. - smoothstep(0.925, 1., t));
        gl_FragColor = vec4(mix(sky, detail, weight), 1.);
        #include <colorspace_fragment>
      }`
  });
  const sky = new T.Mesh(new T.SphereGeometry(1, 64, 32), material);
  sky.name = 'Coastal panorama'; sky.renderOrder = -1000; sky.frustumCulled = false;
  scene.add(sky);
}
