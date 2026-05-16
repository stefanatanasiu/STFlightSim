# JSBSim WebAssembly Boundary

This package is the intended home for the Emscripten-built JSBSim runtime.

The current app uses a TypeScript development flight model behind the same worker/control/telemetry shape. JSBSim should replace that implementation through a narrow adapter instead of leaking JSBSim-specific property names through the UI or renderer.

Compliance notes:

- track the exact upstream JSBSim version
- keep local patches isolated
- publish modifications and source availability before distributing builds
- keep aircraft package metadata separate from the simulator UI
