import type { GeodeticPoint } from "@stflightsim/shared";

export type SceneryRegionId = "egll-city" | "lowi-alpine" | "tncm-coastal" | "kbfioffline";
export type SceneryRegionKind = "city" | "mountain" | "coastal" | "training";

export interface SceneryRunway {
  id: string;
  name: string;
  center: GeodeticPoint;
  headingDeg: number;
  lengthMeters: number;
  widthMeters: number;
  thresholdOffsetMeters: number;
}

export interface SceneryRegion {
  id: SceneryRegionId;
  name: string;
  shortName: string;
  airportName: string;
  description: string;
  kind: SceneryRegionKind;
  origin: GeodeticPoint;
  runway: SceneryRunway;
  worldSizeMeters: number;
  online: {
    provider: "openstreetmap-overpass";
    enabled: boolean;
    radiusMeters: number;
    maxFeatures: number;
    attribution: string;
  };
  procedural: {
    urbanDensity: number;
    treeDensity: number;
    roadDensity: number;
    waterCoverage: number;
    terrainRelief: number;
    airportScale: number;
  };
}

export const SCENERY_REGIONS: SceneryRegion[] = [
  {
    id: "egll-city",
    name: "London Heathrow City",
    shortName: "Heathrow",
    airportName: "London Heathrow Airport",
    description: "Large city airport surrounded by dense suburbs, terminals, motorways, reservoirs, and live OpenStreetMap vector scenery when online.",
    kind: "city",
    origin: {
      latitudeDeg: 51.47002,
      longitudeDeg: -0.454295,
      altitudeFt: 83
    },
    runway: {
      id: "egll27l09r",
      name: "27L / 09R",
      center: {
        latitudeDeg: 51.4648,
        longitudeDeg: -0.4344,
        altitudeFt: 83
      },
      headingDeg: 270,
      lengthMeters: 3901,
      widthMeters: 50,
      thresholdOffsetMeters: 1700
    },
    worldSizeMeters: 18000,
    online: {
      provider: "openstreetmap-overpass",
      enabled: true,
      radiusMeters: 3200,
      maxFeatures: 900,
      attribution: "Scenery vectors from OpenStreetMap contributors via Overpass API."
    },
    procedural: {
      urbanDensity: 1,
      treeDensity: 0.45,
      roadDensity: 1,
      waterCoverage: 0.18,
      terrainRelief: 0.12,
      airportScale: 1.35
    }
  },
  {
    id: "lowi-alpine",
    name: "Innsbruck Alpine Valley",
    shortName: "Innsbruck",
    airportName: "Innsbruck Airport",
    description: "Mountain-valley airport with steep surrounding ridges, villages, forested slopes, approach lights, and optional live OSM roads/buildings.",
    kind: "mountain",
    origin: {
      latitudeDeg: 47.2602,
      longitudeDeg: 11.3439,
      altitudeFt: 1907
    },
    runway: {
      id: "lowi0826",
      name: "08 / 26",
      center: {
        latitudeDeg: 47.2602,
        longitudeDeg: 11.3439,
        altitudeFt: 1907
      },
      headingDeg: 260,
      lengthMeters: 2000,
      widthMeters: 45,
      thresholdOffsetMeters: 840
    },
    worldSizeMeters: 16000,
    online: {
      provider: "openstreetmap-overpass",
      enabled: true,
      radiusMeters: 2700,
      maxFeatures: 700,
      attribution: "Scenery vectors from OpenStreetMap contributors via Overpass API."
    },
    procedural: {
      urbanDensity: 0.34,
      treeDensity: 1,
      roadDensity: 0.5,
      waterCoverage: 0.08,
      terrainRelief: 1,
      airportScale: 0.72
    }
  },
  {
    id: "tncm-coastal",
    name: "Princess Juliana Coastal",
    shortName: "St Maarten",
    airportName: "Princess Juliana International Airport",
    description: "Island airport with beach approach, turquoise water, marina detail, resort blocks, roads, and optional live OSM coastline vectors.",
    kind: "coastal",
    origin: {
      latitudeDeg: 18.04095,
      longitudeDeg: -63.1089,
      altitudeFt: 13
    },
    runway: {
      id: "tncm1028",
      name: "10 / 28",
      center: {
        latitudeDeg: 18.04095,
        longitudeDeg: -63.1089,
        altitudeFt: 13
      },
      headingDeg: 100,
      lengthMeters: 2300,
      widthMeters: 45,
      thresholdOffsetMeters: 980
    },
    worldSizeMeters: 13000,
    online: {
      provider: "openstreetmap-overpass",
      enabled: true,
      radiusMeters: 2600,
      maxFeatures: 650,
      attribution: "Scenery vectors from OpenStreetMap contributors via Overpass API."
    },
    procedural: {
      urbanDensity: 0.42,
      treeDensity: 0.58,
      roadDensity: 0.44,
      waterCoverage: 0.62,
      terrainRelief: 0.24,
      airportScale: 0.78
    }
  },
  {
    id: "kbfioffline",
    name: "Seattle Training Basin",
    shortName: "Seattle",
    airportName: "Boeing Field / King County International",
    description: "Offline fallback training field with procedural city blocks, water, roads, trees, and airport objects.",
    kind: "training",
    origin: {
      latitudeDeg: 47.52997,
      longitudeDeg: -122.30194,
      altitudeFt: 21
    },
    runway: {
      id: "kbfirwy14r32l",
      name: "14R / 32L",
      center: {
        latitudeDeg: 47.52997,
        longitudeDeg: -122.30194,
        altitudeFt: 21
      },
      headingDeg: 134,
      lengthMeters: 3047,
      widthMeters: 61,
      thresholdOffsetMeters: 1320
    },
    worldSizeMeters: 14000,
    online: {
      provider: "openstreetmap-overpass",
      enabled: false,
      radiusMeters: 2400,
      maxFeatures: 500,
      attribution: "Offline procedural scenery."
    },
    procedural: {
      urbanDensity: 0.56,
      treeDensity: 0.65,
      roadDensity: 0.62,
      waterCoverage: 0.22,
      terrainRelief: 0.28,
      airportScale: 1
    }
  }
];

export const DEFAULT_SCENERY_REGION_ID: SceneryRegionId = "egll-city";
export const DEFAULT_SCENERY_REGION = SCENERY_REGIONS.find((region) => region.id === DEFAULT_SCENERY_REGION_ID) ?? SCENERY_REGIONS[0];
export const DEMO_REGION = DEFAULT_SCENERY_REGION;

export function getSceneryRegion(regionId: string): SceneryRegion | undefined {
  return SCENERY_REGIONS.find((region) => region.id === regionId);
}
