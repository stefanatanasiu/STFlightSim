import type { SceneryRegion } from "./demoRegion";

export type OnlineSceneryDetail = "standard" | "high";
export type OnlineSceneryFeatureKind = "building" | "road" | "water" | "green" | "rail" | "airport";

export interface OpenStreetMapSceneryOptions {
  detail?: OnlineSceneryDetail;
  signal?: AbortSignal;
}

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
  detail: OnlineSceneryDetail;
  attribution: string;
  loadedAtMs: number;
  radiusMeters: number;
  featureLimit: number;
  features: OnlineSceneryFeature[];
}

interface OverpassProfile {
  detail: OnlineSceneryDetail;
  radiusMeters: number;
  maxFeatures: number;
  timeoutSeconds: number;
  queryMode: "standard" | "high" | "reduced";
}

class OverpassHttpError extends Error {
  constructor(readonly status: number) {
    super(getOverpassStatusMessage(status));
  }
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

export async function loadOpenStreetMapScenery(region: SceneryRegion, options: OpenStreetMapSceneryOptions = {}): Promise<OnlineSceneryData> {
  const profiles = getOverpassProfiles(region, options.detail ?? "standard");
  let retriedReducedQuery = false;

  for (let index = 0; index < profiles.length; index += 1) {
    const profile = profiles[index];

    try {
      return await requestOpenStreetMapScenery(region, profile, options);
    } catch (error) {
      if (options.signal?.aborted) {
        throw error;
      }

      if (shouldRetryWithReducedQuery(error, profile, index, profiles)) {
        retriedReducedQuery = true;
        continue;
      }

      throw normalizeOverpassError(error, retriedReducedQuery || profile.queryMode === "reduced");
    }
  }

  throw new Error("OpenStreetMap Overpass did not return scenery data");
}

async function requestOpenStreetMapScenery(region: SceneryRegion, profile: OverpassProfile, options: OpenStreetMapSceneryOptions): Promise<OnlineSceneryData> {
  const query = buildOverpassQuery(region, profile);
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
    signal: options.signal
  });

  if (!response.ok) {
    throw new OverpassHttpError(response.status);
  }

  const payload = (await response.json()) as OverpassResponse;
  const features = (payload.elements ?? [])
    .filter((element) => element.type === "way" && element.geometry && element.geometry.length > 1)
    .map((element) => toFeature(element))
    .filter((feature): feature is OnlineSceneryFeature => Boolean(feature))
    .slice(0, profile.maxFeatures);

  return {
    provider: "openstreetmap-overpass",
    detail: profile.detail,
    attribution: region.online.attribution,
    loadedAtMs: Date.now(),
    radiusMeters: profile.radiusMeters,
    featureLimit: profile.maxFeatures,
    features
  };
}

function getOverpassProfiles(region: SceneryRegion, detail: OnlineSceneryDetail): OverpassProfile[] {
  const primary = getOverpassProfile(region, detail);
  const reduced = getReducedOverpassProfile(region);
  return primary.queryMode === reduced.queryMode && primary.radiusMeters <= reduced.radiusMeters ? [primary] : [primary, reduced];
}

function getOverpassProfile(region: SceneryRegion, detail: OnlineSceneryDetail): OverpassProfile {
  if (detail === "high") {
    return {
      detail,
      radiusMeters: Math.min(5200, Math.round(region.online.radiusMeters * 1.55)),
      maxFeatures: Math.min(2200, Math.round(region.online.maxFeatures * 2.35)),
      timeoutSeconds: 24,
      queryMode: "high"
    };
  }

  return {
    detail,
    radiusMeters: region.online.radiusMeters,
    maxFeatures: region.online.maxFeatures,
    timeoutSeconds: 12,
    queryMode: "standard"
  };
}

function getReducedOverpassProfile(region: SceneryRegion): OverpassProfile {
  return {
    detail: "standard",
    radiusMeters: Math.min(1500, Math.max(900, Math.round(region.online.radiusMeters * 0.45))),
    maxFeatures: Math.min(260, Math.max(120, Math.round(region.online.maxFeatures * 0.3))),
    timeoutSeconds: 8,
    queryMode: "reduced"
  };
}

function buildOverpassQuery(region: SceneryRegion, profile: OverpassProfile): string {
  const latitudeMeters = 1852 * 60;
  const longitudeMeters = latitudeMeters * Math.cos((region.origin.latitudeDeg * Math.PI) / 180);
  const latitudeDelta = profile.radiusMeters / latitudeMeters;
  const longitudeDelta = profile.radiusMeters / longitudeMeters;
  const south = region.origin.latitudeDeg - latitudeDelta;
  const west = region.origin.longitudeDeg - longitudeDelta;
  const north = region.origin.latitudeDeg + latitudeDelta;
  const east = region.origin.longitudeDeg + longitudeDelta;
  const bbox = `${south},${west},${north},${east}`;
  const highDetailWays = profile.queryMode === "high" ? `
  way["highway"~"pedestrian|footway|cycleway|path|track"](${bbox});
  way["railway"~"rail|light_rail|subway|tram"](${bbox});
  way["aeroway"~"runway|taxiway|apron|hangar|terminal"](${bbox});
  way["natural"~"wood|beach|wetland"](${bbox});
  way["leisure"~"park|marina|golf_course|pitch|garden|sports_centre"](${bbox});
  way["amenity"~"parking|school|university|hospital"](${bbox});` : "";

  if (profile.queryMode === "reduced") {
    return `
[out:json][timeout:${profile.timeoutSeconds}];
(
  way["building"](${bbox});
  way["highway"~"motorway|trunk|primary|secondary|tertiary|service"](${bbox});
  way["aeroway"~"runway|taxiway|apron|hangar|terminal"](${bbox});
  way["natural"="water"](${bbox});
  way["waterway"](${bbox});
  way["leisure"~"park|marina"](${bbox});
);
out geom;
`;
  }

  return `
[out:json][timeout:${profile.timeoutSeconds}];
(
  way["building"](${bbox});
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|unclassified|living_street"](${bbox});
  way["natural"="water"](${bbox});
  way["waterway"](${bbox});
  way["landuse"~"forest|grass|meadow|recreation_ground|residential|commercial|industrial"](${bbox});
  way["leisure"~"park|marina|golf_course"](${bbox});${highDetailWays}
);
out geom;
`;
}

function shouldRetryWithReducedQuery(error: unknown, profile: OverpassProfile, index: number, profiles: OverpassProfile[]): boolean {
  return error instanceof OverpassHttpError && [502, 503, 504].includes(error.status) && profile.queryMode !== "reduced" && index < profiles.length - 1;
}

function normalizeOverpassError(error: unknown, retriedReducedQuery: boolean): Error {
  if (error instanceof OverpassHttpError) {
    const suffix = retriedReducedQuery ? " after a smaller retry" : "";
    return new Error(`${getOverpassStatusMessage(error.status)}${suffix}`);
  }

  if (error instanceof TypeError) {
    return new Error("OpenStreetMap Overpass request failed");
  }

  return error instanceof Error ? error : new Error("OpenStreetMap Overpass request failed");
}

function getOverpassStatusMessage(status: number): string {
  switch (status) {
    case 429:
      return "OpenStreetMap Overpass rate limit reached";
    case 502:
    case 503:
      return "OpenStreetMap Overpass is temporarily unavailable";
    case 504:
      return "OpenStreetMap Overpass timed out";
    default:
      return `OpenStreetMap Overpass returned ${status}`;
  }
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

  if (tags.railway) {
    return "rail";
  }

  if (tags.aeroway) {
    return "airport";
  }

  if (tags.natural === "water" || tags.waterway) {
    return "water";
  }

  if (tags.landuse || tags.leisure || tags.amenity || tags.natural) {
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
  if (kind === "rail") {
    return 3.5;
  }

  if (kind === "airport") {
    return tags.aeroway === "runway" ? 28 : tags.aeroway === "taxiway" ? 12 : 0;
  }

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
    case "footway":
    case "cycleway":
    case "path":
      return 2.4;
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