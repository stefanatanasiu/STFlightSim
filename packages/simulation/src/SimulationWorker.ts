import { DEFAULT_AIRCRAFT_CONTROLS, STANDARD_ENVIRONMENT, type AircraftControls, type EnvironmentState, type SimulationInboundMessage, type SimulationOutboundMessage } from "@stflightsim/shared";
import { DEFAULT_AIRCRAFT_PROFILE, getAircraftProfile, type AircraftProfile } from "@stflightsim/aircraft";
import { DEFAULT_SCENERY_REGION, getSceneryRegion, type SceneryRegion } from "@stflightsim/scenery";
import { createInitialFlightState, stepSimpleFlightModel, toTelemetry, type SimpleFlightState } from "./simpleFlightModel";

const workerScope = self as DedicatedWorkerGlobalScope;
const fixedDeltaSeconds = 1 / 60;
let controls: AircraftControls = { ...DEFAULT_AIRCRAFT_CONTROLS };
let environment: EnvironmentState = { ...STANDARD_ENVIRONMENT };
let region: SceneryRegion = DEFAULT_SCENERY_REGION;
let aircraftProfile: AircraftProfile = DEFAULT_AIRCRAFT_PROFILE;
let state: SimpleFlightState = createInitialFlightState(region, aircraftProfile);
let paused = false;
let started = false;
let lastTelemetryPostMs = 0;

workerScope.addEventListener("message", (event: MessageEvent<SimulationInboundMessage>) => {
  const message = event.data;

  if (message.type === "start") {
    started = true;
    post({ type: "status", status: "running" });
    post({ type: "telemetry", telemetry: toTelemetry(state, controls, environment, region, aircraftProfile) });
  }

  if (message.type === "reset") {
    state = createInitialFlightState(region, aircraftProfile);
    post({ type: "telemetry", telemetry: toTelemetry(state, controls, environment, region, aircraftProfile) });
  }

  if (message.type === "set-region") {
    region = getSceneryRegion(message.regionId) ?? region;
    state = createInitialFlightState(region, aircraftProfile);
    post({ type: "status", status: paused ? "paused" : "running", message: region.name });
    post({ type: "telemetry", telemetry: toTelemetry(state, controls, environment, region, aircraftProfile) });
  }

  if (message.type === "set-aircraft") {
    aircraftProfile = getAircraftProfile(message.aircraftId) ?? aircraftProfile;
    controls = { ...DEFAULT_AIRCRAFT_CONTROLS };
    state = createInitialFlightState(region, aircraftProfile);
    post({ type: "status", status: paused ? "paused" : "running", message: aircraftProfile.displayName });
    post({ type: "telemetry", telemetry: toTelemetry(state, controls, environment, region, aircraftProfile) });
  }

  if (message.type === "set-controls") {
    controls = message.controls;
  }

  if (message.type === "set-paused") {
    paused = message.paused;
    post({ type: "status", status: paused ? "paused" : "running" });
  }

  if (message.type === "set-environment") {
    environment = message.environment;
  }
});

setInterval(() => {
  if (!started || paused) {
    return;
  }

  state = stepSimpleFlightModel(state, controls, environment, fixedDeltaSeconds, region, aircraftProfile);
  const now = performance.now();

  if (now - lastTelemetryPostMs > 33) {
    lastTelemetryPostMs = now;
    post({ type: "telemetry", telemetry: toTelemetry(state, controls, environment, region, aircraftProfile) });
  }
}, fixedDeltaSeconds * 1000);

function post(message: SimulationOutboundMessage): void {
  workerScope.postMessage(message);
}
