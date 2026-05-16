import { C172_PROFILE } from "@stflightsim/aircraft";
import { DEFAULT_SCENERY_REGION, type SceneryRegion } from "@stflightsim/scenery";
import { advanceGeodetic, clamp, degToRad, lerp, normalizeHeadingDeg, type AircraftControls, type AircraftTelemetry, type EnvironmentState } from "@stflightsim/shared";

export interface SimpleFlightState {
  simTimeSec: number;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeFt: number;
  pitchDeg: number;
  bankDeg: number;
  headingDeg: number;
  airspeedKts: number;
  groundSpeedKts: number;
  verticalSpeedFpm: number;
  angleOfAttackDeg: number;
  gLoad: number;
  rpm: number;
  fuelGallons: number;
  onGround: boolean;
  stalled: boolean;
}

export function createInitialFlightState(region: SceneryRegion = DEFAULT_SCENERY_REGION): SimpleFlightState {
  const runway = region.runway;
  const thresholdHeadingRad = degToRad(runway.headingDeg);
  const northMeters = -Math.cos(thresholdHeadingRad) * runway.thresholdOffsetMeters;
  const eastMeters = -Math.sin(thresholdHeadingRad) * runway.thresholdOffsetMeters;
  const latitudeDeg = runway.center.latitudeDeg + northMeters / (1852 * 60);
  const longitudeDeg = runway.center.longitudeDeg + eastMeters / (1852 * 60 * Math.cos(degToRad(runway.center.latitudeDeg)));

  return {
    simTimeSec: 0,
    latitudeDeg,
    longitudeDeg,
    altitudeFt: runway.center.altitudeFt,
    pitchDeg: 0,
    bankDeg: 0,
    headingDeg: runway.headingDeg,
    airspeedKts: 0,
    groundSpeedKts: 0,
    verticalSpeedFpm: 0,
    angleOfAttackDeg: 0,
    gLoad: 1,
    rpm: C172_PROFILE.idleRpm,
    fuelGallons: C172_PROFILE.usableFuelGallons,
    onGround: true,
    stalled: false
  };
}

export function stepSimpleFlightModel(state: SimpleFlightState, controls: AircraftControls, environment: EnvironmentState, deltaSeconds: number, region: SceneryRegion = DEFAULT_SCENERY_REGION): SimpleFlightState {
  const flapsDeg = C172_PROFILE.flapSettingsDeg[controls.flapsIndex] ?? 0;
  const groundElevationFt = region.runway.center.altitudeFt;
  const mixturePower = controls.mixture > 0.08 ? controls.mixture : 0;
  const engineRunning = controls.battery && controls.magnetos !== "off" && state.fuelGallons > 0 && mixturePower > 0;
  const throttlePower = engineRunning ? controls.throttle * mixturePower : 0;
  const bankTargetDeg = controls.aileron * 46;
  const pitchTargetDeg = controls.elevator * 10 + controls.elevatorTrim * 7 + (state.onGround ? 0 : throttlePower * 1.4) - flapsDeg * 0.035;
  const bankDeg = lerp(state.bankDeg, bankTargetDeg, deltaSeconds * 2.2);
  const pitchDeg = lerp(state.pitchDeg, pitchTargetDeg, deltaSeconds * (state.onGround ? 1.25 : 1.75));
  const bankLoadFactor = 1 / Math.max(Math.cos(degToRad(bankDeg)), 0.45);
  const stallSpeedKts = lerp(C172_PROFILE.cleanStallSpeedKts, C172_PROFILE.fullFlapStallSpeedKts, flapsDeg / 30) * Math.sqrt(bankLoadFactor);
  const flightPathDeg = Math.max(-18, Math.min(18, state.verticalSpeedFpm / Math.max(state.airspeedKts * 101.27, 1) * 57.3));
  const angleOfAttackDeg = pitchDeg - flightPathDeg + controls.elevatorTrim * 1.5 + flapsDeg * 0.04;
  const aoaLift = clamp((angleOfAttackDeg + 4) / 11, 0.18, 1.35);
  const speedRatio = state.airspeedKts / Math.max(stallSpeedKts, 1);
  const liftRatio = speedRatio * speedRatio * aoaLift / bankLoadFactor;
  const stalled = !state.onGround && (angleOfAttackDeg > 17 || state.airspeedKts < stallSpeedKts * 1.04 || liftRatio < 0.62);
  const inducedDrag = Math.max(0, angleOfAttackDeg - 4) * 0.03;
  const drag = 0.011 * state.airspeedKts + 0.0002 * state.airspeedKts * state.airspeedKts + flapsDeg * 0.019 + Math.abs(bankDeg) * 0.0045 + inducedDrag;
  const thrust = throttlePower * Math.max(1.4, 5.15 - state.airspeedKts * 0.0022);
  const brakeDrag = (controls.brakeLeft + controls.brakeRight + (controls.parkingBrake ? 2 : 0)) * (state.onGround ? 7.5 : 0.08);
  const climbPenalty = Math.max(0, state.verticalSpeedFpm) / 2400;
  const rollingFriction = state.onGround ? 0.22 : 0;
  const windFactor = environment.windSpeedKts * 0.01;
  const accelerationKts = thrust - drag - brakeDrag - climbPenalty - rollingFriction - windFactor;
  let airspeedKts = clamp(state.airspeedKts + accelerationKts * deltaSeconds, 0, C172_PROFILE.neverExceedSpeedKts + 25);

  if (!engineRunning) {
    airspeedKts = clamp(airspeedKts - 0.25 * deltaSeconds, 0, 220);
  }

  let verticalSpeedFpm = state.verticalSpeedFpm;
  let altitudeFt = state.altitudeFt;
  let onGround = state.onGround;

  if (onGround) {
    verticalSpeedFpm = 0;
    altitudeFt = groundElevationFt;

    if (airspeedKts > C172_PROFILE.rotationSpeedKts * 0.98 && pitchDeg > 4 && liftRatio > 1.02) {
      onGround = false;
      verticalSpeedFpm = 250;
    }
  } else {
    const pitchClimbFpm = Math.sin(degToRad(pitchDeg)) * airspeedKts * 101.27 * 0.78;
    const bestRateFactor = clamp(1 - Math.abs(airspeedKts - C172_PROFILE.bestRateClimbKts) / 115, 0.35, 1);
    const excessPowerFpm = (throttlePower - 0.52) * 680 * bestRateFactor;
    const liftFpm = (liftRatio - 1) * 250;
    const flapSinkFpm = flapsDeg * 9.5;
    const stallSinkFpm = stalled ? 1300 + Math.max(0, angleOfAttackDeg - 16) * 110 : 0;
    const targetVerticalSpeedFpm = clamp(pitchClimbFpm + excessPowerFpm + liftFpm - flapSinkFpm - stallSinkFpm, -2200, 1080);
    verticalSpeedFpm = lerp(state.verticalSpeedFpm, targetVerticalSpeedFpm, deltaSeconds * 1.55);
    altitudeFt += (verticalSpeedFpm / 60) * deltaSeconds;

    if (altitudeFt <= groundElevationFt && verticalSpeedFpm <= 0) {
      altitudeFt = groundElevationFt;
      verticalSpeedFpm = 0;
      onGround = true;
      airspeedKts = Math.max(0, airspeedKts * 0.94);
    }
  }

  const turnRateDegPerSec = onGround
    ? controls.rudder * clamp(airspeedKts / 12, 0, 1) * 18
    : (1091 * Math.tan(degToRad(bankDeg))) / Math.max(airspeedKts, 45) + controls.rudder * 3.5;
  const headingDeg = normalizeHeadingDeg(state.headingDeg + turnRateDegPerSec * deltaSeconds);
  const groundSpeedKts = onGround ? airspeedKts : Math.max(0, airspeedKts * Math.cos(degToRad(pitchDeg)));
  const position = advanceGeodetic(
    { latitudeDeg: state.latitudeDeg, longitudeDeg: state.longitudeDeg, altitudeFt },
    headingDeg,
    (groundSpeedKts * deltaSeconds) / 3600
  );
  const fuelFlowGph = engineRunning ? lerp(0.6, C172_PROFILE.maxFuelFlowGph, controls.throttle) * mixturePower : 0;
  const fuelGallons = Math.max(0, state.fuelGallons - (fuelFlowGph * deltaSeconds) / 3600);
  const rpmTarget = engineRunning ? C172_PROFILE.idleRpm + throttlePower * (C172_PROFILE.maxRpm - C172_PROFILE.idleRpm) + airspeedKts * 1.1 : 0;
  const rpm = lerp(state.rpm, rpmTarget, deltaSeconds * 3.2);
  const gLoad = clamp(bankLoadFactor + Math.max(0, pitchDeg) / 90 - (stalled ? 0.55 : 0), 0.2, 3.8);

  return {
    simTimeSec: state.simTimeSec + deltaSeconds,
    latitudeDeg: position.latitudeDeg,
    longitudeDeg: position.longitudeDeg,
    altitudeFt,
    pitchDeg,
    bankDeg,
    headingDeg,
    airspeedKts,
    groundSpeedKts,
    verticalSpeedFpm,
    angleOfAttackDeg,
    gLoad,
    rpm,
    fuelGallons,
    onGround,
    stalled
  };
}

export function toTelemetry(state: SimpleFlightState, controls: AircraftControls, environment: EnvironmentState, region: SceneryRegion = DEFAULT_SCENERY_REGION): AircraftTelemetry {
  const flapsDeg = C172_PROFILE.flapSettingsDeg[controls.flapsIndex] ?? 0;
  const engineRunning = controls.battery && controls.magnetos !== "off" && state.fuelGallons > 0 && controls.mixture > 0.08;
  const fuelFlowGph = engineRunning ? lerp(0.6, C172_PROFILE.maxFuelFlowGph, controls.throttle) * controls.mixture : 0;
  const overspeed = state.airspeedKts > C172_PROFILE.neverExceedSpeedKts;
  const lowFuel = state.fuelGallons < 5;
  const warning = state.stalled ? "STALL" : overspeed ? "OVERSPEED" : lowFuel ? "LOW FUEL" : null;

  return {
    timestampMs: performance.now(),
    simTimeSec: state.simTimeSec,
    latitudeDeg: state.latitudeDeg,
    longitudeDeg: state.longitudeDeg,
    altitudeFt: state.altitudeFt,
    groundElevationFt: region.runway.center.altitudeFt,
    pitchDeg: state.pitchDeg,
    bankDeg: state.bankDeg,
    headingDeg: state.headingDeg,
    airspeedKts: state.airspeedKts,
    groundSpeedKts: state.groundSpeedKts,
    verticalSpeedFpm: state.verticalSpeedFpm,
    angleOfAttackDeg: state.angleOfAttackDeg,
    gLoad: state.gLoad,
    rpm: state.rpm,
    manifoldPressureInHg: lerp(10, 28.5, controls.throttle) * controls.mixture,
    fuelGallons: state.fuelGallons,
    fuelFlowGph,
    flapsDeg,
    throttle: controls.throttle,
    mixture: controls.mixture,
    elevatorTrim: controls.elevatorTrim,
    onGround: state.onGround,
    engineRunning,
    stalled: state.stalled,
    overspeed,
    warning
  };
}
