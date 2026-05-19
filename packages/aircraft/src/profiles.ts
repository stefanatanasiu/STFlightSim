import type { AircraftCategory } from "@stflightsim/shared";

export type AircraftId = "c172-sp-dev" | "f16c-block50-dev" | "a320-200-dev" | "a330-300-dev" | "a380-800-dev" | "b747-400-dev";
export type AircraftVisualModel = "c172" | "f16" | "a320" | "a330" | "a380" | "b747";
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

export const A330_PROFILE: AircraftProfile = {
  id: "a330-300-dev",
  displayName: "Airbus A330-300",
  shortName: "A330",
  category: "airliner",
  emptyWeightLb: 274500,
  maxGrossWeightLb: 533500,
  fuelCapacityGallons: 25800,
  usableFuelGallons: 25200,
  wingAreaSqFt: 3892,
  cleanStallSpeedKts: 150,
  fullFlapStallSpeedKts: 118,
  neverExceedSpeedKts: 350,
  rotationSpeedKts: 158,
  bestRateClimbKts: 270,
  cruiseSpeedKts: 470,
  flapSettingsDeg: [0, 8, 15, 25, 35],
  engine: {
    model: "turbofan",
    primaryLabel: "N1",
    primarySuffix: "%",
    idlePrimary: 22,
    maxPrimary: 104,
    ramRisePerKnot: 0.0035,
    primaryResponse: 1.8,
    secondaryLabel: "EGT",
    secondarySuffix: "C",
    idleSecondary: 335,
    maxSecondary: 895,
    minFuelFlowGph: 520,
    maxFuelFlowGph: 6400
  },
  flight: {
    bankAuthorityDeg: 30,
    pitchAuthorityDeg: 10.5,
    trimAuthorityDeg: 4.4,
    throttlePitchCouplingDeg: 0.68,
    groundPitchResponse: 0.56,
    airPitchResponse: 0.82,
    rollResponse: 0.82,
    stallAoADeg: 15.8,
    liftAoAOffsetDeg: 2.1,
    liftAoARangeDeg: 13.2,
    minLiftFactor: 0.15,
    maxLiftFactor: 1.48,
    dragLinear: 0.0055,
    dragQuadratic: 0.000033,
    inducedDragFactor: 0.018,
    flapDragFactor: 0.028,
    bankDragFactor: 0.0026,
    thrustMaxAccelKts: 6.25,
    thrustMinAccelKts: 1.7,
    thrustSpeedDecay: 0.0045,
    brakeDragGround: 12.5,
    brakeDragAir: 0.08,
    rollingFriction: 0.5,
    windDragFactor: 0.0054,
    climbPenaltyFpm: 6200,
    pitchClimbFactor: 0.58,
    bestRateWindowKts: 175,
    levelPowerRequired: 0.6,
    excessPowerFpm: 4800,
    liftFpmFactor: 330,
    flapSinkFpmPerDeg: 9.2,
    stallSinkFpm: 2600,
    stallSinkAoaFactor: 145,
    maxSinkFpm: 5600,
    maxClimbFpm: 3600,
    liftoffVerticalSpeedFpm: 330,
    groundTurnRateDegPerSec: 4.4,
    rudderTurnRateDegPerSec: 1.8,
    airborneTurnMinSpeedKts: 145,
    powerOffDecelKts: 0.28,
    maxSpeedMarginKts: 35,
    positiveGLimit: 2.5
  },
  visual: {
    model: "a330",
    lengthMeters: 63.7,
    wingspanMeters: 60.3,
    heightMeters: 16.8,
    cockpitForwardMeters: 25.5,
    cockpitHeightMeters: 7.3,
    chaseDistanceMeters: 190,
    chaseHeightMeters: 44,
    chaseLookAheadMeters: 78
  }
};

export const A380_PROFILE: AircraftProfile = {
  id: "a380-800-dev",
  displayName: "Airbus A380-800",
  shortName: "A380",
  category: "airliner",
  emptyWeightLb: 610000,
  maxGrossWeightLb: 1268000,
  fuelCapacityGallons: 84600,
  usableFuelGallons: 83000,
  wingAreaSqFt: 9100,
  cleanStallSpeedKts: 158,
  fullFlapStallSpeedKts: 118,
  neverExceedSpeedKts: 340,
  rotationSpeedKts: 165,
  bestRateClimbKts: 270,
  cruiseSpeedKts: 488,
  flapSettingsDeg: [0, 8, 17, 26, 33],
  engine: {
    model: "turbofan",
    primaryLabel: "N1",
    primarySuffix: "%",
    idlePrimary: 22,
    maxPrimary: 104,
    ramRisePerKnot: 0.003,
    primaryResponse: 1.45,
    secondaryLabel: "EGT",
    secondarySuffix: "C",
    idleSecondary: 340,
    maxSecondary: 910,
    minFuelFlowGph: 980,
    maxFuelFlowGph: 14500
  },
  flight: {
    bankAuthorityDeg: 26,
    pitchAuthorityDeg: 10.4,
    trimAuthorityDeg: 3.8,
    throttlePitchCouplingDeg: 0.54,
    groundPitchResponse: 0.38,
    airPitchResponse: 0.58,
    rollResponse: 0.52,
    stallAoADeg: 15.4,
    liftAoAOffsetDeg: 3.4,
    liftAoARangeDeg: 11.8,
    minLiftFactor: 0.14,
    maxLiftFactor: 1.62,
    dragLinear: 0.0047,
    dragQuadratic: 0.000024,
    inducedDragFactor: 0.015,
    flapDragFactor: 0.024,
    bankDragFactor: 0.0022,
    thrustMaxAccelKts: 5.7,
    thrustMinAccelKts: 1.42,
    thrustSpeedDecay: 0.00375,
    brakeDragGround: 14.8,
    brakeDragAir: 0.07,
    rollingFriction: 0.62,
    windDragFactor: 0.0048,
    climbPenaltyFpm: 6800,
    pitchClimbFactor: 0.52,
    bestRateWindowKts: 185,
    levelPowerRequired: 0.64,
    excessPowerFpm: 4300,
    liftFpmFactor: 300,
    flapSinkFpmPerDeg: 8.4,
    stallSinkFpm: 2800,
    stallSinkAoaFactor: 135,
    maxSinkFpm: 5200,
    maxClimbFpm: 3100,
    liftoffVerticalSpeedFpm: 270,
    groundTurnRateDegPerSec: 3.2,
    rudderTurnRateDegPerSec: 1.3,
    airborneTurnMinSpeedKts: 155,
    powerOffDecelKts: 0.22,
    maxSpeedMarginKts: 32,
    positiveGLimit: 2.5
  },
  visual: {
    model: "a380",
    lengthMeters: 72.7,
    wingspanMeters: 79.8,
    heightMeters: 24.1,
    cockpitForwardMeters: 29,
    cockpitHeightMeters: 10.4,
    chaseDistanceMeters: 235,
    chaseHeightMeters: 58,
    chaseLookAheadMeters: 92
  }
};

export const B747_PROFILE: AircraftProfile = {
  id: "b747-400-dev",
  displayName: "Boeing 747-400",
  shortName: "B747",
  category: "airliner",
  emptyWeightLb: 404600,
  maxGrossWeightLb: 875000,
  fuelCapacityGallons: 57285,
  usableFuelGallons: 56000,
  wingAreaSqFt: 5825,
  cleanStallSpeedKts: 155,
  fullFlapStallSpeedKts: 122,
  neverExceedSpeedKts: 365,
  rotationSpeedKts: 166,
  bestRateClimbKts: 280,
  cruiseSpeedKts: 493,
  flapSettingsDeg: [0, 10, 20, 25, 30],
  engine: {
    model: "turbofan",
    primaryLabel: "N1",
    primarySuffix: "%",
    idlePrimary: 22,
    maxPrimary: 104,
    ramRisePerKnot: 0.0032,
    primaryResponse: 1.55,
    secondaryLabel: "EGT",
    secondarySuffix: "C",
    idleSecondary: 340,
    maxSecondary: 905,
    minFuelFlowGph: 820,
    maxFuelFlowGph: 11800
  },
  flight: {
    bankAuthorityDeg: 28,
    pitchAuthorityDeg: 9.8,
    trimAuthorityDeg: 4.1,
    throttlePitchCouplingDeg: 0.6,
    groundPitchResponse: 0.43,
    airPitchResponse: 0.68,
    rollResponse: 0.62,
    stallAoADeg: 15.6,
    liftAoAOffsetDeg: 1.9,
    liftAoARangeDeg: 13.3,
    minLiftFactor: 0.145,
    maxLiftFactor: 1.52,
    dragLinear: 0.005,
    dragQuadratic: 0.000027,
    inducedDragFactor: 0.016,
    flapDragFactor: 0.026,
    bankDragFactor: 0.0024,
    thrustMaxAccelKts: 5.95,
    thrustMinAccelKts: 1.5,
    thrustSpeedDecay: 0.004,
    brakeDragGround: 14,
    brakeDragAir: 0.075,
    rollingFriction: 0.58,
    windDragFactor: 0.005,
    climbPenaltyFpm: 6600,
    pitchClimbFactor: 0.53,
    bestRateWindowKts: 180,
    levelPowerRequired: 0.62,
    excessPowerFpm: 4500,
    liftFpmFactor: 315,
    flapSinkFpmPerDeg: 8.8,
    stallSinkFpm: 2750,
    stallSinkAoaFactor: 140,
    maxSinkFpm: 5400,
    maxClimbFpm: 3300,
    liftoffVerticalSpeedFpm: 290,
    groundTurnRateDegPerSec: 3.7,
    rudderTurnRateDegPerSec: 1.5,
    airborneTurnMinSpeedKts: 152,
    powerOffDecelKts: 0.24,
    maxSpeedMarginKts: 38,
    positiveGLimit: 2.5
  },
  visual: {
    model: "b747",
    lengthMeters: 70.7,
    wingspanMeters: 64.4,
    heightMeters: 19.4,
    cockpitForwardMeters: 28.5,
    cockpitHeightMeters: 9.6,
    chaseDistanceMeters: 220,
    chaseHeightMeters: 52,
    chaseLookAheadMeters: 88
  }
};

export const AIRCRAFT_PROFILES: AircraftProfile[] = [C172_PROFILE, F16C_PROFILE, A320_PROFILE, A330_PROFILE, A380_PROFILE, B747_PROFILE];
export const DEFAULT_AIRCRAFT_PROFILE = C172_PROFILE;
export const DEFAULT_AIRCRAFT_PROFILE_ID: AircraftId = DEFAULT_AIRCRAFT_PROFILE.id;

export function getAircraftProfile(aircraftId: string): AircraftProfile | undefined {
  return AIRCRAFT_PROFILES.find((profile) => profile.id === aircraftId);
}
