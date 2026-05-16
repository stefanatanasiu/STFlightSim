# Architecture

STFlightSim is organized as a web-first simulator with clean runtime boundaries:

1. The web app owns the visual shell, overlays, settings, and browser lifecycle.
2. The input package normalizes keyboard, mouse, gamepad, and future joystick/HOTAS data into flight controls.
3. The simulation package owns the fixed-step loop in a Web Worker and emits telemetry snapshots.
4. The renderer package consumes telemetry and draws the world; the current implementation uses a synthetic Three.js airport scene so the app runs without tokens or external data.
5. The JSBSim package is the future WebAssembly boundary. It will replace the TypeScript model behind the same worker API.

## Runtime Flow

```text
Keyboard/Gamepad -> InputManager -> SimulationClient -> SimulationWorker
       ^                                               |
       |                                               v
React cockpit UI <- telemetry snapshots <- flight model step
       |
       v
FlightScene renderer updates aircraft, camera, terrain references
```

## Initial Vertical Slice

The first implementation deliberately proves the full browser loop before importing heavy external systems:

- worker-driven C172-inspired flight model
- full-screen 3D scene
- runway start and takeoff/landing loop
- cockpit-style instruments and engine/system overlays
- keyboard-first controls with gamepad polling
- no-token synthetic scenery fallback

## Planned Upgrades

1. Compile JSBSim with Emscripten and expose a narrow aircraft-control/telemetry API.
2. Add C172 JSBSim XML assets and validation fixtures.
3. Add CesiumJS as an online scenery provider with explicit attribution and token configuration.
4. Generate airport detail from OurAirports and open scenery data.
5. Add live weather, navaids, aircraft packages, and Electron packaging.
