export interface AircraftProfile {
  id: string;
  displayName: string;
  emptyWeightLb: number;
  maxGrossWeightLb: number;
  fuelCapacityGallons: number;
  usableFuelGallons: number;
  wingAreaSqFt: number;
  cleanStallSpeedKts: number;
  fullFlapStallSpeedKts: number;
  neverExceedSpeedKts: number;
  rotationSpeedKts: number;
  bestRateClimbKts: number;
  cruiseSpeedKts: number;
  flapSettingsDeg: number[];
  maxRpm: number;
  idleRpm: number;
  maxFuelFlowGph: number;
}

export const C172_PROFILE: AircraftProfile = {
  id: "c172-sp-dev",
  displayName: "Cessna 172 Skyhawk (development model)",
  emptyWeightLb: 1663,
  maxGrossWeightLb: 2550,
  fuelCapacityGallons: 56,
  usableFuelGallons: 53,
  wingAreaSqFt: 174,
  cleanStallSpeedKts: 48,
  fullFlapStallSpeedKts: 40,
  neverExceedSpeedKts: 163,
  rotationSpeedKts: 55,
  bestRateClimbKts: 74,
  cruiseSpeedKts: 122,
  flapSettingsDeg: [0, 10, 20, 30],
  maxRpm: 2700,
  idleRpm: 650,
  maxFuelFlowGph: 10.4
};
