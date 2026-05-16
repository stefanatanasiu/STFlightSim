export const FEET_PER_METER = 3.280839895;
export const METERS_PER_FOOT = 1 / FEET_PER_METER;
export const METERS_PER_NAUTICAL_MILE = 1852;
export const FEET_PER_NAUTICAL_MILE = 6076.11549;
export const KNOTS_TO_METERS_PER_SECOND = 0.514444444;
export const METERS_PER_SECOND_TO_KNOTS = 1 / KNOTS_TO_METERS_PER_SECOND;

export function feetToMeters(value: number): number {
  return value * METERS_PER_FOOT;
}

export function metersToFeet(value: number): number {
  return value * FEET_PER_METER;
}

export function knotsToMetersPerSecond(value: number): number {
  return value * KNOTS_TO_METERS_PER_SECOND;
}

export function metersPerSecondToKnots(value: number): number {
  return value * METERS_PER_SECOND_TO_KNOTS;
}
