# Electron Fallback

The simulator is web-first. This directory is reserved for the desktop wrapper that will package the same web app for Windows, macOS, and Linux after the browser vertical slice stabilizes.

Initial responsibilities for this app:

- load the production Vite bundle
- expose larger local storage allowances for scenery packs
- keep COOP/COEP-compatible isolation for SharedArrayBuffer and future JSBSim WASM threading
- package releases without changing the simulator runtime APIs
