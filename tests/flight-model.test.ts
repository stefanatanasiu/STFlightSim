import { describe, expect, it } from "vitest";
import { A320_PROFILE, F16C_PROFILE } from "@stflightsim/aircraft";
import { SCENERY_REGIONS } from "@stflightsim/scenery";
import { DEFAULT_AIRCRAFT_CONTROLS, STANDARD_ENVIRONMENT } from "@stflightsim/shared";
import { createInitialFlightState, stepSimpleFlightModel } from "@stflightsim/simulation";

describe("scenery region data", () => {
  it("models Heathrow with its two parallel runways", () => {
    const heathrow = SCENERY_REGIONS.find((region) => region.id === "egll-city");
    expect(heathrow?.runways?.map((runway) => runway.name)).toEqual(["09R / 27L", "09L / 27R"]);
  });
});

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
    let stalledSteps = 0;

    for (let step = 0; step < 2400; step += 1) {
      state = stepSimpleFlightModel(state, controls, STANDARD_ENVIRONMENT, 1 / 60, undefined, A320_PROFILE);
      if (state.stalled) {
        stalledSteps += 1;
      }
    }

    if (state.onGround) {
      throw new Error(`A320 remained on ground: ${JSON.stringify({ airspeedKts: state.airspeedKts, pitchDeg: state.pitchDeg, verticalSpeedFpm: state.verticalSpeedFpm })}`);
    }
    expect(state.onGround).toBe(false);
    expect(state.airspeedKts).toBeGreaterThan(150);
    expect(state.airspeedKts).toBeLessThan(300);
    expect(state.verticalSpeedFpm).toBeGreaterThan(900);
    expect(stalledSteps).toBe(0);
  });

  it("does not flash an A320 stall warning just after full-throttle rotation", () => {
    const initialState = createInitialFlightState(undefined, A320_PROFILE);
    const rotationState = {
      ...initialState,
      onGround: false,
      altitudeFt: initialState.altitudeFt + 12,
      airspeedKts: A320_PROFILE.rotationSpeedKts * 0.99,
      verticalSpeedFpm: A320_PROFILE.flight.liftoffVerticalSpeedFpm,
      pitchDeg: 8,
      bankDeg: 0
    };
    const controls = { ...DEFAULT_AIRCRAFT_CONTROLS, throttle: 1, elevator: 0.65, flapsIndex: 0 };

    const nextState = stepSimpleFlightModel(rotationState, controls, STANDARD_ENVIRONMENT, 1 / 60, undefined, A320_PROFILE);

    expect(nextState.stalled).toBe(false);
    expect(nextState.verticalSpeedFpm).toBeGreaterThan(0);
  });
});
