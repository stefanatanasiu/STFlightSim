import * as THREE from "three";
import { DEFAULT_SCENERY_REGION, loadOpenStreetMapScenery, type OnlineSceneryData, type OnlineSceneryFeature, type SceneryRegion } from "@stflightsim/scenery";
import { degToRad, feetToMeters, localMetersBetween, type AircraftTelemetry, type CameraViewMode } from "@stflightsim/shared";

export type SceneryLoadMode = "offline" | "loading" | "online" | "error";

export interface SceneryLoadStatus {
  regionId: string;
  mode: SceneryLoadMode;
  message: string;
  featureCount?: number;
  attribution?: string;
}

export interface FlightSceneOptions {
  region?: SceneryRegion;
  onlineScenery?: boolean;
  onSceneryStatus?: (status: SceneryLoadStatus) => void;
}

export class FlightScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly worldRoot = new THREE.Group();
  private readonly camera = new THREE.PerspectiveCamera(64, 1, 0.05, 32000);
  private readonly aircraft = new THREE.Group();
  private readonly propeller = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly onSceneryStatus?: (status: SceneryLoadStatus) => void;
  private readonly onlineScenery: boolean;
  private sceneryAbortController: AbortController | null = null;
  private animationFrame = 0;
  private lastTelemetry: AircraftTelemetry | null = null;
  private viewMode: CameraViewMode = "pilot";
  private previousViewMode: CameraViewMode = "pilot";
  private region: SceneryRegion;

  constructor(private readonly canvas: HTMLCanvasElement, options: FlightSceneOptions = {}) {
    this.region = options.region ?? DEFAULT_SCENERY_REGION;
    this.onlineScenery = options.onlineScenery ?? true;
    this.onSceneryStatus = options.onSceneryStatus;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x91c4dd);
    this.scene.fog = new THREE.FogExp2(0x9fc9dc, 0.00011);
    this.scene.add(this.worldRoot);
    this.camera.position.set(0, 4, 0);

    this.buildLighting();
    this.buildScenery();
    this.buildAircraft();
    this.resize();
    window.addEventListener("resize", this.resize);
    this.animate();
  }

  setTelemetry(telemetry: AircraftTelemetry): void {
    this.lastTelemetry = telemetry;
  }

  setViewMode(viewMode: CameraViewMode): void {
    this.viewMode = viewMode;
    this.aircraft.visible = viewMode === "chase";
  }

  setRegion(region: SceneryRegion): void {
    if (this.region.id === region.id) {
      return;
    }

    this.region = region;
    this.lastTelemetry = null;
    this.camera.position.set(0, 4, 0);
    this.previousViewMode = this.viewMode;
    this.buildScenery();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    this.sceneryAbortController?.abort();
    this.disposeObject(this.worldRoot);
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  };

  private animate = (): void => {
    const delta = this.clock.getDelta();
    this.updateAircraftAndCamera(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private buildLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xe4f5ff, 0x54663f, 1.55));
    const sun = new THREE.DirectionalLight(0xfff0c6, 2.8);
    sun.position.set(-680, 900, 420);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xaad8ff, 0.45);
    fill.position.set(480, 260, -360);
    this.scene.add(fill);
  }

  private buildScenery(): void {
    this.sceneryAbortController?.abort();
    this.clearWorldRoot();
    this.buildTerrain();
    this.buildRunway();
    this.buildAirportDetail();
    this.buildRegionalDetail();
    this.loadOnlineLayer();
  }

  private clearWorldRoot(): void {
    for (const child of [...this.worldRoot.children]) {
      this.worldRoot.remove(child);
      this.disposeObject(child);
    }
  }

  private buildTerrain(): void {
    const worldSize = this.region.worldSizeMeters;
    const geometry = new THREE.PlaneGeometry(worldSize, worldSize, 184, 184);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const terrain = this.sampleTerrain(x, z);
      positions.setY(index, terrain.heightMeters);

      if (terrain.water) {
        color.setHex(this.region.kind === "coastal" ? 0x2d8aa2 : 0x426d83);
      } else if (this.region.kind === "mountain" && terrain.heightMeters > 1050) {
        color.setHex(0xd8ddd7);
      } else if (this.region.kind === "mountain" && terrain.heightMeters > 520) {
        color.setHex(0x70775f);
      } else if (terrain.urban) {
        color.setHex(index % 3 === 0 ? 0x72776f : 0x68706a);
      } else if (terrain.sand) {
        color.setHex(0xc8b889);
      } else {
        color.setHex(index % 5 === 0 ? 0x5d774b : 0x6e8552);
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrainMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ roughness: 0.97, metalness: 0, vertexColors: true }));
    this.worldRoot.add(terrainMesh);

    if (this.region.kind === "coastal") {
      const ocean = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize * 0.62), new THREE.MeshStandardMaterial({ color: 0x2f94ab, roughness: 0.58, metalness: 0, transparent: true, opacity: 0.42, depthWrite: false }));
      ocean.rotation.x = -Math.PI / 2;
      ocean.position.set(0, -0.35, worldSize * 0.26);
      this.worldRoot.add(ocean);
    }

    if (this.region.kind === "city") {
      this.addReservoirs(worldSize);
    }
  }

  private sampleTerrain(x: number, z: number): { heightMeters: number; water: boolean; urban: boolean; sand: boolean } {
    const worldHalf = this.region.worldSizeMeters / 2;
    const runway = this.runwayLocal(x, z);
    const runwayClear = Math.abs(runway.lateral) < this.region.runway.widthMeters * 3.2 && Math.abs(runway.along) < this.region.runway.lengthMeters * 0.72;
    const airportClear = Math.abs(runway.lateral) < 520 && Math.abs(runway.along) < this.region.runway.lengthMeters * 0.75;

    if (runwayClear || airportClear) {
      return { heightMeters: 0, water: false, urban: false, sand: false };
    }

    const noise = Math.sin(x * 0.00068) * 23 + Math.cos(z * 0.00071) * 19 + Math.sin((x + z) * 0.0021) * 5;

    if (this.region.kind === "mountain") {
      const valley = Math.abs(runway.lateral) / worldHalf;
      const ridgeBias = Math.pow(Math.min(1.65, valley * 2.05), 1.72) * 650 * this.region.procedural.terrainRelief;
      const ridgeNoise = Math.sin(x * 0.0011) * 95 + Math.cos(z * 0.0009) * 125 + Math.sin((x - z) * 0.00055) * 155;
      return { heightMeters: Math.min(1180, Math.max(0, ridgeBias + ridgeNoise + 35)), water: false, urban: false, sand: false };
    }

    if (this.region.kind === "coastal") {
      const coastline = z - 850 + Math.sin(x * 0.00072) * 360 + Math.cos(x * 0.0018) * 80;
      const water = coastline > 0 || x < -worldHalf * 0.56;
      const sand = !water && coastline > -260;
      return { heightMeters: water ? -1.1 : Math.max(0, noise * 0.22), water, urban: false, sand };
    }

    if (this.region.kind === "city") {
      const reservoir = z > worldHalf * 0.32 + Math.sin(x * 0.001) * 260 || (x < -worldHalf * 0.58 && z < -worldHalf * 0.1);
      const urban = Math.abs(x) < worldHalf * 0.86 && Math.abs(z) < worldHalf * 0.82;
      return { heightMeters: reservoir ? -1 : Math.max(0, noise * 0.14), water: reservoir, urban, sand: false };
    }

    const waterCut = Math.sin((x - 1800) * 0.00042) * 240 + 2650;
    const water = z > waterCut;
    return { heightMeters: water ? -0.8 : Math.max(0, noise * this.region.procedural.terrainRelief), water, urban: false, sand: false };
  }

  private buildRunway(): void {
    const runway = this.region.runway;
    const runwayGroup = new THREE.Group();
    const center = this.runwayCenterWorld();
    const asphalt = new THREE.MeshStandardMaterial({ color: this.region.kind === "coastal" ? 0x343837 : 0x2a2f2f, roughness: 0.78 });
    const paint = new THREE.MeshStandardMaterial({ color: 0xf3f0df, roughness: 0.54 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xd5b640, roughness: 0.6 });
    const surface = new THREE.Mesh(new THREE.BoxGeometry(runway.widthMeters, 0.18, runway.lengthMeters), asphalt);
    runwayGroup.add(surface);

    for (let offset = -runway.lengthMeters / 2 + 160; offset < runway.lengthMeters / 2 - 160; offset += 115) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 42), paint);
      mark.position.set(0, 0.14, offset);
      runwayGroup.add(mark);
    }

    [-1, 1].forEach((side) => {
      const touchdown = new THREE.Mesh(new THREE.BoxGeometry(runway.widthMeters * 0.28, 0.23, 4), paint);
      touchdown.position.set(0, 0.16, side * (runway.lengthMeters / 2 - 270));
      runwayGroup.add(touchdown);

      for (let stripe = -3; stripe <= 3; stripe += 1) {
        const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.23, 66), paint);
        threshold.position.set(stripe * 6.2, 0.16, side * (runway.lengthMeters / 2 - 82));
        runwayGroup.add(threshold);
      }
    });

    [-1, 1].forEach((edge) => {
      for (let offset = -runway.lengthMeters / 2 + 55; offset < runway.lengthMeters / 2; offset += 95) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.6), new THREE.MeshStandardMaterial({ color: edge < 0 ? 0xf1f6ff : 0xfff0d0, emissive: edge < 0 ? 0x6fa8ff : 0xffd27b, emissiveIntensity: 0.6 }));
        light.position.set(edge * (runway.widthMeters / 2 + 5), 0.42, offset);
        runwayGroup.add(light);
      }
    });

    const taxiConnector = new THREE.Mesh(new THREE.BoxGeometry(24, 0.14, Math.min(420, runway.lengthMeters * 0.22)), asphalt);
    taxiConnector.position.set(runway.widthMeters * 2.1, 0.1, -runway.lengthMeters * 0.17);
    taxiConnector.rotation.y = -0.48;
    runwayGroup.add(taxiConnector);
    const taxiLine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, Math.min(380, runway.lengthMeters * 0.2)), yellow);
    taxiLine.position.copy(taxiConnector.position);
    taxiLine.position.y = 0.18;
    taxiLine.rotation.y = taxiConnector.rotation.y;
    runwayGroup.add(taxiLine);

    runwayGroup.position.copy(center);
    runwayGroup.rotation.y = -degToRad(runway.headingDeg);
    this.worldRoot.add(runwayGroup);
  }

  private buildAirportDetail(): void {
    const runway = this.region.runway;
    const scale = this.region.procedural.airportScale;
    const airport = new THREE.Group();
    const apronMaterial = new THREE.MeshStandardMaterial({ color: 0x414a4a, roughness: 0.82 });
    const taxiMaterial = new THREE.MeshStandardMaterial({ color: 0x333a3a, roughness: 0.84 });
    const wall = new THREE.MeshStandardMaterial({ color: 0x889091, roughness: 0.72 });
    const darkWall = new THREE.MeshStandardMaterial({ color: 0x687477, roughness: 0.78 });
    const roof = new THREE.MeshStandardMaterial({ color: this.region.kind === "coastal" ? 0x5c6a71 : 0x314f5c, roughness: 0.65 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1f4a5e, roughness: 0.16, metalness: 0.08 });

    const apron = new THREE.Mesh(new THREE.BoxGeometry(520 * scale, 0.12, 330 * scale), apronMaterial);
    apron.position.set(runway.widthMeters * 3.7, 0.12, -runway.lengthMeters * 0.16);
    airport.add(apron);

    for (let index = 0; index < Math.round(4 * scale); index += 1) {
      const taxiway = new THREE.Mesh(new THREE.BoxGeometry(24, 0.13, 420 * scale), taxiMaterial);
      taxiway.position.set(runway.widthMeters * (1.2 + index * 0.86), 0.13, -runway.lengthMeters * 0.12 + index * 32);
      taxiway.rotation.y = -0.08;
      airport.add(taxiway);
    }

    const hangarCount = Math.max(8, Math.round(20 * scale));
    for (let index = 0; index < hangarCount; index += 1) {
      const width = 28 + (index % 4) * 12;
      const depth = 24 + (index % 5) * 7;
      const height = 8 + (index % 6) * 2.2;
      const hangar = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), index % 3 === 0 ? darkWall : wall);
      body.position.y = height / 2;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 5, 2.4, depth + 5), roof);
      cap.position.y = height + 1.2;
      hangar.add(body, cap);
      hangar.position.set(runway.widthMeters * 5.5 + (index % 8) * 82, 0, -runway.lengthMeters * 0.32 + Math.floor(index / 8) * 118);
      hangar.rotation.y = index % 2 === 0 ? 0.08 : -0.05;
      airport.add(hangar);
    }

    const terminal = new THREE.Group();
    const terminalBody = new THREE.Mesh(new THREE.BoxGeometry(190 * scale, 30 * scale, 58 * scale), wall);
    terminalBody.position.y = 15 * scale;
    const terminalGlass = new THREE.Mesh(new THREE.BoxGeometry(174 * scale, 15 * scale, 3), glass);
    terminalGlass.position.set(0, 18 * scale, -30 * scale);
    const terminalRoof = new THREE.Mesh(new THREE.BoxGeometry(205 * scale, 4, 70 * scale), roof);
    terminalRoof.position.y = 32 * scale;
    terminal.add(terminalBody, terminalGlass, terminalRoof);
    terminal.position.set(runway.widthMeters * 5.2, 0, -runway.lengthMeters * 0.42);
    terminal.rotation.y = -0.03;
    airport.add(terminal);

    const tower = new THREE.Group();
    const towerStem = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.4, 42 * scale, 12), wall);
    towerStem.position.y = 21 * scale;
    const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(13, 11, 9, 8), glass);
    towerCab.position.y = 47 * scale;
    const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(15, 12, 3, 8), roof);
    towerRoof.position.y = 53 * scale;
    tower.add(towerStem, towerCab, towerRoof);
    tower.position.set(runway.widthMeters * 2.9, 0, -runway.lengthMeters * 0.28);
    airport.add(tower);

    this.addWindsockToGroup(airport, -runway.widthMeters * 2.2, -runway.lengthMeters * 0.08);
    this.addPapiToGroup(airport, -runway.widthMeters * 0.8, runway.lengthMeters * 0.2);
    this.addPapiToGroup(airport, runway.widthMeters * 0.8, -runway.lengthMeters * 0.2);
    airport.position.copy(this.runwayCenterWorld());
    airport.rotation.y = -degToRad(runway.headingDeg);
    this.worldRoot.add(airport);
  }

  private buildRegionalDetail(): void {
    this.addProceduralRoads();

    if (this.region.kind === "city") {
      this.addCityBlocks();
      this.addCommuterRail();
      return;
    }

    if (this.region.kind === "mountain") {
      this.addMountainVillages();
      this.addForests(360, 1.25);
      this.addCableCars();
      return;
    }

    if (this.region.kind === "coastal") {
      this.addCoastalResorts();
      this.addMarina();
      this.addPalmGroves();
      this.addCoastalRunwayDetail();
      return;
    }

    this.addCityBlocks();
    this.addForests(230, 0.85);
  }

  private addProceduralRoads(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x353b38, roughness: 0.86 });
    const count = Math.round(6 + this.region.procedural.roadDensity * 10);
    const world = this.region.worldSizeMeters;

    for (let index = 0; index < count; index += 1) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(12 + (index % 3) * 5, 0.09, world * (0.34 + (index % 5) * 0.04)), roadMaterial);
      road.position.set(-world * 0.38 + index * (world / Math.max(count, 1)) + Math.sin(index * 11.1) * 70, 0.16, -world * 0.24 + (index % 4) * world * 0.12);
      road.rotation.y = this.region.kind === "mountain" ? 0.06 + Math.sin(index) * 0.18 : index % 2 === 0 ? 0.34 : -0.62;
      this.worldRoot.add(road);
    }
  }

  private addCityBlocks(): void {
    const buildingMaterials = [0x8f8276, 0x6f8387, 0x927d63, 0x78866d, 0xa2a6a0].map((value) => new THREE.MeshStandardMaterial({ color: value, roughness: 0.82 }));
    const count = Math.round(95 + this.region.procedural.urbanDensity * 260);
    const world = this.region.worldSizeMeters;

    for (let index = 0; index < count; index += 1) {
      const x = -world * 0.44 + (index % 31) * (world * 0.028) + Math.sin(index * 11.1) * 38;
      const z = -world * 0.36 + Math.floor(index / 31) * (world * 0.038) + Math.cos(index * 7.4) * 52;
      const runway = this.runwayLocal(x, z);
      if (Math.abs(runway.lateral) < 780 && Math.abs(runway.along) < this.region.runway.lengthMeters * 0.82) {
        continue;
      }

      const height = this.region.kind === "city" ? 12 + ((index * 13) % 72) : 10 + ((index * 13) % 34);
      const building = new THREE.Mesh(new THREE.BoxGeometry(30 + (index % 5) * 9, height, 28 + (index % 4) * 8), buildingMaterials[index % buildingMaterials.length]);
      building.position.set(x, height / 2, z);
      building.rotation.y = (index % 9) * 0.08;
      this.worldRoot.add(building);
    }

    if (this.region.kind === "city") {
      const highRiseMaterial = new THREE.MeshStandardMaterial({ color: 0x87939a, roughness: 0.48, metalness: 0.08 });
      for (let index = 0; index < 38; index += 1) {
        const height = 55 + (index % 7) * 18;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(34 + (index % 3) * 7, height, 30 + (index % 4) * 6), highRiseMaterial);
        tower.position.set(-3600 + (index % 10) * 240, height / 2, 2300 + Math.floor(index / 10) * 250);
        tower.rotation.y = 0.12 * (index % 5);
        this.worldRoot.add(tower);
      }
    }
  }

  private addMountainVillages(): void {
    const wall = new THREE.MeshStandardMaterial({ color: 0x9a8d7a, roughness: 0.86 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x6b2e2a, roughness: 0.72 });
    const world = this.region.worldSizeMeters;

    for (let village = 0; village < 5; village += 1) {
      const baseX = -world * 0.32 + village * world * 0.16;
      const baseZ = village % 2 === 0 ? -world * 0.18 : world * 0.18;
      for (let index = 0; index < 22; index += 1) {
        const chalet = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 14), wall);
        body.position.y = 4;
        const chaletRoof = new THREE.Mesh(new THREE.ConeGeometry(13, 7, 4), roof);
        chaletRoof.position.y = 11.5;
        chaletRoof.rotation.y = Math.PI / 4;
        chalet.add(body, chaletRoof);
        chalet.position.set(baseX + (index % 6) * 42 + Math.sin(index) * 8, 4, baseZ + Math.floor(index / 6) * 36);
        chalet.rotation.y = 0.15 * (index % 5);
        this.worldRoot.add(chalet);
      }
    }

    this.addClouds();
  }

  private addCoastalResorts(): void {
    const resortWall = new THREE.MeshStandardMaterial({ color: 0xd4c8ae, roughness: 0.76 });
    const resortGlass = new THREE.MeshStandardMaterial({ color: 0x5d9ab0, roughness: 0.25, metalness: 0.05 });
    const world = this.region.worldSizeMeters;

    for (let index = 0; index < 74; index += 1) {
      const height = 12 + (index % 8) * 5;
      const resort = new THREE.Mesh(new THREE.BoxGeometry(32 + (index % 4) * 11, height, 28 + (index % 3) * 9), index % 5 === 0 ? resortGlass : resortWall);
      resort.position.set(-world * 0.34 + (index % 17) * 210, height / 2, -world * 0.34 + Math.floor(index / 17) * 165);
      resort.rotation.y = 0.08 * (index % 6);
      this.worldRoot.add(resort);
    }

    const beach = new THREE.Mesh(new THREE.BoxGeometry(world * 0.86, 0.12, 220), new THREE.MeshStandardMaterial({ color: 0xd6c28c, roughness: 0.9 }));
    beach.position.set(0, 0.18, 790);
    beach.rotation.y = -0.05;
    this.worldRoot.add(beach);
  }

  private addForests(count: number, scale: number): void {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x67513d, roughness: 0.92 });
    const crownMaterials = [0x355f3e, 0x426f43, 0x4c7a44].map((value) => new THREE.MeshStandardMaterial({ color: value, roughness: 0.95 }));
    const world = this.region.worldSizeMeters;

    for (let index = 0; index < count; index += 1) {
      const x = -world * 0.46 + ((index * 173) % Math.round(world * 0.92));
      const z = -world * 0.46 + ((index * 317) % Math.round(world * 0.92));
      const runway = this.runwayLocal(x, z);
      if (Math.abs(runway.lateral) < 700 && Math.abs(runway.along) < this.region.runway.lengthMeters * 0.95) {
        continue;
      }

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.75 * scale, 7 * scale, 7), trunkMaterial);
      trunk.position.y = 3.5 * scale;
      const crown = new THREE.Mesh(new THREE.ConeGeometry((4.5 + (index % 4)) * scale, (13 + (index % 5)) * scale, 8), crownMaterials[index % crownMaterials.length]);
      crown.position.y = 12 * scale;
      tree.add(trunk, crown);
      tree.position.set(x, this.sampleTerrain(x, z).heightMeters, z);
      this.worldRoot.add(tree);
    }
  }

  private addPalmGroves(): void {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8a653e, roughness: 0.9 });
    const frondMaterial = new THREE.MeshStandardMaterial({ color: 0x3e7c48, roughness: 0.88 });
    for (let index = 0; index < 90; index += 1) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 10, 8), trunkMaterial);
      trunk.position.y = 5;
      palm.add(trunk);
      for (let frondIndex = 0; frondIndex < 6; frondIndex += 1) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 7.5), frondMaterial);
        frond.position.y = 10.2;
        frond.rotation.set(0.34, (Math.PI * 2 * frondIndex) / 6, 0.18);
        palm.add(frond);
      }
      palm.position.set(-3900 + (index % 18) * 210, 0, 900 + Math.floor(index / 18) * 120 + Math.sin(index) * 40);
      this.worldRoot.add(palm);
    }
  }

  private addCoastalRunwayDetail(): void {
    const detail = new THREE.Group();
    const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xd6c28c, roughness: 0.9 });
    const serviceRoadMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3d38, roughness: 0.82 });
    const resortWall = new THREE.MeshStandardMaterial({ color: 0xd7ccb6, roughness: 0.72 });
    const resortRoof = new THREE.MeshStandardMaterial({ color: 0x6c7f86, roughness: 0.62 });
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8a653e, roughness: 0.9 });
    const frondMaterial = new THREE.MeshStandardMaterial({ color: 0x3e7c48, roughness: 0.88 });
    const runway = this.region.runway;

    [-1, 1].forEach((side) => {
      const beach = new THREE.Mesh(new THREE.BoxGeometry(170, 0.08, runway.lengthMeters * 0.88), sandMaterial);
      beach.position.set(side * (runway.widthMeters * 2.8 + 105), 0.18, 0);
      detail.add(beach);

      const serviceRoad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.12, runway.lengthMeters * 0.72), serviceRoadMaterial);
      serviceRoad.position.set(side * (runway.widthMeters * 2.2 + 38), 0.28, -90);
      detail.add(serviceRoad);

      for (let index = 0; index < 15; index += 1) {
        const along = -runway.lengthMeters * 0.42 + index * (runway.lengthMeters * 0.84) / 14;
        const palm = this.createPalm(trunkMaterial, frondMaterial);
        palm.position.set(side * (runway.widthMeters * 3.2 + 42 + (index % 3) * 18), 0.28, along + Math.sin(index) * 28);
        detail.add(palm);
      }

      for (let index = 0; index < 7; index += 1) {
        const height = 12 + (index % 4) * 4;
        const resort = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(38, height, 24), resortWall);
        body.position.y = height / 2;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(42, 2.5, 28), resortRoof);
        roof.position.y = height + 1.25;
        resort.add(body, roof);
        resort.position.set(side * (runway.widthMeters * 4.8 + 250), 0.2, -runway.lengthMeters * 0.28 + index * 170);
        resort.rotation.y = side * 0.08;
        detail.add(resort);
      }
    });

    detail.position.copy(this.runwayCenterWorld());
    detail.rotation.y = -degToRad(runway.headingDeg);
    this.worldRoot.add(detail);
  }

  private createPalm(trunkMaterial: THREE.Material, frondMaterial: THREE.Material): THREE.Group {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 9.5, 8), trunkMaterial);
    trunk.position.y = 4.75;
    palm.add(trunk);

    for (let frondIndex = 0; frondIndex < 7; frondIndex += 1) {
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 7.8), frondMaterial);
      frond.position.y = 9.8;
      frond.rotation.set(0.34, (Math.PI * 2 * frondIndex) / 7, 0.18);
      palm.add(frond);
    }

    return palm;
  }

  private addMarina(): void {
    const dockMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6658, roughness: 0.8 });
    const boatMaterials = [0xf4f2df, 0x3b79a4, 0xa33b36].map((value) => new THREE.MeshStandardMaterial({ color: value, roughness: 0.54 }));
    for (let index = 0; index < 7; index += 1) {
      const dock = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 260), dockMaterial);
      dock.position.set(2100 + index * 48, 0.22, 1400);
      dock.rotation.y = 0.18;
      this.worldRoot.add(dock);
    }

    for (let index = 0; index < 32; index += 1) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 12), boatMaterials[index % boatMaterials.length]);
      hull.position.y = 0.8;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 4.5), boatMaterials[(index + 1) % boatMaterials.length]);
      cabin.position.set(0, 1.8, -1.5);
      boat.add(hull, cabin);
      boat.position.set(2040 + (index % 8) * 60, 0.2, 1290 + Math.floor(index / 8) * 62);
      boat.rotation.y = 0.18;
      this.worldRoot.add(boat);
    }
  }

  private addCableCars(): void {
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0xa9ada9, roughness: 0.55, metalness: 0.25 });
    const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x252927, roughness: 0.5 });
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xc3423a, roughness: 0.45 });
    const points = [new THREE.Vector3(-4400, 280, -2800), new THREE.Vector3(-3000, 520, -2200), new THREE.Vector3(-1500, 760, -1600), new THREE.Vector3(200, 980, -900)];

    for (const point of points) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3.5, 60, 8), towerMaterial);
      tower.position.set(point.x, point.y - 30, point.z);
      this.worldRoot.add(tower);
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      this.worldRoot.add(this.createCylinderBetween(points[index], points[index + 1], 1.1, cableMaterial));
      const midpoint = points[index].clone().lerp(points[index + 1], 0.52);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 14), cabinMaterial);
      cabin.position.copy(midpoint).add(new THREE.Vector3(0, -18, 0));
      this.worldRoot.add(cabin);
    }
  }

  private addCommuterRail(): void {
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2f2f, roughness: 0.5, metalness: 0.2 });
    for (let index = 0; index < 2; index += 1) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, this.region.worldSizeMeters * 0.72), railMaterial);
      rail.position.set(-2100 + index * 8, 0.28, -600);
      rail.rotation.y = -0.32;
      this.worldRoot.add(rail);
    }
  }

  private addReservoirs(worldSize: number): void {
    const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x426d83, roughness: 0.48, metalness: 0, transparent: true, opacity: 0.74 });
    for (let index = 0; index < 4; index += 1) {
      const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(260 + index * 70, 280 + index * 70, 0.08, 32), waterMaterial);
      reservoir.position.set(worldSize * 0.22 + index * 520, 0.12, worldSize * 0.24 + Math.sin(index) * 240);
      reservoir.scale.z = 0.58;
      this.worldRoot.add(reservoir);
    }
  }

  private addClouds(): void {
    for (let index = 0; index < 24; index += 1) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshStandardMaterial({ color: 0xf2f7fa, transparent: true, opacity: 0.68, roughness: 1 }));
      cloud.scale.set(90 + (index % 6) * 16, 20 + (index % 4) * 5, 30 + (index % 5) * 9);
      cloud.position.set(-5400 + index * 470, 850 + (index % 6) * 75, -3900 + (index % 7) * 640);
      this.worldRoot.add(cloud);
    }
  }

  private async loadOnlineLayer(): Promise<void> {
    if (!this.onlineScenery || !this.region.online.enabled) {
      this.reportScenery({ regionId: this.region.id, mode: "offline", message: `${this.region.name}: procedural scenery`, attribution: this.region.online.attribution });
      return;
    }

    const region = this.region;
    const controller = new AbortController();
    this.sceneryAbortController = controller;
    this.reportScenery({ regionId: region.id, mode: "loading", message: `Loading live OpenStreetMap scenery for ${region.shortName}` });

    try {
      const data = await loadOpenStreetMapScenery(region, controller.signal);
      if (this.region.id !== region.id || controller.signal.aborted) {
        return;
      }

      this.addOnlineScenery(data);
      this.reportScenery({ regionId: region.id, mode: "online", message: `Live OpenStreetMap layer: ${data.features.length} features`, featureCount: data.features.length, attribution: data.attribution });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to load online scenery";
      this.reportScenery({ regionId: region.id, mode: "error", message: `Using procedural fallback: ${message}`, attribution: region.online.attribution });
    }
  }

  private addOnlineScenery(data: OnlineSceneryData): void {
    const group = new THREE.Group();
    const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x8f938d, roughness: 0.74 });
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x303633, roughness: 0.82 });
    const motorwayMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4f50, roughness: 0.8 });
    const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x3d8398, roughness: 0.5, transparent: true, opacity: 0.72 });
    const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x4f7746, roughness: 0.94 });

    for (const feature of data.features) {
      if (feature.kind === "road") {
        this.addOnlineRoad(group, feature, feature.tags.highway === "motorway" || feature.tags.highway === "trunk" ? motorwayMaterial : roadMaterial);
      } else if (feature.kind === "building") {
        this.addOnlineBoxFeature(group, feature, buildingMaterial, feature.heightMeters);
      } else if (feature.kind === "water") {
        this.addOnlineBoxFeature(group, feature, waterMaterial, 0.08);
      } else {
        this.addOnlineBoxFeature(group, feature, greenMaterial, 0.06);
      }
    }

    this.worldRoot.add(group);
  }

  private addOnlineRoad(group: THREE.Group, feature: OnlineSceneryFeature, material: THREE.Material): void {
    const points = feature.points.map((point) => this.geodeticToWorld(point.latitudeDeg, point.longitudeDeg));
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const deltaX = end.x - start.x;
      const deltaZ = end.z - start.z;
      const length = Math.hypot(deltaX, deltaZ);
      if (length < 6 || !this.isInsideWorld(start.x, start.z) || !this.isInsideWorld(end.x, end.z)) {
        continue;
      }

      const road = new THREE.Mesh(new THREE.BoxGeometry(feature.widthMeters, 0.12, length), material);
      road.position.set((start.x + end.x) / 2, 0.34, (start.z + end.z) / 2);
      road.rotation.y = Math.atan2(deltaX, deltaZ);
      group.add(road);
    }
  }

  private addOnlineBoxFeature(group: THREE.Group, feature: OnlineSceneryFeature, material: THREE.Material, heightMeters: number): void {
    const points = feature.points.map((point) => this.geodeticToWorld(point.latitudeDeg, point.longitudeDeg)).filter((point) => this.isInsideWorld(point.x, point.z));
    if (points.length < 3) {
      return;
    }

    const bounds = points.reduce(
      (current, point) => ({
        minX: Math.min(current.minX, point.x),
        maxX: Math.max(current.maxX, point.x),
        minZ: Math.min(current.minZ, point.z),
        maxZ: Math.max(current.maxZ, point.z)
      }),
      { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY }
    );
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    if (width < 3 || depth < 3 || width > 260 || depth > 260) {
      return;
    }

    const height = Math.max(0.06, heightMeters);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set((bounds.minX + bounds.maxX) / 2, height / 2 + 0.28, (bounds.minZ + bounds.maxZ) / 2);
    group.add(mesh);
  }

  private buildAircraft(): void {
    const white = new THREE.MeshStandardMaterial({ color: 0xf2eee0, roughness: 0.42, metalness: 0.04 });
    const red = new THREE.MeshStandardMaterial({ color: 0xa9232e, roughness: 0.38 });
    const darkRed = new THREE.MeshStandardMaterial({ color: 0x76202b, roughness: 0.46 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x244f63, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.82 });
    const black = new THREE.MeshStandardMaterial({ color: 0x151817, roughness: 0.68 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb7bec0, roughness: 0.36, metalness: 0.22 });

    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 6.7, 8, 24), white);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.7, 24), white);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 1.2, -4.45);

    const cabin = new THREE.Group();
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.92, 1.42), glass);
    windshield.position.set(0, 2.0, -1.45);
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.22, 1.62), white);
    cabinRoof.position.set(0, 2.58, -1.45);
    cabin.add(windshield, cabinRoof);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.18, 1.48), white);
    wing.position.set(0, 2.48, -0.55);
    const leftWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 1.35), red);
    leftWingTip.position.set(-5.58, 2.48, -0.55);
    const rightWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 1.35), red);
    rightWingTip.position.set(5.58, 2.48, -0.55);
    const leftFlap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 0.42), darkRed);
    leftFlap.position.set(-2.3, 2.34, 0.28);
    const rightFlap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 0.42), darkRed);
    rightFlap.position.set(2.3, 2.34, 0.28);

    const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.13, 0.76), white);
    tailplane.position.set(0, 1.78, 3.92);
    const elevatorStripe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.2), red);
    elevatorStripe.position.set(0, 1.87, 4.27);
    const verticalTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 1.28), white);
    verticalTail.position.set(0, 2.25, 4.12);
    const rudderStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.28), red);
    rudderStripe.position.set(0, 2.4, 4.68);
    const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 5.8), red);
    leftStripe.position.set(-0.86, 1.45, -0.55);
    const rightStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 5.8), red);
    rightStripe.position.set(0.86, 1.45, -0.55);

    const strutMaterial = new THREE.MeshStandardMaterial({ color: 0xd5d6cf, roughness: 0.48, metalness: 0.08 });
    const leftStrut = this.createCylinderBetween(new THREE.Vector3(-3.3, 1.1, -0.25), new THREE.Vector3(-4.4, 2.42, -0.42), 0.045, strutMaterial);
    const rightStrut = this.createCylinderBetween(new THREE.Vector3(3.3, 1.1, -0.25), new THREE.Vector3(4.4, 2.42, -0.42), 0.045, strutMaterial);

    const gear = new THREE.Group();
    const wheelGeometry = new THREE.TorusGeometry(0.34, 0.095, 10, 20);
    const mainAxle = this.createCylinderBetween(new THREE.Vector3(-1.4, 0.55, -0.05), new THREE.Vector3(1.4, 0.55, -0.05), 0.055, metal);
    const leftWheel = new THREE.Mesh(wheelGeometry, black);
    leftWheel.rotation.y = Math.PI / 2;
    leftWheel.position.set(-1.55, 0.42, -0.05);
    const rightWheel = new THREE.Mesh(wheelGeometry, black);
    rightWheel.rotation.y = Math.PI / 2;
    rightWheel.position.set(1.55, 0.42, -0.05);
    const noseStrut = this.createCylinderBetween(new THREE.Vector3(0, 0.42, -3.45), new THREE.Vector3(0, 1.04, -3.35), 0.05, metal);
    const noseWheel = new THREE.Mesh(wheelGeometry, black);
    noseWheel.scale.set(0.78, 0.78, 0.78);
    noseWheel.rotation.y = Math.PI / 2;
    noseWheel.position.set(0, 0.36, -3.52);
    gear.add(mainAxle, leftWheel, rightWheel, noseStrut, noseWheel);

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.58, 20), metal);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -0.1;
    const propBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.58, 0.08), black);
    const propBlade2 = propBlade.clone();
    propBlade2.rotation.z = Math.PI / 2;
    this.propeller.add(propBlade, propBlade2, spinner);
    this.propeller.position.set(0, 1.2, -5.2);

    const navLeft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc72d33, emissive: 0xc72d33, emissiveIntensity: 0.7 }));
    navLeft.position.set(-5.7, 2.48, -0.55);
    const navRight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0x4ac481, emissive: 0x4ac481, emissiveIntensity: 0.7 }));
    navRight.position.set(5.7, 2.48, -0.55);

    this.aircraft.add(fuselage, nose, cabin, wing, leftWingTip, rightWingTip, leftFlap, rightFlap, tailplane, elevatorStripe, verticalTail, rudderStripe, leftStripe, rightStripe, leftStrut, rightStrut, gear, this.propeller, navLeft, navRight);
    this.aircraft.visible = false;
    this.scene.add(this.aircraft);
  }

  private updateAircraftAndCamera(deltaSeconds: number): void {
    if (!this.lastTelemetry) {
      return;
    }

    const telemetry = this.lastTelemetry;
    const local = localMetersBetween(this.region.origin, {
      latitudeDeg: telemetry.latitudeDeg,
      longitudeDeg: telemetry.longitudeDeg,
      altitudeFt: telemetry.altitudeFt
    });
    const altitudeMeters = Math.max(1.35, feetToMeters(telemetry.altitudeFt - telemetry.groundElevationFt) + 1.35);
    const aircraftPosition = new THREE.Vector3(local.east, altitudeMeters, -local.north);
    const forward = this.headingForward(telemetry.headingDeg);
    const pitchRad = degToRad(telemetry.pitchDeg);
    const flightDirection = forward.clone().multiplyScalar(Math.cos(pitchRad));
    flightDirection.y = Math.sin(pitchRad);
    flightDirection.normalize();
    const modeJustChanged = this.previousViewMode !== this.viewMode;
    this.previousViewMode = this.viewMode;

    this.aircraft.position.copy(aircraftPosition);
    this.aircraft.rotation.order = "YXZ";
    this.aircraft.rotation.y = -degToRad(telemetry.headingDeg);
    this.aircraft.rotation.x = degToRad(telemetry.pitchDeg);
    this.aircraft.rotation.z = degToRad(-telemetry.bankDeg);
    this.propeller.rotation.z += deltaSeconds * Math.max(18, telemetry.rpm / 14);
    this.aircraft.visible = this.viewMode === "chase";

    if (this.viewMode === "chase") {
      this.setCameraFov(54);
      const chaseTarget = aircraftPosition.clone().add(forward.clone().multiplyScalar(-38)).add(new THREE.Vector3(0, telemetry.onGround ? 7.5 : 12, 0));
      const lookAt = aircraftPosition.clone().add(forward.clone().multiplyScalar(14)).add(new THREE.Vector3(0, 2.6, 0));
      this.camera.up.set(0, 1, 0);
      this.camera.position.lerp(chaseTarget, modeJustChanged ? 1 : 0.16);
      this.camera.lookAt(lookAt);
      return;
    }

    const cockpitBase = aircraftPosition.clone().add(forward.clone().multiplyScalar(this.viewMode === "pilot" ? 1.95 : 1.05)).add(new THREE.Vector3(0, this.viewMode === "pilot" ? 2.28 : 1.92, 0));
    const lookAt = cockpitBase.clone().add(flightDirection.clone().multiplyScalar(1200));
    const rolledUp = new THREE.Vector3(0, 1, 0).applyAxisAngle(flightDirection, degToRad(telemetry.bankDeg));
    this.setCameraFov(this.viewMode === "pilot" ? 72 : 60);
    this.camera.up.copy(rolledUp);
    this.camera.position.lerp(cockpitBase, modeJustChanged ? 1 : 0.28);
    this.camera.lookAt(lookAt);
  }

  private runwayCenterWorld(): THREE.Vector3 {
    const center = localMetersBetween(this.region.origin, this.region.runway.center);
    return new THREE.Vector3(center.east, 0, -center.north);
  }

  private runwayLocal(x: number, z: number): { along: number; lateral: number } {
    const center = this.runwayCenterWorld();
    const dx = x - center.x;
    const dz = z - center.z;
    const headingRad = degToRad(this.region.runway.headingDeg);
    return {
      along: dx * Math.sin(headingRad) + dz * -Math.cos(headingRad),
      lateral: dx * Math.cos(headingRad) + dz * Math.sin(headingRad)
    };
  }

  private geodeticToWorld(latitudeDeg: number, longitudeDeg: number): THREE.Vector3 {
    const local = localMetersBetween(this.region.origin, { latitudeDeg, longitudeDeg, altitudeFt: this.region.origin.altitudeFt });
    return new THREE.Vector3(local.east, 0, -local.north);
  }

  private isInsideWorld(x: number, z: number): boolean {
    const half = this.region.worldSizeMeters / 2;
    return x > -half && x < half && z > -half && z < half;
  }

  private headingForward(headingDeg: number): THREE.Vector3 {
    const headingRad = degToRad(headingDeg);
    return new THREE.Vector3(Math.sin(headingRad), 0, -Math.cos(headingRad)).normalize();
  }

  private setCameraFov(fov: number): void {
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private addWindsockToGroup(group: THREE.Group, x: number, z: number): void {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 10), new THREE.MeshStandardMaterial({ color: 0xd8d2c2 }));
    pole.position.set(x, 9, z);
    const windsock = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xe9573f, roughness: 0.7 }));
    windsock.position.set(x + 9, 17.5, z);
    windsock.rotation.z = Math.PI / 2;
    group.add(pole, windsock);
  }

  private addPapiToGroup(group: THREE.Group, x: number, z: number): void {
    for (let index = 0; index < 4; index += 1) {
      const material = new THREE.MeshStandardMaterial({ color: index < 2 ? 0xffeeee : 0xff3232, emissive: index < 2 ? 0xffffff : 0xff1111, emissiveIntensity: 0.7 });
      const light = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.4), material);
      light.position.set(x + index * 4, 0.6, z);
      group.add(light);
    }
  }

  private createCylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(start).add(direction.multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(end, start).normalize());
    return mesh;
  }

  private reportScenery(status: SceneryLoadStatus): void {
    this.onSceneryStatus?.(status);
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material.dispose();
        }
      }
    });
  }
}