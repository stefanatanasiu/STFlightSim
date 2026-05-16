import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Gauge, Layers, Map, Monitor, Pause, Plane, Play, RotateCcw, Settings } from "lucide-react";
import { InputManager } from "@stflightsim/input";
import { formatGaugeValue, getPrimaryWarning } from "@stflightsim/instruments";
import { FlightScene, type SceneryLoadStatus } from "@stflightsim/renderer";
import { DEFAULT_SCENERY_REGION, SCENERY_REGIONS, type OnlineSceneryDetail, type SceneryRegionId } from "@stflightsim/scenery";
import { DEFAULT_AIRCRAFT_CONTROLS, STANDARD_ENVIRONMENT, type AircraftTelemetry, type CameraViewMode, type SimulationStatus } from "@stflightsim/shared";
import { SimulationClient } from "@stflightsim/simulation";

const VIEW_MODES: CameraViewMode[] = ["pilot", "cockpit", "chase"];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<FlightScene | null>(null);
  const simulationRef = useRef<SimulationClient | null>(null);
  const pausedRef = useRef(false);
  const [telemetry, setTelemetry] = useState<AircraftTelemetry | null>(null);
  const [status, setStatus] = useState<SimulationStatus>("starting");
  const [paused, setPaused] = useState(false);
  const [activeGamepad, setActiveGamepad] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CameraViewMode>("pilot");
  const [regionId, setRegionId] = useState<SceneryRegionId>(DEFAULT_SCENERY_REGION.id);
  const [osmDetail, setOsmDetail] = useState<OnlineSceneryDetail>("standard");
  const [sceneryStatus, setSceneryStatus] = useState<SceneryLoadStatus>({ regionId: DEFAULT_SCENERY_REGION.id, mode: "loading", detail: "standard", message: "Preparing scenery" });
  const activeRegion = useMemo(() => SCENERY_REGIONS.find((region) => region.id === regionId) ?? DEFAULT_SCENERY_REGION, [regionId]);
  const warning = getPrimaryWarning(telemetry);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const scene = new FlightScene(canvasRef.current, { region: DEFAULT_SCENERY_REGION, osmDetail: "standard", onSceneryStatus: setSceneryStatus });
    sceneRef.current = scene;
    scene.setViewMode("pilot");
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    sceneRef.current?.setOsmDetail(osmDetail);
  }, [osmDetail]);

  useEffect(() => {
    sceneRef.current?.setRegion(activeRegion);
    simulationRef.current?.setRegion(activeRegion.id);
    setTelemetry(null);
  }, [activeRegion]);

  useEffect(() => {
    const simulation = new SimulationClient();
    const input = new InputManager(window);
    simulationRef.current = simulation;
    simulation.onTelemetry((snapshot) => {
      setTelemetry(snapshot);
      sceneRef.current?.setTelemetry(snapshot);
    });
    simulation.onStatus((nextStatus) => setStatus(nextStatus));
    simulation.setEnvironment(STANDARD_ENVIRONMENT);
    simulation.start();

    let lastFrame = performance.now();
    let animationFrame = 0;

    const update = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const snapshot = input.update(deltaSeconds);
      setActiveGamepad(snapshot.activeGamepad);
      simulation.setControls(snapshot.controls);

      if (snapshot.commands.pauseToggleRequested) {
        const nextPaused = !pausedRef.current;
        pausedRef.current = nextPaused;
        setPaused(nextPaused);
        simulation.setPaused(nextPaused);
      }

      if (snapshot.commands.resetRequested) {
        simulation.reset();
      }

      if (snapshot.commands.viewCycleRequested) {
        setViewMode((current) => VIEW_MODES[(VIEW_MODES.indexOf(current) + 1) % VIEW_MODES.length]);
      }

      if (snapshot.commands.viewModeRequested) {
        setViewMode(snapshot.commands.viewModeRequested);
      }

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame);
      input.dispose();
      simulation.dispose();
      simulationRef.current = null;
    };
  }, []);

  const systems = useMemo(() => {
    if (!telemetry) {
      return DEFAULT_AIRCRAFT_CONTROLS;
    }

    return {
      ...DEFAULT_AIRCRAFT_CONTROLS,
      throttle: telemetry.throttle,
      mixture: telemetry.mixture,
      elevatorTrim: telemetry.elevatorTrim,
      flapsIndex: Math.round(telemetry.flapsDeg / 10)
    };
  }, [telemetry]);

  const togglePause = () => {
    const nextPaused = !paused;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    simulationRef.current?.setPaused(nextPaused);
  };

  const viewLabel = viewMode === "pilot" ? "Pilot" : viewMode === "cockpit" ? "Cockpit" : "Chase";
  const osmDetailLabel = osmDetail === "high" ? "OSM high" : "OSM standard";

  return (
    <main className="simulator-shell">
      <canvas ref={canvasRef} className="scene-canvas" aria-label="Flight simulator 3D view" />
      <header className="top-bar">
        <div className="brand-lockup">
          <Plane size={20} aria-hidden="true" />
          <span>STFlightSim</span>
        </div>
        <div className="status-strip">
          <span className={`status-pill status-${status}`}>{status}</span>
          <span>{activeGamepad ? "Gamepad" : "Keyboard"}</span>
          <span>{viewLabel}</span>
          <span>{activeRegion.shortName}</span>
          <span>{osmDetailLabel}</span>
          <span>{telemetry?.onGround ? "Ground" : "Airborne"}</span>
        </div>
        <div className="toolbar" aria-label="Simulator toolbar">
          <label className="scenario-picker" title="Scenery region">
            <Map size={17} aria-hidden="true" />
            <select aria-label="Scenery region" value={regionId} onChange={(event) => setRegionId(event.target.value as SceneryRegionId)}>
              {SCENERY_REGIONS.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.shortName}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={`icon-button detail-button ${osmDetail === "high" ? "active" : ""}`} onClick={() => setOsmDetail((detail) => detail === "high" ? "standard" : "high")} title="High-resolution OpenStreetMap" aria-label="High-resolution OpenStreetMap" aria-pressed={osmDetail === "high"}>
            <Layers size={17} />
          </button>
          <ViewButton mode="pilot" active={viewMode === "pilot"} onSelect={setViewMode} label="Pilot view" />
          <ViewButton mode="cockpit" active={viewMode === "cockpit"} onSelect={setViewMode} label="Cockpit view" />
          <ViewButton mode="chase" active={viewMode === "chase"} onSelect={setViewMode} label="Chase view" />
          <button type="button" className="icon-button" onClick={togglePause} title={paused ? "Resume" : "Pause"} aria-label={paused ? "Resume" : "Pause"}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button type="button" className="icon-button" onClick={() => simulationRef.current?.reset()} title="Reset" aria-label="Reset">
            <RotateCcw size={18} />
          </button>
          <button type="button" className="icon-button" onClick={() => setSettingsOpen((value) => !value)} title="Settings" aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {warning && <div className="warning-banner">{warning}</div>}

  {viewMode === "pilot" && <HudOverlay telemetry={telemetry} />}
  {viewMode === "cockpit" && <CockpitOverlay telemetry={telemetry} />}

      <section className="left-stack" aria-label="Primary instruments">
        <InstrumentPanel telemetry={telemetry} />
      </section>

      <section className="right-stack" aria-label="Engine and systems">
        <EnginePanel telemetry={telemetry} />
        <SystemsPanel telemetry={telemetry} throttle={systems.throttle} mixture={systems.mixture} />
      </section>

      {settingsOpen && <SettingsPanel telemetry={telemetry} />}

      <footer className="bottom-strip">
        <div>{activeRegion.airportName}</div>
        <div className={`scenery-status scenery-${sceneryStatus.mode}`}>{sceneryStatus.message}</div>
        <div>JSBSim/WASM adapter staged</div>
        <div>{sceneryStatus.mode === "online" ? `${sceneryStatus.detail === "high" ? "High-res" : "Standard"} OSM vectors` : "Procedural fallback ready"}</div>
      </footer>
    </main>
  );
}

function ViewButton({ mode, active, onSelect, label }: { mode: CameraViewMode; active: boolean; onSelect: (mode: CameraViewMode) => void; label: string }) {
  return (
    <button type="button" className={`icon-button view-button ${active ? "active" : ""}`} onClick={() => onSelect(mode)} title={label} aria-label={label}>
      {mode === "pilot" ? <Monitor size={17} /> : mode === "cockpit" ? <Gauge size={17} /> : <Camera size={17} />}
    </button>
  );
}

function HudOverlay({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  return (
    <div className="hud-overlay" aria-label="Pilot HUD">
      <div className="hud-reticle">
        <span />
      </div>
      <div className="hud-tape hud-speed">
        <small>KIAS</small>
        <strong>{formatGaugeValue(telemetry?.airspeedKts ?? 0)}</strong>
      </div>
      <div className="hud-tape hud-altitude">
        <small>ALT</small>
        <strong>{formatGaugeValue(telemetry?.altitudeFt ?? 0)}</strong>
      </div>
      <div className="hud-heading">{formatGaugeValue(telemetry?.headingDeg ?? 0)} deg</div>
      <div className="hud-flightpath" style={{ transform: `translate(-50%, calc(-50% + ${-(telemetry?.pitchDeg ?? 0) * 3}px)) rotate(${-(telemetry?.bankDeg ?? 0)}deg)` }} />
    </div>
  );
}

function CockpitOverlay({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  return (
    <div className="cockpit-overlay" aria-label="Cockpit frame">
      <div className="windshield-frame windshield-left" />
      <div className="windshield-frame windshield-right" />
      <div className="windshield-frame windshield-center" />
      <div className="glare-shield" />
      <div className="cockpit-panel">
        <MiniDial label="ASI" value={formatGaugeValue(telemetry?.airspeedKts ?? 0)} />
        <MiniDial label="ALT" value={formatGaugeValue(telemetry?.altitudeFt ?? 0)} />
        <MiniDial label="VSI" value={formatGaugeValue(telemetry?.verticalSpeedFpm ?? 0)} />
        <MiniDial label="HDG" value={formatGaugeValue(telemetry?.headingDeg ?? 0)} />
        <MiniDial label="RPM" value={formatGaugeValue(telemetry?.rpm ?? 0)} />
      </div>
    </div>
  );
}

function MiniDial({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-dial">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InstrumentPanel({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  const pitch = telemetry?.pitchDeg ?? 0;
  const bank = telemetry?.bankDeg ?? 0;
  const horizonTransform = `rotate(${-bank}deg) translateY(${pitch * 1.8}px)`;

  return (
    <div className="panel instrument-panel">
      <div className="panel-title">
        <Gauge size={16} aria-hidden="true" />
        <span>Primary</span>
      </div>
      <div className="six-pack">
        <GaugeTile label="KIAS" value={formatGaugeValue(telemetry?.airspeedKts ?? 0)} accent="green" />
        <div className="attitude-tile">
          <div className="attitude-mask">
            <div className="horizon" style={{ transform: horizonTransform }}>
              <div className="sky-band" />
              <div className="ground-band" />
            </div>
            <div className="aircraft-reference" />
          </div>
          <span>ATT</span>
        </div>
        <GaugeTile label="ALT" value={formatGaugeValue(telemetry?.altitudeFt ?? 0)} unit="ft" accent="amber" />
        <GaugeTile label="VSI" value={formatGaugeValue(telemetry?.verticalSpeedFpm ?? 0)} unit="fpm" accent="teal" />
        <GaugeTile label="HDG" value={formatGaugeValue(telemetry?.headingDeg ?? 0)} unit="deg" accent="white" />
        <GaugeTile label="G" value={formatGaugeValue(telemetry?.gLoad ?? 1, 1)} accent="red" />
      </div>
    </div>
  );
}

function EnginePanel({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  return (
    <div className="panel engine-panel">
      <div className="panel-title">Engine</div>
      <div className="engine-grid">
        <LinearGauge label="RPM" value={telemetry?.rpm ?? 0} max={2700} />
        <LinearGauge label="MP" value={telemetry?.manifoldPressureInHg ?? 0} max={30} suffix="inHg" />
        <LinearGauge label="Fuel" value={telemetry?.fuelGallons ?? 0} max={53} suffix="gal" />
        <LinearGauge label="Flow" value={telemetry?.fuelFlowGph ?? 0} max={12} suffix="gph" />
      </div>
    </div>
  );
}

function SystemsPanel({ telemetry, throttle, mixture }: { telemetry: AircraftTelemetry | null; throttle: number; mixture: number }) {
  return (
    <div className="panel systems-panel">
      <div className="system-row">
        <span>Throttle</span>
        <meter min="0" max="1" value={throttle} />
      </div>
      <div className="system-row">
        <span>Mixture</span>
        <meter min="0" max="1" value={mixture} />
      </div>
      <div className="system-row">
        <span>Flaps</span>
        <span>{formatGaugeValue(telemetry?.flapsDeg ?? 0)} deg</span>
      </div>
      <div className="system-row">
        <span>Trim</span>
        <span>{formatGaugeValue(telemetry?.elevatorTrim ?? 0, 2)}</span>
      </div>
      <div className="system-row">
        <span>AoA</span>
        <span>{formatGaugeValue(telemetry?.angleOfAttackDeg ?? 0, 1)} deg</span>
      </div>
    </div>
  );
}

function SettingsPanel({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  return (
    <aside className="settings-panel panel" aria-label="Settings">
      <div className="panel-title">Flight Data</div>
      <dl>
        <dt>Latitude</dt>
        <dd>{formatGaugeValue(telemetry?.latitudeDeg ?? 0, 5)}</dd>
        <dt>Longitude</dt>
        <dd>{formatGaugeValue(telemetry?.longitudeDeg ?? 0, 5)}</dd>
        <dt>Sim Time</dt>
        <dd>{formatGaugeValue(telemetry?.simTimeSec ?? 0, 1)} s</dd>
        <dt>Ground Speed</dt>
        <dd>{formatGaugeValue(telemetry?.groundSpeedKts ?? 0)} kt</dd>
      </dl>
    </aside>
  );
}

function GaugeTile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent: "green" | "amber" | "teal" | "white" | "red" }) {
  return (
    <div className={`gauge-tile accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </div>
  );
}

function LinearGauge({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const normalized = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="linear-gauge">
      <div className="linear-gauge-label">
        <span>{label}</span>
        <span>{formatGaugeValue(value, value < 20 ? 1 : 0)} {suffix}</span>
      </div>
      <div className="linear-gauge-track">
        <div style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
