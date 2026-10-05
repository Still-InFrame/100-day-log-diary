import projection from "./projection.json";

// Longitude and latitude to a position on the map drawing (the same Mercator
// projection the outlines in this folder were generated with, written out as
// plain arithmetic so no mapping library is needed at run time). The
// generator, scripts/build-geo-data.mjs, checks this formula against the
// library it uses and refuses to build if they disagree.
export const MAP_WIDTH = projection.width;
export const MAP_HEIGHT = projection.height;

export function projectPoint(lon: number, lat: number): [number, number] {
  const { k, tx, ty } = projection;
  // Mercator has no finite position for the poles.
  const clamped = Math.max(-85, Math.min(85, lat));
  return [
    tx + (k * lon * Math.PI) / 180,
    ty - k * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360)),
  ];
}
