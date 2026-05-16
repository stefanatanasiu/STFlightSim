import { feetToMeters, METERS_PER_NAUTICAL_MILE } from "./units";

export interface GeodeticPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeFt: number;
}

export interface LocalPointMeters {
  east: number;
  north: number;
  up: number;
}

export function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

export function localMetersBetween(origin: GeodeticPoint, point: GeodeticPoint): LocalPointMeters {
  const latitudeScaleMeters = METERS_PER_NAUTICAL_MILE * 60;
  const longitudeScaleMeters = latitudeScaleMeters * Math.cos(degToRad(origin.latitudeDeg));

  return {
    east: (point.longitudeDeg - origin.longitudeDeg) * longitudeScaleMeters,
    north: (point.latitudeDeg - origin.latitudeDeg) * latitudeScaleMeters,
    up: feetToMeters(point.altitudeFt - origin.altitudeFt)
  };
}

export function offsetGeodetic(origin: GeodeticPoint, eastMeters: number, northMeters: number, upMeters: number): GeodeticPoint {
  const latitudeScaleMeters = METERS_PER_NAUTICAL_MILE * 60;
  const longitudeScaleMeters = latitudeScaleMeters * Math.cos(degToRad(origin.latitudeDeg));

  return {
    latitudeDeg: origin.latitudeDeg + northMeters / latitudeScaleMeters,
    longitudeDeg: origin.longitudeDeg + eastMeters / longitudeScaleMeters,
    altitudeFt: origin.altitudeFt + upMeters * 3.280839895
  };
}

export function advanceGeodetic(point: GeodeticPoint, headingDeg: number, distanceNauticalMiles: number): GeodeticPoint {
  const headingRad = degToRad(headingDeg);
  const northNm = Math.cos(headingRad) * distanceNauticalMiles;
  const eastNm = Math.sin(headingRad) * distanceNauticalMiles;
  const latitudeDeg = point.latitudeDeg + northNm / 60;
  const longitudeDeg = point.longitudeDeg + eastNm / (60 * Math.cos(degToRad(point.latitudeDeg)));

  return {
    ...point,
    latitudeDeg,
    longitudeDeg
  };
}
