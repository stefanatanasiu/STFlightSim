import type { AircraftCategory } from "@stflightsim/shared";

export type AircraftId = "c172-sp-dev" | "f16c-block50-dev" | "a320-200-dev";
export type AircraftVisualModel = "c172" | "f16" | "a320";
export type EngineModel = "piston" | "turbofan" | "afterburning-turbofan";

export interface AircraftFlightTuning {
  bankAuthorityDeg: number;
  pitchAuthorityDeg: number;
  trimAuthorityDeg: number;
  throttlePitchCouplingDeg: number;
  groundPitchResponse: number;
  airPitchResponse: number;
  rollResponse: number;
  stallAoADeg: number;
  liftAoAOffsetDeg: number;
  liftAoARangeDeg: number;
  minLiftFactor: number;
  maxLiftFactor: number;
  dragLinear: number;
  dragQuadratic: number;
  inducedDragFactor: number;
  flapDragFactor: number;
  bankDragFactor: number;
  thrustMaxAccelKts: number;
  thrustMinAccelKts: number;
  thrustSpeedDecay: number;
  brakeDragGround: number;
  brakeDragAir: number;
  rollingFriction: number;
  windDragFactor: number;
  climbPenaltyFpm: number;
  pitchClimbFactor: number;
  bestRateWindowKts: number;
  levelPowerRequired: number;
  excessPowerFpm: number;
  liftFpmFactor: number;
  flapSinkFpmPerDeg: number;
  stallSinkFpm: number;
  stallSinkAoaFactor: number;
  maxSinkFpm: number;
  maxClimbFpm: number;
  liftoffVerticalSpeedFpm: number;
  groundTurnRateDegPerSec: number;
  rudderTurnRateDegPerSec: number;
  airborneTurnMinSpeedKts: number;
  powerOffDecelKts: number;
  maxSpeedMarginKts: number;
  positiveGLimit: number;
}

export interface AircraftEngineProfile {
  model: EngineModel;
  primaryLabel: string;
  primarySuffix?: string;
  idlePrimary: number;
  maxPrimary: number;
  ramRisePerKnot: number;
  primaryResponse: number;
  secondaryLabel: string;
  secondarySuffix?: string;
  idleSecondary: number;
  maxSecondary: number;
  minFuelFlowGph: number;
  maxFuelFlowGph: number;
}

export interface AircraftVisualProfile {
  model: AircraftVisualModel;
  lengthMeters: number;
  wingspanMeters: number;
  heightMeters: number;
  cockpitForwardMeters: number;
  cockpitHeightMeters: number;
  chaseDistanceMeters: number;
  chaseHeightMeters: number;
  chaseLookAheadMeters: number;
}

export interface AircraftProfile {
  id: AircraftId;
  displayName: string;
  shortName: string;
  category: AircraftCategory;
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
  engine: AircraftEngineProfile;
  flight: AircraftFlightTuning;
  visual: AircraftVisualProfile;
}

export const C172_PROFILE: AircraftProfile = {
  id: "c172-sp-dev",
  displayName: "Cessna 172S Skyhawk",
  shortName: "C172",
  category: "piston",
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
  engine: {
    model: "piston",
    primaryLabel: "RPM",
    idlePrimary: 650,
    maxPrimary: 2700,
    ramRisePerKnot: 1.1,
    primaryResponse: 3.2,
    secondaryLabel: "MP",
    secondarySuffix: "inHg",
    idleSecondary: 10,
    maxSecondary: 28.5,
    minFuelFlowGph: 0.6,
    maxFuelFlowGph: 10.4
  },
  flight: {
    bankAuthorityDeg: 46,
    pitchAuthorityDeg: 10,
    trimAuthorityDeg: 7,
    throttlePitchCouplingDeg: 1.4,
    groundPitchResponse: 1.25,
    airPitchResponse: 1.75,
    rollResponse: 2.2,
    stallAoADeg: 17,
    liftAoAOffsetDeg: 4,
    liftAoARangeDeg: 11,
    minLiftFactor: 0.18,
    maxLiftFactor: 1.35,
    dragLinear: 0.011,
    dragQuadratic: 0.0002,
    inducedDragFactor: 0.03,
    flapDragFactor: 0.019,
    bankDragFactor: 0.0045,
    thrustMaxAccelKts: 5.15,
    thrustMinAccelKts: 1.4,
    thrustSpeedDecay: 0.0022,
    brakeDragGround: 7.5,
    brakeDragAir: 0.08,
    rollingFriction: 0.22,
    windDragFactor: 0.01,
    climbPenaltyFpm: 2400,
    pitchClimbFactor: 0.78,
    bestRateWindowKts: 115,
    levelPowerRequired: 0.52,
    excessPowerFpm: 680,
    liftFpmFactor: 250,
    flapSinkFpmPerDeg: 9.5,
    stallSinkFpm: 1300,
    stallSinkAoaFactor: 110,
    maxSinkFpm: 2200,
    maxClimbFpm: 1080,
    liftoffVerticalSpeedFpm: 250,
    groundTurnRateDegPerSec: 18,
    rudderTurnRateDegPerSec: 3.5,
    airborneTurnMinSpeedKts: 45,
    powerOffDecelKts: 0.25,
    maxSpeedMarginKts: 25,
    positiveGLimit: 3.8
  },
  visual: {
    model: "c172",
    lengthMeters: 8.3,
    wingspanMeters: 11,
    heightMeters: 2.7,
    cockpitForwardMeters: 1.9,
    cockpitHeightMeters: 2.3,
    chaseDistanceMeters: 38,
    chaseHeightMeters: 12,
    chaseLookAheadMeters: 14
  }
};

export const F16C_PROFILE: AircraftProfile = {
  id: "f16c-block50-dev",
  displayName: "F-16C Fighting Falcon",
  shortName: "F-16C",
  category: "fighter",
  emptyWeightLb: 20300,
  maxGrossWeightLb: 42300,
  fuelCapacityGallons: 1050,
  usableFuelGallons: 985,
  wingAreaSqFt: 300,
  cleanStallSpeedKts: 145,
  fullFlapStallSpeedKts: 128,
  neverExceedSpeedKts: 800,
  rotationSpeedKts: 155,
  bestRateClimbKts: 350,
  cruiseSpeedKts: 480,
  flapSettingsDeg: [0, 8, 16, 25],
  engine: {
    model: "afterburning-turbofan",
    primaryLabel: "N1",
    primarySuffix: "%",
    idlePrimary: 62,
    maxPrimary: 110,
    ramRisePerKnot: 0.01,
    primaryResponse: 4.8,
    secondaryLabel: "EGT",
    secondarySuffix: "C",
    idleSecondary: 420,
    maxSecondary: 935,
    minFuelFlowGph: 420,
    maxFuelFlowGph: 8200
  },
  flight: {
    bankAuthorityDeg: 82,
    pitchAuthorityDeg: 22,
    trimAuthorityDeg: 8,
    throttlePitchCouplingDeg: 2.2,
    groundPitchResponse: 1.65,
    airPitchResponse: 4.4,
    rollResponse: 6.2,
    stallAoADeg: 25,
    liftAoAOffsetDeg: 2,
    liftAoARangeDeg: 18,
    minLiftFactor: 0.1,
    maxLiftFactor: 1.7,
    dragLinear: 0.0045,
    dragQuadratic: 0.000032,
    inducedDragFactor: 0.018,
    flapDragFactor: 0.024,
    bankDragFactor: 0.0028,
    thrustMaxAccelKts: 20.5,
    thrustMinAccelKts: 3.8,
    thrustSpeedDecay: 0.006,
    brakeDragGround: 13.5,
    brakeDragAir: 0.16,
    rollingFriction: 0.3,
    windDragFactor: 0.005,
    climbPenaltyFpm: 8200,
    pitchClimbFactor: 0.98,
    bestRateWindowKts: 260,
    levelPowerRequired: 0.34,
    excessPowerFpm: 42000,
    liftFpmFactor: 900,
    flapSinkFpmPerDeg: 13,
    stallSinkFpm: 6500,
    stallSinkAoaFactor: 260,
    maxSinkFpm: 18000,
    maxClimbFpm: 36000,
    liftoffVerticalSpeedFpm: 850,
    groundTurnRateDegPerSec: 10,
    rudderTurnRateDegPerSec: 8,
    airborneTurnMinSpeedKts: 120,
    powerOffDecelKts: 0.55,
    maxSpeedMarginKts: 120,
    positiveGLimit: 9
  },
  visual: {
    model: "f16",
    lengthMeters: 15.1,
    wingspanMeters: 9.96,
    heightMeters: 5.1,
    cockpitForwardMeters: 4.8,
    cockpitHeightMeters: 2.9,
    chaseDistanceMeters: 62,
    chaseHeightMeters: 18,
    chaseLookAheadMeters: 24
  }
};

export const A320_PROFILE: AircraftProfile = {
  id: "a320-200-dev",
  displayName: "Airbus A320-200",
  shortName: "A320",
  category: "airliner",
  emptyWeightLb: 93900,
  maxGrossWeightLb: 169750,
  fuelCapacityGallons: 6400,
  usableFuelGallons: 6260,
  wingAreaSqFt: 1317,
  cleanStallSpeedKts: 139,
  fullFlapStallSpeedKts: 106,
  neverExceedSpeedKts: 350,
  rotationSpeedKts: 145,
  bestRateClimbKts: 250,
  cruiseSpeedKts: 450,
  flapSettingsDeg: [0, 10, 20, 35],
  engine: {
    model: "turbofan",
    primaryLabel: "N1",
    primarySuffix: "%",
    idlePrimary: 22,
    maxPrimary: 104,
    ramRisePerKnot: 0.004,
    primaryResponse: 2.1,
    secondaryLabel: "EGT",
    secondarySuffix: "C",
    idleSecondary: 330,
    maxSecondary: 860,
    minFuelFlowGph: 250,
    maxFuelFlowGph: 2550
  },
  flight: {
    bankAuthorityDeg: 35,
    pitchAuthorityDeg: 12,
    trimAuthorityDeg: 5,
    throttlePitchCouplingDeg: 0.9,
    groundPitchResponse: 0.75,
    airPitchResponse: 1.08,
    rollResponse: 1.35,
    stallAoADeg: 16,
    liftAoAOffsetDeg: 2.5,
    liftAoARangeDeg: 12.5,
    minLiftFactor: 0.16,
    maxLiftFactor: 1.42,
    dragLinear: 0.0062,
    dragQuadratic: 0.000045,
    inducedDragFactor: 0.022,
    flapDragFactor: 0.031,
    bankDragFactor: 0.003,
    thrustMaxAccelKts: 7.2,
    thrustMinAccelKts: 2.1,
    thrustSpeedDecay: 0.0058,
    brakeDragGround: 10.8,
    brakeDragAir: 0.1,
    rollingFriction: 0.42,
    windDragFactor: 0.006,
    climbPenaltyFpm: 5200,
    pitchClimbFactor: 0.68,
    bestRateWindowKts: 170,
    levelPowerRequired: 0.58,
    excessPowerFpm: 5600,
    liftFpmFactor: 360,
    flapSinkFpmPerDeg: 11,
    stallSinkFpm: 2400,
    stallSinkAoaFactor: 150,
    maxSinkFpm: 6000,
    maxClimbFpm: 4300,
    liftoffVerticalSpeedFpm: 420,
    groundTurnRateDegPerSec: 5.8,
    rudderTurnRateDegPerSec: 2.2,
    airborneTurnMinSpeedKts: 130,
    powerOffDecelKts: 0.36,
    maxSpeedMarginKts: 40,
    positiveGLimit: 2.7
  },
  visual: {
    model: "a320",
    lengthMeters: 37.6,
    wingspanMeters: 34.1,
    heightMeters: 11.8,
    cockpitForwardMeters: 15.8,
    cockpitHeightMeters: 5.7,
    chaseDistanceMeters: 115,
    chaseHeightMeters: 28,
    chaseLookAheadMeters: 48
  }
};

export const AIRCRAFT_PROFILES: AircraftProfile[] = [C172_PROFILE, F16C_PROFILE, A320_PROFILE];
export const DEFAULT_AIRCRAFT_PROFILE = C172_PROFILE;
export const DEFAULT_AIRCRAFT_PROFILE_ID: AircraftId = DEFAULT_AIRCRAFT_PROFILE.id;

export function getAircraftProfile(aircraftId: string): AircraftProfile | undefined {
  return AIRCRAFT_PROFILES.find((profile) => profile.id === aircraftId);
}
