import type { AircraftControls, AircraftTelemetry, EnvironmentState } from "@stflightsim/shared";

export interface JsbsimRuntime {
  loadAircraft(aircraftId: string): Promise<void>;
  reset(initialConditions?: Record<string, number | string>): void;
  setControls(controls: AircraftControls): void;
  setEnvironment(environment: EnvironmentState): void;
  step(deltaSeconds: number): AircraftTelemetry;
}

export class JsbsimUnavailableRuntime implements JsbsimRuntime {
  async loadAircraft(): Promise<void> {
    throw new Error("JSBSim WASM is not wired yet. The simulator is currently using the TypeScript development flight model.");
  }

  reset(): void {
    throw new Error("JSBSim WASM is not wired yet.");
  }

  setControls(): void {
    throw new Error("JSBSim WASM is not wired yet.");
  }

  setEnvironment(): void {
    throw new Error("JSBSim WASM is not wired yet.");
  }

  step(): AircraftTelemetry {
    throw new Error("JSBSim WASM is not wired yet.");
  }
}

export const JSBSIM_INTEGRATION_NOTES = [
  "Build upstream JSBSim with Emscripten into this package.",
  "Keep JSBSim patches isolated for LGPL compliance.",
  "Expose only aircraft loading, control writes, fixed-step advance, and telemetry reads to the simulation worker."
] as const;
