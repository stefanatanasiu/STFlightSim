export type MagnetoState = "off" | "left" | "right" | "both";
export type CameraViewMode = "pilot" | "cockpit" | "chase";
export type AircraftCategory = "piston" | "fighter" | "airliner";

export interface AircraftControls {
  elevator: number;
  aileron: number;
  rudder: number;
  throttle: number;
  mixture: number;
  elevatorTrim: number;
  flapsIndex: number;
  brakeLeft: number;
  brakeRight: number;
  parkingBrake: boolean;
  battery: boolean;
  alternator: boolean;
  magnetos: MagnetoState;
  starter: boolean;
}

export const DEFAULT_AIRCRAFT_CONTROLS: AircraftControls = {
  elevator: 0,
  aileron: 0,
  rudder: 0,
  throttle: 0.15,
  mixture: 1,
  elevatorTrim: 0,
  flapsIndex: 0,
  brakeLeft: 0,
  brakeRight: 0,
  parkingBrake: false,
  battery: true,
  alternator: true,
  magnetos: "both",
  starter: false
};

export interface AircraftTelemetry {
  timestampMs: number;
  aircraftId: string;
  aircraftName: string;
  aircraftShortName: string;
  aircraftCategory: AircraftCategory;
  simTimeSec: number;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeFt: number;
  groundElevationFt: number;
  pitchDeg: number;
  bankDeg: number;
  headingDeg: number;
  airspeedKts: number;
  groundSpeedKts: number;
  verticalSpeedFpm: number;
  angleOfAttackDeg: number;
  gLoad: number;
  rpm: number;
  manifoldPressureInHg: number;
  enginePrimaryLabel: string;
  enginePrimaryValue: number;
  enginePrimaryMax: number;
  enginePrimarySuffix?: string;
  engineSecondaryLabel: string;
  engineSecondaryValue: number;
  engineSecondaryMax: number;
  engineSecondarySuffix?: string;
  fuelGallons: number;
  fuelCapacityGallons: number;
  fuelFlowGph: number;
  maxFuelFlowGph: number;
  flapsDeg: number;
  throttle: number;
  mixture: number;
  elevatorTrim: number;
  onGround: boolean;
  engineRunning: boolean;
  stalled: boolean;
  overspeed: boolean;
  warning: string | null;
}

export interface EnvironmentState {
  windDirectionDeg: number;
  windSpeedKts: number;
  turbulence: number;
  temperatureC: number;
  altimeterInHg: number;
}

export const STANDARD_ENVIRONMENT: EnvironmentState = {
  windDirectionDeg: 210,
  windSpeedKts: 5,
  turbulence: 0.05,
  temperatureC: 15,
  altimeterInHg: 29.92
};

export type SimulationStatus = "starting" | "running" | "paused" | "stopped" | "error";

export type SimulationInboundMessage =
  | { type: "start" }
  | { type: "reset" }
  | { type: "set-region"; regionId: string }
  | { type: "set-aircraft"; aircraftId: string }
  | { type: "set-controls"; controls: AircraftControls }
  | { type: "set-paused"; paused: boolean }
  | { type: "set-environment"; environment: EnvironmentState };

export type SimulationOutboundMessage =
  | { type: "telemetry"; telemetry: AircraftTelemetry }
  | { type: "status"; status: SimulationStatus; message?: string };
