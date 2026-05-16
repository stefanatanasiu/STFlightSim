import type { SceneryRegion } from "./demoRegion";

export type OnlineSceneryFeatureKind = "building" | "road" | "water" | "green";

export interface OnlineSceneryPoint {
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface OnlineSceneryFeature {
  id: number;
  kind: OnlineSceneryFeatureKind;
  points: OnlineSceneryPoint[];
  tags: Record<string, string>;
  heightMeters: number;
  widthMeters: number;
}

export interface OnlineSceneryData {
  provider: "openstreetmap-overpass";
  attribution: string;
  loadedAtMs: number;
  features: OnlineSceneryFeature[];
}

interface OverpassGeometryPoint {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryPoint[];
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

export async function loadOpenStreetMapScenery(region: SceneryRegion, signal?: AbortSignal): Promise<OnlineSceneryData> {
  const query = buildOverpassQuery(region);
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}`);
  }

  const payload = (await response.json()) as OverpassResponse;
  const features = (payload.elements ?? [])
    .filter((element) => element.type === "way" && element.geometry && element.geometry.length > 1)
    .map((element) => toFeature(element))
    .filter((feature): feature is OnlineSceneryFeature => Boolean(feature))
    .slice(0, region.online.maxFeatures);

  return {
    provider: "openstreetmap-overpass",
    attribution: region.online.attribution,
    loadedAtMs: Date.now(),
    features
  };
}

function buildOverpassQuery(region: SceneryRegion): string {
  const latitudeMeters = 1852 * 60;
  const longitudeMeters = latitudeMeters * Math.cos((region.origin.latitudeDeg * Math.PI) / 180);
  const latitudeDelta = region.online.radiusMeters / latitudeMeters;
  const longitudeDelta = region.online.radiusMeters / longitudeMeters;
  const south = region.origin.latitudeDeg - latitudeDelta;
  const west = region.origin.longitudeDeg - longitudeDelta;
  const north = region.origin.latitudeDeg + latitudeDelta;
  const east = region.origin.longitudeDeg + longitudeDelta;
  const bbox = `${south},${west},${north},${east}`;

  return `
[out:json][timeout:12];
(
  way["building"](${bbox});
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|unclassified|living_street"](${bbox});
  way["natural"="water"](${bbox});
  way["waterway"](${bbox});
  way["landuse"~"forest|grass|meadow|recreation_ground|residential|commercial|industrial"](${bbox});
  way["leisure"~"park|marina|golf_course"](${bbox});
);
out geom;
`;
}

function toFeature(element: OverpassElement): OnlineSceneryFeature | null {
  const tags = element.tags ?? {};
  const geometry = element.geometry ?? [];
  const kind = classifyFeature(tags);

  if (!kind) {
    return null;
  }

  return {
    id: element.id,
    kind,
    points: geometry.map((point) => ({ latitudeDeg: point.lat, longitudeDeg: point.lon })),
    tags,
    heightMeters: getFeatureHeightMeters(kind, tags, element.id),
    widthMeters: getFeatureWidthMeters(kind, tags)
  };
}

function classifyFeature(tags: Record<string, string>): OnlineSceneryFeatureKind | null {
  if (tags.building) {
    return "building";
  }

  if (tags.highway) {
    return "road";
  }

  if (tags.natural === "water" || tags.waterway) {
    return "water";
  }

  if (tags.landuse || tags.leisure) {
    return "green";
  }

  return null;
}

function getFeatureHeightMeters(kind: OnlineSceneryFeatureKind, tags: Record<string, string>, id: number): number {
  if (kind !== "building") {
    return 0.12;
  }

  const explicitHeight = parseHeight(tags.height);
  if (explicitHeight) {
    return explicitHeight;
  }

  const levels = Number.parseFloat(tags["building:levels"] ?? "");
  if (Number.isFinite(levels) && levels > 0) {
    return Math.min(90, levels * 3.3);
  }

  return 7 + (id % 8) * 2.3;
}

function getFeatureWidthMeters(kind: OnlineSceneryFeatureKind, tags: Record<string, string>): number {
  if (kind !== "road") {
    return 0;
  }

  switch (tags.highway) {
    case "motorway":
    case "trunk":
      return 22;
    case "primary":
      return 16;
    case "secondary":
      return 12;
    case "tertiary":
      return 9;
    case "service":
      return 5;
    default:
      return 7;
  }
}

function parseHeight(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace("m", "").replace("meters", "").trim();
  const height = Number.parseFloat(normalized);
  return Number.isFinite(height) && height > 0 ? Math.min(140, height) : null;
}