import { expect, test, type Locator } from "@playwright/test";

async function sampleCanvasPixels(canvas: Locator) {
  return canvas.evaluate((node) => {
    const canvasElement = node as HTMLCanvasElement;
    const gl = canvasElement.getContext("webgl2") ?? canvasElement.getContext("webgl");

    if (!gl) {
      return { hasContext: false, width: canvasElement.width, height: canvasElement.height, nonZeroPixels: 0, uniqueColors: 0 };
    }

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const sampleWidth = Math.min(32, width);
    const sampleHeight = Math.min(32, height);
    const x = Math.max(0, Math.floor(width / 2 - sampleWidth / 2));
    const y = Math.max(0, Math.floor(height / 2 - sampleHeight / 2));
    const data = new Uint8Array(sampleWidth * sampleHeight * 4);
    gl.readPixels(x, y, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

    let nonZeroPixels = 0;
    const colors = new Set<string>();

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];

      if (alpha > 0 && (red > 0 || green > 0 || blue > 0)) {
        nonZeroPixels += 1;
        colors.add(`${red},${green},${blue}`);
      }
    }

    return { hasContext: true, width, height, nonZeroPixels, uniqueColors: colors.size };
  });
}

async function expectNonblankCanvas(canvas: Locator) {
  const pixels = await sampleCanvasPixels(canvas);
  expect(pixels.hasContext).toBe(true);
  expect(pixels.width).toBeGreaterThan(300);
  expect(pixels.height).toBeGreaterThan(200);
  expect(pixels.nonZeroPixels).toBeGreaterThan(100);
  expect(pixels.uniqueColors).toBeGreaterThan(2);
}

test("loads the simulator and renders a nonblank WebGL scene", async ({ page }) => {
  test.setTimeout(45_000);
  await page.route("https://overpass-api.de/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("STFlightSim")).toBeVisible();
  await expect(page.getByText("Primary")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pilot view" })).toHaveClass(/active/);
  await expect(page.locator(".hud-overlay")).toBeVisible();

  const canvas = page.locator("canvas.scene-canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1800);
  await expect(page.getByLabel("Scenery region")).toHaveValue("egll-city");
  await expect(page.getByRole("button", { name: "High-resolution OpenStreetMap" })).toHaveAttribute("aria-pressed", "false");
  await expectNonblankCanvas(canvas);

  await page.getByRole("button", { name: "High-resolution OpenStreetMap" }).click();
  await expect(page.getByRole("button", { name: "High-resolution OpenStreetMap" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(250);
  await expectNonblankCanvas(canvas);

  await page.screenshot({ path: "test-results/stflightsim-pilot-e2e.png", fullPage: true });

  await page.getByRole("button", { name: "Cockpit view" }).click();
  await expect(page.getByRole("button", { name: "Cockpit view" })).toHaveClass(/active/);
  await expect(page.locator(".cockpit-overlay")).toBeVisible();
  await page.screenshot({ path: "test-results/stflightsim-cockpit-e2e.png", fullPage: true });

  await page.getByRole("button", { name: "Chase view" }).click();
  await expect(page.getByRole("button", { name: "Chase view" })).toHaveClass(/active/);
  await expect(page.locator(".hud-overlay")).toHaveCount(0);
  await expect(page.locator(".cockpit-overlay")).toHaveCount(0);
  await page.waitForTimeout(600);
  await expectNonblankCanvas(canvas);

  await page.screenshot({ path: "test-results/stflightsim-chase-e2e.png", fullPage: true });
});

const scenarios = [
  { id: "egll-city", airport: "London Heathrow Airport", screenshot: "test-results/stflightsim-heathrow-e2e.png" },
  { id: "lowi-alpine", airport: "Innsbruck Airport", screenshot: "test-results/stflightsim-innsbruck-e2e.png" },
  { id: "tncm-coastal", airport: "Princess Juliana International Airport", screenshot: "test-results/stflightsim-coastal-e2e.png" },
  { id: "kbfioffline", airport: "Boeing Field / King County International", screenshot: "test-results/stflightsim-seattle-e2e.png" }
];

for (const scenario of scenarios) {
  test(`renders ${scenario.id} scenery preset`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.route("https://overpass-api.de/**", (route) => route.abort());
    await page.goto("/");
    const canvas = page.locator("canvas.scene-canvas");
    const scenerySelect = page.getByLabel("Scenery region");
    await expect(canvas).toBeVisible();

    await scenerySelect.selectOption(scenario.id);
    await expect(scenerySelect).toHaveValue(scenario.id);
    await expect(page.getByText(scenario.airport)).toBeVisible();
    await page.getByRole("button", { name: "Chase view" }).click();
    await page.waitForTimeout(700);
    await expectNonblankCanvas(canvas);
    await page.screenshot({ path: scenario.screenshot, fullPage: true });
  });
}
