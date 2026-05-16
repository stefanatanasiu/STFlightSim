import type { AircraftTelemetry } from "@stflightsim/shared";

export function formatGaugeValue(value: number, fractionDigits = 0): string {
  return Number.isFinite(value) ? value.toFixed(fractionDigits) : "--";
}

export function getPrimaryWarning(telemetry: AircraftTelemetry | null): string | null {
  if (!telemetry) {
    return null;
  }

  if (telemetry.warning) {
    return telemetry.warning;
  }

  if (telemetry.stalled) {
    return "STALL";
  }

  if (telemetry.overspeed) {
    return "OVERSPEED";
  }

  return null;
}
