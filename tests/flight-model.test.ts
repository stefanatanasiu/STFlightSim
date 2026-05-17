import { describe, expect, it } from "vitest";
import { A320_PROFILE, F16C_PROFILE } from "@stflightsim/aircraft";
import { DEFAULT_AIRCRAFT_CONTROLS, STANDARD_ENVIRONMENT } from "@stflightsim/shared";
import { createInitialFlightState, stepSimpleFlightModel } from "@stflightsim/simulation";

describe("development flight model", () => {
  it("accelerates on the runway when throttle is advanced", () => {
    let state = createInitialFlightState();
    const controls = { ...DEFAULT_AIRCRAFT_CONTROLS, throttle: 1, elevator: 0 };

    for (let step = 0; step < 180; step += 1) {
      state = stepSimpleFlightModel(state, controls, STANDARD_ENVIRONMENT, 1 / 60);
    }

    expect(state.airspeedKts).toBeGreaterThan(10);
    expect(state.onGround).toBe(true);
  });

  it("lifts off with rotation speed and back pressure", () => {
    let state = createInitialFlightState();
    const initialAltitudeFt = state.altitudeFt;
    const controls = { ...DEFAULT_AIRCRAFT_CONTROLS, throttle: 1, elevator: 0.75 };

    for (let step = 0; step < 1200; step += 1) {
      state = stepSimpleFlightModel(state, controls, STANDARD_ENVIRONMENT, 1 / 60);
    }

    expect(state.altitudeFt - initialAltitudeFt).toBeGreaterThan(60);
    expect(state.onGround).toBe(false);
  });

  it("models the F-16 as a high-performance jet", () => {
    let state = createInitialFlightState(undefined, F16C_PROFILE);
    const controls = { ...DEFAULT_AIRCRAFT_CONTROLS, throttle: 1, elevator: 0.65 };

    for (let step = 0; step < 900; step += 1) {
      state = stepSimpleFlightModel(state, controls, STANDARD_ENVIRONMENT, 1 / 60, undefined, F16C_PROFILE);
    }

    expect(state.onGround).toBe(false);
    expect(state.airspeedKts).toBeGreaterThan(230);
    expect(state.verticalSpeedFpm).toBeGreaterThan(3500);
  });

  it("models the A320 as a heavier transport jet", () => {
    let state = createInitialFlightState(undefined, A320_PROFILE);
    const controls = { ...DEFAULT_AIRCRAFT_CONTROLS, throttle: 1, elevator: 0.7, flapsIndex: 2 };

    for (let step = 0; step < 2400; step += 1) {
      state = stepSimpleFlightModel(state, controls, STANDARD_ENVIRONMENT, 1 / 60, undefined, A320_PROFILE);
    }

    if (state.onGround) {
      throw new Error(`A320 remained on ground: ${JSON.stringify({ airspeedKts: state.airspeedKts, pitchDeg: state.pitchDeg, verticalSpeedFpm: state.verticalSpeedFpm })}`);
    }
    expect(state.onGround).toBe(false);
    expect(state.airspeedKts).toBeGreaterThan(150);
    expect(state.airspeedKts).toBeLessThan(300);
    expect(state.verticalSpeedFpm).toBeGreaterThan(900);
  });
});
