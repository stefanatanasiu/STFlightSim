import { describe, expect, it } from "vitest";
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
});
