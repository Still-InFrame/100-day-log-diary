// Generates the static map data in lib/geo/ that the admin overview's map
// draws from. The output is committed, so this only needs running again if
// the map's size, detail or projection changes.
//
// The packages it needs are deliberately NOT dependencies of the app: the app
// only reads the generated JSON. Install them anywhere outside the project
// and point GEO_DEPS_DIR at that folder:
//
//   npm install --prefix /tmp/geo-deps d3-geo topojson-client \
//     topojson-simplify world-atlas us-atlas i18n-iso-countries iso-3166-2
//   GEO_DEPS_DIR=/tmp/geo-deps node scripts/build-geo-data.mjs
//
// Sources: world-atlas and us-atlas (Natural Earth and US Census boundaries,
// public domain), iso-3166-2 (subdivision names).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const depsDir = process.env.GEO_DEPS_DIR;
if (!depsDir) {
  console.error("Set GEO_DEPS_DIR (see the note at the top of this file).");
  process.exit(1);
}
const require = createRequire(path.join(path.resolve(depsDir), "index.js"));
const d3 = await import(pathToFileURL(require.resolve("d3-geo")).href);
const { feature } = require("topojson-client");
const { presimplify, simplify, quantile } = require("topojson-simplify");
const isoCountries = require("i18n-iso-countries");
const iso3166 = require("iso-3166-2");

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib",
  "geo",
);

// ---------- projection ----------
// Mercator, because the map zooms: it keeps every country and state the
// right shape at any zoom level, which an equal-area world map does not.
// The cost is that far-northern countries look larger than they are.
const WIDTH = 960;
// The picture is cropped to these latitudes: no Antarctica, and the empty
// top of the Arctic is cut off.
const NORTH = 78;
const SOUTH = -58;
const mercatorY = (lat) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const k = WIDTH / (2 * Math.PI);
const tx = WIDTH / 2;
const ty = k * mercatorY(NORTH);
const HEIGHT = Math.round(ty - k * mercatorY(SOUTH));

// precision(0) turns off d3's habit of adding points along each edge to
// follow the curve of the earth. The outlines are simplified first, and
// those added points would put back most of what simplifying removed.
const projection = d3.geoMercator().scale(k).translate([tx, ty]).precision(0);
const geoPath = d3.geoPath(projection).digits(2);

// The same projection as plain arithmetic. lib/geo/project.ts repeats this
// formula so city dots can be placed without d3; the check below fails the
// build if the two ever disagree.
const project = (lon, lat) => [
  tx + (k * lon * Math.PI) / 180,
  ty - k * mercatorY(lat),
];
for (const [lon, lat] of [
  [-80.19, 25.76],
  [139.69, 35.68],
  [0, 0],
  [-157.86, 21.31],
]) {
  const [ax, ay] = projection([lon, lat]);
  const [bx, by] = project(lon, lat);
  if (Math.abs(ax - bx) > 0.01 || Math.abs(ay - by) > 0.01) {
    throw new Error(`projection formula mismatch at ${lon},${lat}`);
  }
}

const round1 = (n) => Math.round(n * 10) / 10;

// Keeps roughly `keep` of the points, dropping the ones that change the
// outline least.
function simplified(topology, keep) {
  const weighted = presimplify(topology);
  // quantile() ranks points from most to least important, so `keep` is
  // passed as is: quantile(t, 0.1) is the weight the top 10% clear.
  return simplify(weighted, quantile(weighted, keep));
}

// The outline, plus the box and centre of its largest piece as drawn. The
// largest piece is what the map zooms to and labels: for the United States
// that is the lower 48, not a box stretched out to Alaska and Hawaii. It is
// measured on the drawn outline, not the source shape, because a country
// that crosses the 180th meridian (Russia) is drawn as separate pieces at
// both edges of the map.
function shape(f) {
  const d = geoPath(f);
  if (!d) return null;
  let main = null;
  for (const sub of d.split("M")) {
    if (!sub) continue;
    const points = sub
      .replace("Z", "")
      .split("L")
      .map((pair) => pair.split(",").map(Number));
    if (points.length < 3) continue;
    // Shoelace formula: area and centre of mass of one closed outline.
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    if (!main || Math.abs(area) > Math.abs(main.area)) {
      const xs = points.map((pt) => pt[0]);
      const ys = points.map((pt) => pt[1]);
      main = {
        area,
        box: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        ],
        c: area === 0 ? [xs[0], ys[0]] : [cx / (3 * area), cy / (3 * area)],
      };
    }
  }
  if (!main) return null;
  return { d, box: main.box.map(round1), c: main.c.map(round1) };
}

// ---------- world ----------
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const worldTopology = simplified(
  require("world-atlas/countries-50m.json"),
  0.12,
);
// Keyed by country code: the source lists a few territories separately
// under their parent's code (Australia has two entries), and the map needs
// exactly one shape per code. They are joined, keeping the box and centre of
// whichever is larger.
const byCode = new Map();
const countries = [];
const boxArea = (s) => (s.box[2] - s.box[0]) * (s.box[3] - s.box[1]);
for (const f of feature(worldTopology, worldTopology.objects.countries)
  .features) {
  if (f.id === "010") continue; // Antarctica
  const s = shape(f);
  if (!s) continue;
  // A few disputed areas have no ISO code; they are drawn but never match
  // a visitor's country.
  const code = (f.id && isoCountries.numericToAlpha2(f.id)) || null;
  const existing = code ? byCode.get(code) : undefined;
  if (existing) {
    const larger = boxArea(s) > boxArea(existing) ? s : existing;
    existing.d += s.d;
    existing.box = larger.box;
    existing.c = larger.c;
    continue;
  }
  const country = {
    code,
    name: (code && countryNames.of(code)) || f.properties.name,
    ...s,
  };
  if (code) byCode.set(code, country);
  countries.push(country);
}
countries.sort((a, b) => a.name.localeCompare(b.name));

// ---------- US states ----------
const usSubdivisions = Object.entries(iso3166.data.US.sub);
const stateCode = (name) => {
  const hit = usSubdivisions.find(([, sub]) => sub.name === name);
  return hit ? hit[0].split("-")[1] : null;
};
const usTopology = simplified(require("us-atlas/states-10m.json"), 0.3);
const usStates = [];
for (const f of feature(usTopology, usTopology.objects.states).features) {
  // 60 and above are territories, which arrive as their own countries.
  if (Number(f.id) >= 60) continue;
  const code = stateCode(f.properties.name);
  if (!code) throw new Error(`no state code for ${f.properties.name}`);
  const s = shape(f);
  if (s) usStates.push({ code, name: f.properties.name, ...s });
}
usStates.sort((a, b) => a.name.localeCompare(b.name));
if (usStates.length !== 51) {
  throw new Error(`expected 50 states + DC, got ${usStates.length}`);
}

// ---------- state / province names, every country ----------
// { "US": { "FL": "Florida" }, "JP": { "13": "Tôkyô" } }
const regionNames = {};
for (const [country, info] of Object.entries(iso3166.data)) {
  const subs = {};
  for (const [fullCode, sub] of Object.entries(info.sub)) {
    const region = fullCode.slice(country.length + 1);
    if (region) subs[region] = sub.name;
  }
  if (Object.keys(subs).length > 0) regionNames[country] = subs;
}

// ---------- write ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
const write = (name, data) => {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data) + "\n");
  console.log(`${name}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};
write("projection.json", {
  width: WIDTH,
  height: HEIGHT,
  k: Math.round(k * 1e6) / 1e6,
  tx,
  ty: Math.round(ty * 1e6) / 1e6,
});
write("world-map.json", { countries });
write("us-states.json", { states: usStates });
write("region-names.json", regionNames);
console.log(
  `${countries.length} countries (${countries.filter((c) => !c.code).length} without a code), ${usStates.length} states`,
);
