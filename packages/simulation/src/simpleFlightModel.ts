import { DEFAULT_AIRCRAFT_PROFILE, type AircraftProfile } from "@stflightsim/aircraft";
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

export function createInitialFlightState(region: SceneryRegion = DEFAULT_SCENERY_REGION, profile: AircraftProfile = DEFAULT_AIRCRAFT_PROFILE): SimpleFlightState {
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
    rpm: profile.engine.idlePrimary,
    fuelGallons: profile.usableFuelGallons,
    onGround: true,
    stalled: false
  };
}

export function stepSimpleFlightModel(state: SimpleFlightState, controls: AircraftControls, environment: EnvironmentState, deltaSeconds: number, region: SceneryRegion = DEFAULT_SCENERY_REGION, profile: AircraftProfile = DEFAULT_AIRCRAFT_PROFILE): SimpleFlightState {
  const flight = profile.flight;
  const engine = profile.engine;
  const flapsDeg = profile.flapSettingsDeg[controls.flapsIndex] ?? 0;
  const groundElevationFt = region.runway.center.altitudeFt;
  const mixturePower = profile.category === "piston" ? (controls.mixture > 0.08 ? controls.mixture : 0) : 1;
  const engineRunning = controls.battery && controls.magnetos !== "off" && state.fuelGallons > 0 && mixturePower > 0;
  const throttlePower = engineRunning ? controls.throttle * mixturePower : 0;
  const bankTargetDeg = controls.aileron * flight.bankAuthorityDeg;
  const pitchTargetDeg = controls.elevator * flight.pitchAuthorityDeg + controls.elevatorTrim * flight.trimAuthorityDeg + (state.onGround ? 0 : throttlePower * flight.throttlePitchCouplingDeg) - flapsDeg * 0.035;
  const bankDeg = lerp(state.bankDeg, bankTargetDeg, deltaSeconds * flight.rollResponse);
  const pitchDeg = lerp(state.pitchDeg, pitchTargetDeg, deltaSeconds * (state.onGround ? flight.groundPitchResponse : flight.airPitchResponse));
  const bankLoadFactor = 1 / Math.max(Math.cos(degToRad(bankDeg)), 0.45);
  const maxFlapDeg = Math.max(...profile.flapSettingsDeg, 1);
  const stallSpeedKts = lerp(profile.cleanStallSpeedKts, profile.fullFlapStallSpeedKts, flapsDeg / maxFlapDeg) * Math.sqrt(bankLoadFactor);
  const flightPathDeg = Math.max(-18, Math.min(18, state.verticalSpeedFpm / Math.max(state.airspeedKts * 101.27, 1) * 57.3));
  const angleOfAttackDeg = pitchDeg - flightPathDeg + controls.elevatorTrim * 1.5 + flapsDeg * 0.04;
  const aoaLift = clamp((angleOfAttackDeg + flight.liftAoAOffsetDeg) / flight.liftAoARangeDeg, flight.minLiftFactor, flight.maxLiftFactor);
  const speedRatio = state.airspeedKts / Math.max(stallSpeedKts, 1);
  const liftRatio = speedRatio * speedRatio * aoaLift / bankLoadFactor;
  const airlinerLowSpeedStall = state.airspeedKts < stallSpeedKts * 0.98 && liftRatio < 0.78;
  const conventionalLowSpeedStall = state.airspeedKts < stallSpeedKts * 1.04;
  const lowLiftBreakStall = liftRatio < 0.62 && angleOfAttackDeg > flight.stallAoADeg * 0.55;
  const stalled = !state.onGround && (angleOfAttackDeg > flight.stallAoADeg || (profile.category === "airliner" ? airlinerLowSpeedStall : conventionalLowSpeedStall) || lowLiftBreakStall);
  const inducedDrag = Math.max(0, angleOfAttackDeg - flight.liftAoAOffsetDeg) * flight.inducedDragFactor;
  const drag = flight.dragLinear * state.airspeedKts + flight.dragQuadratic * state.airspeedKts * state.airspeedKts + flapsDeg * flight.flapDragFactor + Math.abs(bankDeg) * flight.bankDragFactor + inducedDrag;
  const thrust = throttlePower * Math.max(flight.thrustMinAccelKts, flight.thrustMaxAccelKts - state.airspeedKts * flight.thrustSpeedDecay);
  const brakeDrag = (controls.brakeLeft + controls.brakeRight + (controls.parkingBrake ? 2 : 0)) * (state.onGround ? flight.brakeDragGround : flight.brakeDragAir);
  const climbPenalty = Math.max(0, state.verticalSpeedFpm) / flight.climbPenaltyFpm;
  const rollingFriction = state.onGround ? flight.rollingFriction : 0;
  const windFactor = environment.windSpeedKts * flight.windDragFactor;
  const accelerationKts = thrust - drag - brakeDrag - climbPenalty - rollingFriction - windFactor;
  let airspeedKts = clamp(state.airspeedKts + accelerationKts * deltaSeconds, 0, profile.neverExceedSpeedKts + flight.maxSpeedMarginKts);

  if (!engineRunning) {
    airspeedKts = clamp(airspeedKts - flight.powerOffDecelKts * deltaSeconds, 0, profile.neverExceedSpeedKts + flight.maxSpeedMarginKts);
  }

  let verticalSpeedFpm = state.verticalSpeedFpm;
  let altitudeFt = state.altitudeFt;
  let onGround = state.onGround;

  if (onGround) {
    verticalSpeedFpm = 0;
    altitudeFt = groundElevationFt;

    if (airspeedKts > profile.rotationSpeedKts * 0.98 && pitchDeg > 4 && liftRatio > 1.02) {
      onGround = false;
      verticalSpeedFpm = flight.liftoffVerticalSpeedFpm;
    }
  } else {
    const pitchClimbFpm = Math.sin(degToRad(pitchDeg)) * airspeedKts * 101.27 * flight.pitchClimbFactor;
    const bestRateFactor = clamp(1 - Math.abs(airspeedKts - profile.bestRateClimbKts) / flight.bestRateWindowKts, 0.35, 1);
    const excessPowerFpm = (throttlePower - flight.levelPowerRequired) * flight.excessPowerFpm * bestRateFactor;
    const liftFpm = (liftRatio - 1) * flight.liftFpmFactor;
    const flapSinkFpm = flapsDeg * flight.flapSinkFpmPerDeg;
    const stallSinkFpm = stalled ? flight.stallSinkFpm + Math.max(0, angleOfAttackDeg - flight.stallAoADeg) * flight.stallSinkAoaFactor : 0;
    const targetVerticalSpeedFpm = clamp(pitchClimbFpm + excessPowerFpm + liftFpm - flapSinkFpm - stallSinkFpm, -flight.maxSinkFpm, flight.maxClimbFpm);
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
    ? controls.rudder * clamp(airspeedKts / 12, 0, 1) * flight.groundTurnRateDegPerSec
    : (1091 * Math.tan(degToRad(bankDeg))) / Math.max(airspeedKts, flight.airborneTurnMinSpeedKts) + controls.rudder * flight.rudderTurnRateDegPerSec;
  const headingDeg = normalizeHeadingDeg(state.headingDeg + turnRateDegPerSec * deltaSeconds);
  const groundSpeedKts = onGround ? airspeedKts : Math.max(0, airspeedKts * Math.cos(degToRad(pitchDeg)));
  const position = advanceGeodetic(
    { latitudeDeg: state.latitudeDeg, longitudeDeg: state.longitudeDeg, altitudeFt },
    headingDeg,
    (groundSpeedKts * deltaSeconds) / 3600
  );
  const fuelFlowGph = engineRunning ? lerp(engine.minFuelFlowGph, engine.maxFuelFlowGph, controls.throttle) * mixturePower : 0;
  const fuelGallons = Math.max(0, state.fuelGallons - (fuelFlowGph * deltaSeconds) / 3600);
  const rpmTarget = engineRunning ? engine.idlePrimary + throttlePower * (engine.maxPrimary - engine.idlePrimary) + airspeedKts * engine.ramRisePerKnot : 0;
  const rpm = lerp(state.rpm, rpmTarget, deltaSeconds * engine.primaryResponse);
  const gLoad = clamp(bankLoadFactor + Math.max(0, pitchDeg) / 90 - (stalled ? 0.55 : 0), 0.2, flight.positiveGLimit);

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

export function toTelemetry(state: SimpleFlightState, controls: AircraftControls, environment: EnvironmentState, region: SceneryRegion = DEFAULT_SCENERY_REGION, profile: AircraftProfile = DEFAULT_AIRCRAFT_PROFILE): AircraftTelemetry {
  const engine = profile.engine;
  const flapsDeg = profile.flapSettingsDeg[controls.flapsIndex] ?? 0;
  const mixturePower = profile.category === "piston" ? controls.mixture : 1;
  const engineRunning = controls.battery && controls.magnetos !== "off" && state.fuelGallons > 0 && mixturePower > 0.08;
  const fuelFlowGph = engineRunning ? lerp(engine.minFuelFlowGph, engine.maxFuelFlowGph, controls.throttle) * mixturePower : 0;
  const overspeed = state.airspeedKts > profile.neverExceedSpeedKts;
  const lowFuel = state.fuelGallons < profile.usableFuelGallons * 0.08;
  const warning = state.stalled ? "STALL" : overspeed ? "OVERSPEED" : lowFuel ? "LOW FUEL" : null;
  const engineSecondaryValue = engineRunning ? lerp(engine.idleSecondary, engine.maxSecondary, controls.throttle) * (profile.category === "piston" ? controls.mixture : 1) : 0;

  return {
    timestampMs: performance.now(),
    aircraftId: profile.id,
    aircraftName: profile.displayName,
    aircraftShortName: profile.shortName,
    aircraftCategory: profile.category,
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
    manifoldPressureInHg: engineSecondaryValue,
    enginePrimaryLabel: engine.primaryLabel,
    enginePrimaryValue: state.rpm,
    enginePrimaryMax: engine.maxPrimary,
    enginePrimarySuffix: engine.primarySuffix,
    engineSecondaryLabel: engine.secondaryLabel,
    engineSecondaryValue,
    engineSecondaryMax: engine.maxSecondary,
    engineSecondarySuffix: engine.secondarySuffix,
    fuelGallons: state.fuelGallons,
    fuelCapacityGallons: profile.usableFuelGallons,
    fuelFlowGph,
    maxFuelFlowGph: engine.maxFuelFlowGph,
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
