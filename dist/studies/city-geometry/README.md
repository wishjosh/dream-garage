# City geometry driving study

Independent planar driving preview of the reviewed 1.93 km City Tour alignment.

- Entry: `/studies/city-geometry/?v=city-geometry-1`.
- Ferrari/Porsche, stock tuning, four road cars, drag steering and original vehicle rendering.
- Session-only state. No main save reads/writes and no awarded coins.
- Geometry: six 90-degree turns, one reversed; radii in driving order 70/65/50/65/85/85 m; 40 m entry/exit curvature ramps; width 16.4 m. Uniform distance frames preserve the analytical alignment for the race-core lookup contract.
- Coordinate mapping: world x = -plan y, world z = plan x - 299.438. No arbitrary global scale.
- Elevation proposal (12 m) is intentionally not applied to this planar tyre adapter. This preview checks turn flow, visibility and braking before vertical dynamics work.
- Runtime/UI derived from the storage-isolated beginner study at `154dac4ecd7b91ce80310ddc187c75ad8b772ee7`. Shared vehicle assets and main physics remain unchanged.
- The planning speed graph is not the AI controller: this run uses the existing beginner-course predictive controller, with targets bounded by road curvature.

Validation: `node --test tests/city-geometry.test.mjs`, `npm test`, `npm run check`. Four-car CPU completion took 84.38 s; maximum lateral displacement 5.09 m; automatic recoveries 0. This is a scripted simulation, not novice difficulty or phone performance evidence.
