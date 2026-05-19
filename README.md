# STFlightSim

STFlightSim is a web-first flight simulator prototype. The current implementation starts with a runnable browser vertical slice: selectable airport scenery, optional live OpenStreetMap vector overlays, keyboard/gamepad controls, three camera modes, cockpit/HUD overlays, and a simulation worker that advances a Cessna 172-inspired flight model off the UI thread.

The long-term architecture is designed for JSBSim compiled to WebAssembly for realistic flight dynamics and an Electron wrapper for Windows, macOS, and Linux once the web app stabilizes.

## Quick Start

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. The simulator starts directly in the clean forward pilot view.

Live OpenStreetMap scenery is opt-in. To enable it locally, create `.env.local` in the repository root with:

```powershell
VITE_ENABLE_REAL_SCENERY=true
```

## Scenery Presets

Use the map selector in the top toolbar to switch scenery. Changing region resets the aircraft at that airport's runway. When live scenery is enabled, use the stacked-layers button to toggle high-resolution OpenStreetMap detail for online-capable scenery.

- `Heathrow`: city-airport scene with the 09L/27R and 09R/27L parallel runways, dense terminals, suburbs, motorways, reservoirs, and live OpenStreetMap roads/buildings/water when the Overpass API is reachable.
- `Innsbruck`: mountain-valley airport with steep ridges, forested slopes, villages, cable cars, and live OSM vectors when online.
- `St Maarten`: coastal island airport with beach approach, marina, resorts, palms, turquoise water, and live OSM coastline/detail when online.
- `Seattle`: offline procedural fallback training field.

Online scenery uses OpenStreetMap contributor data through the public Overpass API. Standard mode requests the core airport-area roads, buildings, water, and green spaces. High-resolution mode requests a larger radius, a higher feature budget, additional minor roads/paths/rail/aeroway features, and renders closed OSM footprints as actual flat or extruded vector shapes where possible. If Overpass times out, the app retries once with a smaller query before falling back. If the request is blocked, rate-limited, disabled, or offline, the renderer keeps the procedural scenery active. When OSM vectors are displayed, the app shows linked OpenStreetMap contributor attribution.

## Current Controls

- `W` / `S`: elevator forward/back
- `A` / `D`: aileron roll
- `Q` / `E`: rudder
- `Shift` / `Control`: throttle up/down
- `R` / `F`: flaps up/down
- `[` / `]`: trim nose down/up
- `B`: brakes
- `P`: pause/resume
- `Backspace`: reset to runway
- `1`: clean forward pilot/HUD view
- `2`: cockpit frame and instrument-panel view
- `3`: rear chase view with the full aircraft visible
- `V`: cycle camera view
- `H`: show/hide the HUD or cockpit frame overlay

Gamepads are polled through the browser Gamepad API. Left stick controls pitch/roll, right stick controls rudder/throttle bias, and triggers can be used for brakes/throttle depending on device mapping.

## Architecture Snapshot

- `apps/web`: Vite React PWA shell and cockpit UI.
- `packages/simulation`: fixed-step worker loop and the current TypeScript flight model.
- `packages/shared`: telemetry, controls, units, and coordinate helpers.
- `packages/input`: keyboard and gamepad input normalization.
- `packages/renderer`: Three.js region renderer with procedural/OSM overlays.
- `packages/jsbsim-wasm`: boundary for the planned JSBSim/Emscripten runtime.

## Reference Direction

The visual and interaction target is closer to retro desktop simulators and projects like `gue-ni/flightsim.js`: default forward flight view, explicit cockpit view, chase view, richer object density, and clearer aircraft attitude. This repository keeps its own implementation and uses the reference as product inspiration rather than copied code.

See `docs/architecture.md` for the implementation roadmap.
