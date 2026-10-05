"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarList, type BarListItem } from "@/components/admin/BarList";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo/project";
import type { GeoCounts, GeoPlace } from "@/lib/geo/places";

// A world map that drills in: click a country to zoom to it, a state to zoom
// to that, and cities appear as dots. The outlines are static files (see
// scripts/build-geo-data.mjs) fetched the first time they are needed, so
// they are not part of the page's first load.
//
// State outlines exist for the United States only. Any other country zooms
// in the same way and shows its cities as dots, with its regions in the list.
//
// The list beside the map always holds the same places and figures as the
// map, as text, so nothing has to be read from a color or reached by hover.

type Shape = {
  code: string | null;
  name: string;
  d: string;
  // The box and centre of the outline's largest piece, in map units.
  box: number[];
  c: number[];
};

type Tip = {
  title: string;
  rows: [string, string][];
  left: number;
  top: number;
  // Past the middle of the map the box opens towards the other side, so it
  // never runs off the edge.
  flipX: boolean;
  flipY: boolean;
};

const MAX_ZOOM = 48;
const LIST_ROWS = 12;
const whole = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const shortNumber = (n: number) =>
  n >= 10000 ? compact.format(n) : whole.format(n);

// Up to five shades. The edges between them grow with the square of the
// shade number, so one very busy place does not leave everywhere else in the
// palest shade. Empty shades are left out, which is why the legend can show
// fewer than five.
function shadeClasses(max: number): { step: number; lo: number; hi: number }[] {
  const classes = [];
  let previous = 0;
  for (let step = 1; step <= 5; step++) {
    const hi = step === 5 ? max : Math.floor(max * (step / 5) ** 2);
    if (hi > previous) {
      classes.push({ step, lo: previous + 1, hi });
      previous = hi;
    }
  }
  return classes;
}

function shadeFor(
  value: number,
  classes: { step: number; hi: number }[],
): number {
  if (value <= 0) return 0;
  return classes.find((c) => value <= c.hi)?.step ?? 5;
}

// The zoom that brings a box to the middle of the picture with some air
// around it.
function zoomTo(box: number[] | null): { k: number; x: number; y: number } {
  if (!box) return { k: 1, x: 0, y: 0 };
  const [x0, y0, x1, y1] = box;
  const k = Math.min(
    MAX_ZOOM,
    0.8 *
      Math.min(
        MAP_WIDTH / Math.max(x1 - x0, 0.5),
        MAP_HEIGHT / Math.max(y1 - y0, 0.5),
      ),
  );
  return {
    k,
    x: MAP_WIDTH / 2 - (k * (x0 + x1)) / 2,
    y: MAP_HEIGHT / 2 - (k * (y0 + y1)) / 2,
  };
}

const tipRows = (p: GeoCounts): [string, string][] => [
  [whole.format(p.uniqueViews), "unique views"],
  [whole.format(p.uniqueClicks), "unique clicks"],
  [whole.format(p.signups), p.signups === 1 ? "signup" : "signups"],
];

const byViews = (a: GeoPlace, b: GeoPlace) =>
  b.uniqueViews - a.uniqueViews ||
  b.uniqueClicks - a.uniqueClicks ||
  b.signups - a.signups ||
  a.name.localeCompare(b.name);

export function GeoMap({
  countries,
  regions,
  cities,
  unlocated,
}: {
  countries: GeoPlace[];
  regions: GeoPlace[];
  cities: GeoPlace[];
  unlocated: GeoCounts | null;
}) {
  const [world, setWorld] = useState<Shape[] | null>(null);
  const [states, setStates] = useState<Shape[] | null>(null);
  const [picked, setPicked] = useState<{
    country: string | null;
    region: string | null;
  }>({ country: null, region: null });
  const [tip, setTip] = useState<Tip | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  // The drawing is 960 units wide but shown at whatever width the card
  // allows. Text and dots are meant to stay the same size on screen at every
  // width and zoom, so they need to know how many screen pixels one map unit
  // currently covers.
  const [frameWidth, setFrameWidth] = useState(0);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setFrameWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A place picked under one date range may have no activity in the next.
  const country = countries.some((c) => c.id === picked.country)
    ? picked.country
    : null;
  const countryRegions = useMemo(
    () => regions.filter((r) => r.country === country).sort(byViews),
    [regions, country],
  );
  const region =
    country &&
    picked.region &&
    countryRegions.some((r) => r.region === picked.region)
      ? picked.region
      : null;

  useEffect(() => {
    let current = true;
    import("@/lib/geo/world-map.json").then((file) => {
      if (current) setWorld(file.default.countries);
    });
    return () => {
      current = false;
    };
  }, []);

  const needsStates = country === "US";
  useEffect(() => {
    if (!needsStates) return;
    let current = true;
    import("@/lib/geo/us-states.json").then((file) => {
      if (current) setStates(file.default.states);
    });
    return () => {
      current = false;
    };
  }, [needsStates]);

  const stateShapes = country === "US" ? states : null;
  // Guarded on purpose: a few disputed areas have no code, and a bare
  // find() for a null country would match the first of them.
  const countryShape = country
    ? (world?.find((s) => s.code === country) ?? null)
    : null;
  const regionShape = region
    ? (stateShapes?.find((s) => s.code === region) ?? null)
    : null;

  const placedCities = useMemo(
    () =>
      cities
        .filter(
          (c) =>
            c.country === country &&
            (region === null || c.region === region) &&
            c.x !== null &&
            c.y !== null,
        )
        .sort(byViews),
    [cities, country, region],
  );
  const listedCities = useMemo(
    () =>
      cities
        .filter(
          (c) =>
            c.country === country && (region === null || c.region === region),
        )
        .sort(byViews),
    [cities, country, region],
  );

  // Dots stand in for shapes wherever there are none to color: a state that
  // has been opened, or a country without state outlines.
  const showDots = country !== null && (region !== null || !stateShapes);

  // Where to zoom: the opened state, else the opened country. A region with
  // no outline of its own zooms to the cities found in it.
  let focus: number[] | null = null;
  if (regionShape) {
    focus = regionShape.box;
  } else if (region && placedCities.length > 0) {
    const xs = placedCities.map((c) => c.x as number);
    const ys = placedCities.map((c) => c.y as number);
    // Leave a margin a quarter of the country's size around the cities: a
    // region with one city would otherwise zoom until nothing but the dot
    // is left on screen.
    const [cx0, cy0, cx1, cy1] = countryShape?.box ?? [0, 0, 12, 12];
    const margin = Math.max(3, 0.25 * Math.max(cx1 - cx0, cy1 - cy0));
    focus = [
      Math.min(...xs) - margin,
      Math.min(...ys) - margin,
      Math.max(...xs) + margin,
      Math.max(...ys) + margin,
    ];
  } else if (countryShape) {
    focus = countryShape.box;
  }
  const zoom = zoomTo(focus);
  // Screen pixels per map unit right now (1 until the frame is measured).
  const px = zoom.k * (frameWidth > 0 ? frameWidth / MAP_WIDTH : 1);

  const countryById = useMemo(
    () => new Map(countries.map((c) => [c.id, c])),
    [countries],
  );
  const regionByCode = useMemo(
    () => new Map(countryRegions.map((r) => [r.region, r])),
    [countryRegions],
  );
  const worldClasses = useMemo(
    () => shadeClasses(Math.max(0, ...countries.map((c) => c.uniqueViews))),
    [countries],
  );
  const regionClasses = useMemo(
    () =>
      shadeClasses(Math.max(0, ...countryRegions.map((r) => r.uniqueViews))),
    [countryRegions],
  );
  const maxCityViews = Math.max(1, ...placedCities.map((c) => c.uniqueViews));

  function showTip(
    event: React.PointerEvent,
    title: string,
    counts: GeoCounts | undefined,
  ) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const left = event.clientX - box.left;
    const top = event.clientY - box.top;
    setTip({
      title,
      rows: counts ? tipRows(counts) : [],
      left,
      top,
      flipX: left > box.width / 2,
      flipY: top > box.height / 2,
    });
  }

  // ---------- what the map draws ----------
  const legend = !country
    ? worldClasses
    : stateShapes && !region
      ? regionClasses
      : null;

  // A number is written on a shape only when the shape, at the current zoom,
  // is comfortably bigger than the text.
  const labels: {
    key: string;
    text: string;
    x: number;
    y: number;
    shade: number;
  }[] = [];
  const addLabel = (shape: Shape, value: number, shade: number) => {
    if (value <= 0) return;
    const text = shortNumber(value);
    const [x0, y0, x1, y1] = shape.box;
    const fits =
      (x1 - x0) * px >= text.length * 7.5 + 12 && (y1 - y0) * px >= 20;
    if (fits) {
      labels.push({
        key: shape.code ?? shape.name,
        text,
        x: shape.c[0],
        y: shape.c[1],
        shade,
      });
    }
  };
  if (!country && world) {
    for (const shape of world) {
      const place = shape.code ? countryById.get(shape.code) : undefined;
      if (place) {
        addLabel(
          shape,
          place.uniqueViews,
          shadeFor(place.uniqueViews, worldClasses),
        );
      }
    }
  } else if (stateShapes && !region) {
    for (const shape of stateShapes) {
      const place = regionByCode.get(shape.code);
      if (place) {
        addLabel(
          shape,
          place.uniqueViews,
          shadeFor(place.uniqueViews, regionClasses),
        );
      }
    }
  }

  // ---------- the list beside the map ----------
  let listTitle: string;
  let listPlaces: GeoPlace[];
  let onPick: ((place: GeoPlace) => void) | null;
  const namedRegions = countryRegions.filter((r) => r.region !== null);
  if (!country) {
    listTitle = "Countries";
    listPlaces = [...countries].sort(byViews);
    onPick = (p) => setPicked({ country: p.id, region: null });
  } else if (!region && namedRegions.length > 0) {
    listTitle = country === "US" ? "States" : "States and regions";
    listPlaces = countryRegions;
    onPick = (p) =>
      p.region ? setPicked({ country, region: p.region }) : undefined;
  } else {
    listTitle = "Cities";
    listPlaces = listedCities;
    onPick = null;
  }
  // Cutting a list of 11 down to 10 would hide one row to save one row.
  const shownPlaces =
    listPlaces.length <= LIST_ROWS + 2
      ? listPlaces
      : listPlaces.slice(0, LIST_ROWS);
  const listItems: BarListItem[] = shownPlaces.map((p) => ({
    key: p.id,
    label: p.name,
    value: p.uniqueViews,
    display: whole.format(p.uniqueViews),
    note:
      p.uniqueClicks > 0 || p.signups > 0
        ? `${whole.format(p.uniqueClicks)} clicked, ${whole.format(p.signups)} signed up`
        : undefined,
    onSelect:
      onPick && (p.region !== null || !country)
        ? () => {
            setTip(null);
            onPick(p);
          }
        : undefined,
  }));

  const countryLabel = country
    ? (countryById.get(country)?.name ?? country)
    : null;
  const regionLabel = region
    ? (regionByCode.get(region)?.name ?? region)
    : null;
  const nothingLocated = countries.length === 0;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <div
          ref={frame}
          className="relative overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-950"
          onPointerLeave={() => setTip(null)}
        >
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="img"
            aria-label="Map of unique views by place. The list next to it has the same figures as text."
            className="block h-auto w-full select-none"
          >
            <g
              className="motion-reduce:!transition-none"
              style={{
                transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.k})`,
                transformOrigin: "0 0",
                transition: "transform 700ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {world?.map((shape) => {
                const place = shape.code
                  ? countryById.get(shape.code)
                  : undefined;
                const shade = place
                  ? shadeFor(place.uniqueViews, worldClasses)
                  : 0;
                const opened = country !== null && shape.code === country;
                let fill = "var(--viz-land)";
                if (!country) {
                  if (shade > 0) fill = `var(--viz-seq-${shade})`;
                } else if (opened) {
                  fill = "var(--viz-focus)";
                }
                return (
                  <path
                    key={shape.code ?? shape.name}
                    d={shape.d}
                    fill={fill}
                    opacity={country && !opened ? 0.55 : 1}
                    stroke="var(--viz-surface)"
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    className={`transition-[fill,opacity] duration-300 ${
                      place && !country
                        ? "cursor-pointer hover:brightness-110"
                        : ""
                    }`}
                    onPointerMove={
                      country ? undefined : (e) => showTip(e, shape.name, place)
                    }
                    onClick={
                      place && !country
                        ? () => {
                            setTip(null);
                            setPicked({ country: place.id, region: null });
                          }
                        : undefined
                    }
                  />
                );
              })}

              {/* Countries too small to see at this size (Singapore, Malta)
                  get a dot so their visitors are not invisible. */}
              {!country &&
                world?.map((shape) => {
                  const place = shape.code
                    ? countryById.get(shape.code)
                    : undefined;
                  const [x0, y0, x1, y1] = shape.box;
                  if (!place || (x1 - x0 >= 3 && y1 - y0 >= 3)) return null;
                  const shade = shadeFor(place.uniqueViews, worldClasses);
                  return (
                    <circle
                      key={`dot-${place.id}`}
                      cx={shape.c[0]}
                      cy={shape.c[1]}
                      r={4 / px}
                      fill={
                        shade > 0
                          ? `var(--viz-seq-${shade})`
                          : "var(--viz-land)"
                      }
                      stroke="var(--viz-surface)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onPointerMove={(e) => showTip(e, place.name, place)}
                      onClick={() => {
                        setTip(null);
                        setPicked({ country: place.id, region: null });
                      }}
                    />
                  );
                })}

              {stateShapes?.map((shape) => {
                const place = regionByCode.get(shape.code);
                const shade = place
                  ? shadeFor(place.uniqueViews, regionClasses)
                  : 0;
                const opened = region !== null && shape.code === region;
                let fill = "var(--viz-land)";
                if (!region) {
                  if (shade > 0) fill = `var(--viz-seq-${shade})`;
                } else if (opened) {
                  fill = "var(--viz-focus)";
                }
                const canOpen = Boolean(place) && !opened;
                return (
                  <path
                    key={shape.code}
                    d={shape.d}
                    fill={fill}
                    stroke="var(--viz-surface)"
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    className={`transition-[fill] duration-300 ${
                      canOpen ? "cursor-pointer hover:brightness-110" : ""
                    }`}
                    onPointerMove={(e) => showTip(e, shape.name, place)}
                    onClick={
                      canOpen
                        ? () => {
                            setTip(null);
                            setPicked({ country, region: shape.code });
                          }
                        : undefined
                    }
                  />
                );
              })}

              {showDots &&
                // Largest first, so a small dot is never hidden under a big one.
                placedCities.map((city) => {
                  // Dot AREA grows with the count, so radius goes by its root.
                  const radius =
                    4 + 10 * Math.sqrt(city.uniqueViews / maxCityViews);
                  return (
                    <circle
                      key={city.id}
                      cx={city.x as number}
                      cy={city.y as number}
                      r={radius / px}
                      fill="var(--viz-views)"
                      fillOpacity={0.85}
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      onPointerMove={(e) => showTip(e, city.name, city)}
                    />
                  );
                })}

              <g pointerEvents="none">
                {labels.map((label) => (
                  <text
                    key={label.key}
                    transform={`translate(${label.x} ${label.y}) scale(${1 / px})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={600}
                    fill={`var(--viz-seq-ink-${label.shade || 1})`}
                    // A halo in the shape's own color, so a number that
                    // spills past a narrow shape (Florida) stays readable.
                    stroke={`var(--viz-seq-${label.shade || 1})`}
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {label.text}
                  </text>
                ))}
                {showDots &&
                  placedCities.slice(0, 6).map((city) => (
                    <text
                      key={`name-${city.id}`}
                      transform={`translate(${city.x} ${city.y}) scale(${1 / px})`}
                      x={
                        4 + 10 * Math.sqrt(city.uniqueViews / maxCityViews) + 5
                      }
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={500}
                      className="fill-zinc-900 dark:fill-zinc-100"
                      stroke="var(--viz-surface)"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {city.name} · {shortNumber(city.uniqueViews)}
                    </text>
                  ))}
              </g>
            </g>
          </svg>

          {!world && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              Loading the map…
            </div>
          )}

          {country && (
            <button
              type="button"
              onClick={() => {
                setTip(null);
                setPicked(
                  region
                    ? { country, region: null }
                    : { country: null, region: null },
                );
              }}
              className="absolute left-3 top-3 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-white"
            >
              ← Back to {region ? countryLabel : "the world"}
            </button>
          )}

          {tip && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                left: tip.left,
                top: tip.top,
                transform: `translate(${
                  tip.flipX ? "calc(-100% - 12px)" : "12px"
                }, ${tip.flipY ? "calc(-100% - 12px)" : "12px"})`,
              }}
            >
              <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">
                {tip.title}
              </div>
              {tip.rows.length === 0 ? (
                <div className="text-zinc-500">No visits recorded</div>
              ) : (
                tip.rows.map(([value, label]) => (
                  <div key={label} className="text-zinc-500">
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {value}
                    </span>{" "}
                    {label}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          {legend ? (
            <>
              <span>Unique views:</span>
              {legend.map((c) => (
                <span key={c.step} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: `var(--viz-seq-${c.step})` }}
                  />
                  {c.lo === c.hi
                    ? whole.format(c.lo)
                    : `${whole.format(c.lo)}–${whole.format(c.hi)}`}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: "var(--viz-land)" }}
                />
                none
              </span>
            </>
          ) : (
            <span>Each dot is a city. Bigger dots had more unique views.</span>
          )}
        </div>
      </div>

      {/* Beside the map the list is exactly as tall as the map and scrolls
          inside that height. Otherwise the card would grow and shrink with
          the length of each list, and the page would jump on every drill. */}
      <div className="min-w-0 lg:relative">
        <div className="lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-2">
          <nav
            aria-label="Place"
            className="mb-3 flex flex-wrap items-center gap-1.5 text-sm"
          >
            {country ? (
              <button
                type="button"
                onClick={() => setPicked({ country: null, region: null })}
                className="text-indigo-600 hover:underline dark:text-indigo-300"
              >
                World
              </button>
            ) : (
              <span className="font-semibold">World</span>
            )}
            {country && (
              <>
                <span aria-hidden className="text-zinc-400">
                  /
                </span>
                {region ? (
                  <button
                    type="button"
                    onClick={() => setPicked({ country, region: null })}
                    className="text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    {countryLabel}
                  </button>
                ) : (
                  <span className="font-semibold">{countryLabel}</span>
                )}
              </>
            )}
            {region && (
              <>
                <span aria-hidden className="text-zinc-400">
                  /
                </span>
                <span className="font-semibold">{regionLabel}</span>
              </>
            )}
          </nav>

          <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
            {listTitle} by unique views
          </div>
          {listItems.length > 0 ? (
            <BarList items={listItems} color="var(--viz-views)" />
          ) : (
            <p className="text-sm text-zinc-500">
              {nothingLocated
                ? "No visit in this range has a location yet."
                : "No city was recorded for these visits."}
            </p>
          )}
          {listPlaces.length > shownPlaces.length && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing the top {LIST_ROWS} of {whole.format(listPlaces.length)}.
            </p>
          )}
          {!country && unlocated && (
            <p className="mt-4 text-xs text-zinc-500">
              Not on the map: {whole.format(unlocated.uniqueViews)} unique
              views, {whole.format(unlocated.uniqueClicks)} unique clicks and{" "}
              {whole.format(unlocated.signups)}{" "}
              {unlocated.signups === 1 ? "signup" : "signups"} with no location.
              Location has only been recorded since this map was added.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
