import type { AircraftControls, AircraftTelemetry, EnvironmentState, SimulationInboundMessage, SimulationOutboundMessage, SimulationStatus } from "@stflightsim/shared";

export type TelemetryListener = (telemetry: AircraftTelemetry) => void;
export type StatusListener = (status: SimulationStatus, message?: string) => void;

export class SimulationClient {
  private worker: Worker | null = null;
  private readonly telemetryListeners = new Set<TelemetryListener>();
  private readonly statusListeners = new Set<StatusListener>();

  start(): void {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(new URL("./SimulationWorker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (event: MessageEvent<SimulationOutboundMessage>) => this.onWorkerMessage(event.data));
    this.post({ type: "start" });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.telemetryListeners.clear();
    this.statusListeners.clear();
  }

  reset(): void {
    this.post({ type: "reset" });
  }

  setRegion(regionId: string): void {
    this.post({ type: "set-region", regionId });
  }

  setAircraft(aircraftId: string): void {
    this.post({ type: "set-aircraft", aircraftId });
  }

  setPaused(paused: boolean): void {
    this.post({ type: "set-paused", paused });
  }

  setControls(controls: AircraftControls): void {
    this.post({ type: "set-controls", controls });
  }

  setEnvironment(environment: EnvironmentState): void {
    this.post({ type: "set-environment", environment });
  }

  onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private post(message: SimulationInboundMessage): void {
    this.worker?.postMessage(message);
  }

  private onWorkerMessage(message: SimulationOutboundMessage): void {
    if (message.type === "telemetry") {
      this.telemetryListeners.forEach((listener) => listener(message.telemetry));
    }

    if (message.type === "status") {
      this.statusListeners.forEach((listener) => listener(message.status, message.message));
    }
  }
}
