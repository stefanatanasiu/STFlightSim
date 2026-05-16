import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@stflightsim/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@stflightsim/aircraft": fileURLToPath(new URL("./packages/aircraft/src/index.ts", import.meta.url)),
      "@stflightsim/scenery": fileURLToPath(new URL("./packages/scenery/src/index.ts", import.meta.url)),
      "@stflightsim/simulation": fileURLToPath(new URL("./packages/simulation/src/index.ts", import.meta.url))
    }
  }
});
