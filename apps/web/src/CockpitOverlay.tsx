import { formatGaugeValue } from "@stflightsim/instruments";
import type { AircraftTelemetry } from "@stflightsim/shared";

type CockpitFamily = "c172" | "f16" | "airbus" | "boeing";

interface CockpitSpec {
  key: string;
  family: CockpitFamily;
  aircraftClass: string;
  label: string;
  engines: number;
  frame: "trainer" | "fighter" | "transport";
  glassTone: "airbus" | "boeing" | "fighter" | "analog";
}

const COCKPIT_SPECS: Record<string, CockpitSpec> = {
  "c172-sp-dev": { key: "c172", family: "c172", aircraftClass: "c172", label: "C172", engines: 1, frame: "trainer", glassTone: "analog" },
  "f16c-block50-dev": { key: "f16", family: "f16", aircraftClass: "f16", label: "F-16C", engines: 1, frame: "fighter", glassTone: "fighter" },
  "a320-200-dev": { key: "a320", family: "airbus", aircraftClass: "a320", label: "A320", engines: 2, frame: "transport", glassTone: "airbus" },
  "a330-300-dev": { key: "a330", family: "airbus", aircraftClass: "a330", label: "A330", engines: 2, frame: "transport", glassTone: "airbus" },
  "a380-800-dev": { key: "a380", family: "airbus", aircraftClass: "a380", label: "A380", engines: 4, frame: "transport", glassTone: "airbus" },
  "b747-400-dev": { key: "b747", family: "boeing", aircraftClass: "b747", label: "B747", engines: 4, frame: "transport", glassTone: "boeing" }
};

const FALLBACK_COCKPIT: CockpitSpec = COCKPIT_SPECS["c172-sp-dev"];

export function CockpitOverlay({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  const spec = getCockpitSpec(telemetry?.aircraftId);

  return (
    <div className={`cockpit-overlay cockpit-${spec.family} cockpit-${spec.aircraftClass}`} aria-label={`${spec.label} cockpit`} data-cockpit={spec.key}>
      <CockpitFrame frame={spec.frame} />
      {spec.family === "c172" && <C172Cockpit telemetry={telemetry} />}
      {spec.family === "f16" && <F16Cockpit telemetry={telemetry} spec={spec} />}
      {spec.family === "airbus" && <AirbusCockpit telemetry={telemetry} spec={spec} />}
      {spec.family === "boeing" && <Boeing747Cockpit telemetry={telemetry} spec={spec} />}
    </div>
  );
}

function getCockpitSpec(aircraftId: string | undefined): CockpitSpec {
  return aircraftId ? COCKPIT_SPECS[aircraftId] ?? FALLBACK_COCKPIT : FALLBACK_COCKPIT;
}

function CockpitFrame({ frame }: { frame: CockpitSpec["frame"] }) {
  if (frame === "fighter") {
    return (
      <>
        <div className="fighter-canopy-rail fighter-canopy-left" />
        <div className="fighter-canopy-rail fighter-canopy-right" />
        <div className="fighter-canopy-bow" />
        <div className="fighter-canopy-sill" />
      </>
    );
  }

  return (
    <>
      <div className={`windshield-frame windshield-left windshield-${frame}`} />
      <div className={`windshield-frame windshield-right windshield-${frame}`} />
      <div className={`windshield-frame windshield-center windshield-${frame}`} />
      <div className={`glare-shield glare-shield-${frame}`} />
    </>
  );
}

function C172Cockpit({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  const pitch = telemetry?.pitchDeg ?? 0;
  const bank = telemetry?.bankDeg ?? 0;
  const heading = telemetry?.headingDeg ?? 0;
  const airspeed = telemetry?.airspeedKts ?? 0;
  const altitude = telemetry?.altitudeFt ?? 0;
  const verticalSpeed = telemetry?.verticalSpeedFpm ?? 0;
  const throttle = telemetry?.throttle ?? 0;
  const mixture = telemetry?.mixture ?? 1;

  return (
    <div className="cockpit-panel c172-panel">
      <div className="c172-yoke" aria-hidden="true" />
      <div className="c172-six-pack">
        <RoundGauge label="ASI" value={formatGaugeValue(airspeed)} unit="kt" needleDeg={clamp(airspeed / 160, 0, 1) * 260 - 130} accent="green" />
        <RoundAttitude pitch={pitch} bank={bank} />
        <RoundGauge label="ALT" value={formatGaugeValue(altitude)} unit="ft" needleDeg={(altitude % 1000) / 1000 * 360} accent="amber" />
        <RoundGauge label="TURN" value={formatGaugeValue(bank, 0)} unit="deg" needleDeg={clamp(bank, -35, 35)} accent="teal" />
        <RoundHeading heading={heading} />
        <RoundGauge label="VSI" value={formatGaugeValue(verticalSpeed)} unit="fpm" needleDeg={clamp(verticalSpeed / 2000, -1, 1) * 115} accent="white" />
      </div>
      <div className="c172-engine-stack">
        <div className="c172-stack-title">ENG</div>
        <SmallBar label={telemetry?.enginePrimaryLabel ?? "RPM"} value={telemetry?.enginePrimaryValue ?? telemetry?.rpm ?? 0} max={telemetry?.enginePrimaryMax ?? 2700} suffix={telemetry?.enginePrimarySuffix} />
        <SmallBar label={telemetry?.engineSecondaryLabel ?? "MP"} value={telemetry?.engineSecondaryValue ?? telemetry?.manifoldPressureInHg ?? 0} max={telemetry?.engineSecondaryMax ?? 30} suffix={telemetry?.engineSecondarySuffix} />
        <SmallBar label="Fuel" value={telemetry?.fuelGallons ?? 0} max={telemetry?.fuelCapacityGallons ?? 56} suffix="gal" />
      </div>
      <div className="c172-switch-stack">
        <StatusLamp label="ALT" active={Boolean(telemetry?.engineRunning)} />
        <StatusLamp label="VAC" active={!telemetry?.warning} />
        <StatusLamp label="PITOT" active={true} />
        <div className="c172-lever-row">
          <Lever label="THR" value={throttle} />
          <Lever label="MIX" value={mixture} />
        </div>
      </div>
    </div>
  );
}

function F16Cockpit({ telemetry, spec }: { telemetry: AircraftTelemetry | null; spec: CockpitSpec }) {
  return (
    <>
      <FighterHud telemetry={telemetry} />
      <div className="cockpit-panel f16-panel">
        <FighterMfd title="FCR" telemetry={telemetry} mode="radar" />
        <div className="f16-center-stack">
          <div className="f16-ded">
            <span>DED</span>
            <strong>{formatGaugeValue(telemetry?.headingDeg ?? 0)} HDG</strong>
            <small>{formatGaugeValue(telemetry?.gLoad ?? 1, 1)} G / AOA {formatGaugeValue(telemetry?.angleOfAttackDeg ?? 0, 1)}</small>
          </div>
          <div className="f16-icp">
            {['COM', 'NAV', 'LIST', 'A-A', 'A-G', 'IFF', 'SEQ', 'RTN', 'ENT'].map((key) => <span key={key}>{key}</span>)}
          </div>
          <div className="f16-standby-row">
            <RoundGauge label="ALT" value={formatGaugeValue(telemetry?.altitudeFt ?? 0)} needleDeg={((telemetry?.altitudeFt ?? 0) % 1000) / 1000 * 360} accent="amber" />
            <RoundAttitude pitch={telemetry?.pitchDeg ?? 0} bank={telemetry?.bankDeg ?? 0} compact />
          </div>
        </div>
        <FighterMfd title="SMS" telemetry={telemetry} mode="systems" engines={spec.engines} />
      </div>
    </>
  );
}

function AirbusCockpit({ telemetry, spec }: { telemetry: AircraftTelemetry | null; spec: CockpitSpec }) {
  return (
    <div className="cockpit-panel glass-cockpit airbus-cockpit">
      <FlightControlUnit telemetry={telemetry} brand="airbus" />
      <div className="airbus-main-row">
        <PfdDisplay telemetry={telemetry} tone="airbus" label="PFD" />
        <NavigationDisplay telemetry={telemetry} tone="airbus" label="ND" />
        <EcamDisplay telemetry={telemetry} spec={spec} />
      </div>
      <div className="airbus-lower-row">
        <SystemMemo telemetry={telemetry} tone="airbus" />
        {spec.key === "a380" && <SideSystemsDisplay telemetry={telemetry} label="OIT" />}
        {spec.key !== "a380" && <SideSystemsDisplay telemetry={telemetry} label="SD" />}
      </div>
    </div>
  );
}

function Boeing747Cockpit({ telemetry, spec }: { telemetry: AircraftTelemetry | null; spec: CockpitSpec }) {
  return (
    <div className="cockpit-panel glass-cockpit boeing-cockpit">
      <FlightControlUnit telemetry={telemetry} brand="boeing" />
      <div className="boeing-main-row">
        <PfdDisplay telemetry={telemetry} tone="boeing" label="PFD" />
        <NavigationDisplay telemetry={telemetry} tone="boeing" label="ND" />
        <EicasDisplay telemetry={telemetry} spec={spec} />
      </div>
      <div className="boeing-lower-row">
        <SystemMemo telemetry={telemetry} tone="boeing" />
        <div className="boeing-control-stand">
          <Lever label="SPD BRK" value={telemetry?.onGround ? 0.45 : 0.08} />
          <Lever label="THR" value={telemetry?.throttle ?? 0} />
          <Lever label="FLAP" value={clamp((telemetry?.flapsDeg ?? 0) / 30, 0, 1)} />
        </div>
      </div>
    </div>
  );
}

function FlightControlUnit({ telemetry, brand }: { telemetry: AircraftTelemetry | null; brand: "airbus" | "boeing" }) {
  const speed = telemetry?.airspeedKts ?? 0;
  const heading = telemetry?.headingDeg ?? 0;
  const altitude = telemetry?.altitudeFt ?? 0;
  const verticalSpeed = telemetry?.verticalSpeedFpm ?? 0;
  const powerMode = (telemetry?.throttle ?? 0) > 0.92 ? (brand === "airbus" ? "TOGA" : "THR REF") : (telemetry?.throttle ?? 0) > 0.55 ? (brand === "airbus" ? "CLB" : "N1") : "IDLE";

  return (
    <div className={`fcu-strip fcu-${brand}`}>
      <ModeWindow label={brand === "airbus" ? "ATHR" : "A/T"} value={powerMode} />
      <ModeWindow label="SPD" value={formatGaugeValue(speed)} />
      <ModeWindow label="HDG" value={formatGaugeValue(heading)} />
      <ModeWindow label="ALT" value={formatGaugeValue(Math.round(altitude / 100) * 100)} />
      <ModeWindow label="VS" value={formatGaugeValue(verticalSpeed)} />
    </div>
  );
}

function ModeWindow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mode-window">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PfdDisplay({ telemetry, tone, label }: { telemetry: AircraftTelemetry | null; tone: "airbus" | "boeing"; label: string }) {
  const pitch = telemetry?.pitchDeg ?? 0;
  const bank = telemetry?.bankDeg ?? 0;
  const modeLeft = (telemetry?.throttle ?? 0) > 0.9 ? (tone === "airbus" ? "MAN TOGA" : "TOGA") : (telemetry?.engineRunning ? "CLB" : "OFF");

  return (
    <div className={`glass-display pfd-display pfd-${tone}`}>
      <DisplayHeader label={label} left={modeLeft} right={telemetry?.warning ?? "NORMAL"} />
      <div className="pfd-body">
        <div className="pfd-tape pfd-speed-tape">
          <span>SPD</span>
          <strong>{formatGaugeValue(telemetry?.airspeedKts ?? 0)}</strong>
          <small>KT</small>
        </div>
        <div className="pfd-horizon-mask">
          <div className="pfd-horizon" style={{ transform: `rotate(${-bank}deg) translateY(${pitch * 2}px)` }}>
            <div className="pfd-sky" />
            <div className="pfd-ground" />
          </div>
          <div className="pfd-pitch-ladder" />
          <div className="pfd-aircraft-symbol" />
        </div>
        <div className="pfd-tape pfd-alt-tape">
          <span>ALT</span>
          <strong>{formatGaugeValue(telemetry?.altitudeFt ?? 0)}</strong>
          <small>FT</small>
        </div>
      </div>
      <div className="pfd-footer">
        <span>{formatGaugeValue(telemetry?.headingDeg ?? 0)} HDG</span>
        <span>{formatGaugeValue(telemetry?.verticalSpeedFpm ?? 0)} FPM</span>
      </div>
    </div>
  );
}

function NavigationDisplay({ telemetry, tone, label }: { telemetry: AircraftTelemetry | null; tone: "airbus" | "boeing"; label: string }) {
  const heading = telemetry?.headingDeg ?? 0;

  return (
    <div className={`glass-display nav-display nav-${tone}`}>
      <DisplayHeader label={label} left="MAP" right={`${formatGaugeValue(telemetry?.groundSpeedKts ?? 0)} GS`} />
      <div className="nd-rose-wrap">
        <div className="nd-rose" style={{ transform: `rotate(${-heading}deg)` }}>
          <span className="nd-north">N</span>
          <span className="nd-east">E</span>
          <span className="nd-south">S</span>
          <span className="nd-west">W</span>
        </div>
        <div className="nd-route" />
        <div className="nd-aircraft" />
      </div>
      <div className="nd-footer">
        <span>{formatGaugeValue(heading)} deg</span>
        <span>{formatGaugeValue(telemetry?.verticalSpeedFpm ?? 0)} VS</span>
      </div>
    </div>
  );
}

function EcamDisplay({ telemetry, spec }: { telemetry: AircraftTelemetry | null; spec: CockpitSpec }) {
  return (
    <div className="glass-display ecam-display">
      <DisplayHeader label="ECAM" left={spec.label} right={telemetry?.warning ?? "MEMO"} />
      <EngineColumns telemetry={telemetry} engines={spec.engines} tone="airbus" />
      <div className="ecam-status-grid">
        <span>FLAPS {formatGaugeValue(telemetry?.flapsDeg ?? 0)}</span>
        <span>FUEL {formatGaugeValue(telemetry?.fuelGallons ?? 0)} GAL</span>
        <span>TRIM {formatGaugeValue(telemetry?.elevatorTrim ?? 0, 2)}</span>
        <span>{telemetry?.onGround ? "GND" : "FLT"}</span>
      </div>
    </div>
  );
}

function EicasDisplay({ telemetry, spec }: { telemetry: AircraftTelemetry | null; spec: CockpitSpec }) {
  return (
    <div className="glass-display eicas-display">
      <DisplayHeader label="EICAS" left={spec.label} right={telemetry?.warning ?? "NO WARN"} />
      <EngineColumns telemetry={telemetry} engines={spec.engines} tone="boeing" />
      <div className="eicas-caution-list">
        <span>{telemetry?.engineRunning ? "ENG RUNNING" : "ENG SHUTDOWN"}</span>
        <span>FUEL {formatGaugeValue(telemetry?.fuelGallons ?? 0)} GAL</span>
        <span>FLAP {formatGaugeValue(telemetry?.flapsDeg ?? 0)}</span>
      </div>
    </div>
  );
}

function EngineColumns({ telemetry, engines, tone }: { telemetry: AircraftTelemetry | null; engines: number; tone: "airbus" | "boeing" | "fighter" }) {
  const primaryValue = telemetry?.enginePrimaryValue ?? telemetry?.rpm ?? 0;
  const primaryMax = telemetry?.enginePrimaryMax ?? 100;
  const secondaryValue = telemetry?.engineSecondaryValue ?? telemetry?.manifoldPressureInHg ?? 0;
  const secondaryMax = telemetry?.engineSecondaryMax ?? 100;

  return (
    <div className={`engine-columns engine-columns-${tone}`} style={{ gridTemplateColumns: `repeat(${engines}, minmax(0, 1fr))` }}>
      {Array.from({ length: engines }, (_, index) => {
        const offset = engines > 1 ? (index - (engines - 1) / 2) * 0.7 : 0;
        const primaryPct = percentage(primaryValue + offset, primaryMax);
        const secondaryPct = percentage(secondaryValue + offset * 0.45, secondaryMax);
        return (
          <div className="engine-column" key={`engine-${index + 1}`}>
            <span>{index + 1}</span>
            <div className="engine-bar">
              <div className="engine-bar-fill" style={{ height: `${primaryPct}%` }} />
            </div>
            <strong>{formatGaugeValue(primaryValue + offset, 0)}</strong>
            <small>{telemetry?.enginePrimaryLabel ?? "N1"}</small>
            <div className="engine-secondary-bar">
              <div style={{ width: `${secondaryPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FighterHud({ telemetry }: { telemetry: AircraftTelemetry | null }) {
  const pitch = telemetry?.pitchDeg ?? 0;
  const bank = telemetry?.bankDeg ?? 0;

  return (
    <div className="fighter-hud-combiner">
      <div className="fighter-hud-ladder" style={{ transform: `translate(-50%, calc(-50% + ${-pitch * 3}px)) rotate(${-bank}deg)` }} />
      <div className="fighter-hud-reticle" />
      <div className="fighter-hud-speed">{formatGaugeValue(telemetry?.airspeedKts ?? 0)}</div>
      <div className="fighter-hud-altitude">{formatGaugeValue(telemetry?.altitudeFt ?? 0)}</div>
      <div className="fighter-hud-heading">{formatGaugeValue(telemetry?.headingDeg ?? 0)} HDG</div>
      <div className="fighter-hud-data">{formatGaugeValue(telemetry?.gLoad ?? 1, 1)}G AOA {formatGaugeValue(telemetry?.angleOfAttackDeg ?? 0, 1)}</div>
    </div>
  );
}

function FighterMfd({ title, telemetry, mode, engines = 1 }: { title: string; telemetry: AircraftTelemetry | null; mode: "radar" | "systems"; engines?: number }) {
  return (
    <div className={`fighter-mfd fighter-mfd-${mode}`}>
      <DisplayHeader label={title} left="NAV" right={telemetry?.warning ?? "RDY"} />
      {mode === "radar" ? (
        <div className="fighter-radar-scope">
          <div className="fighter-radar-sweep" />
          <span className="radar-contact radar-contact-a" />
          <span className="radar-contact radar-contact-b" />
          <span className="radar-contact radar-contact-c" />
          <strong>{formatGaugeValue(telemetry?.headingDeg ?? 0)}</strong>
        </div>
      ) : (
        <div className="fighter-systems-page">
          <EngineColumns telemetry={telemetry} engines={engines} tone="fighter" />
          <SmallBar label="Fuel" value={telemetry?.fuelGallons ?? 0} max={telemetry?.fuelCapacityGallons ?? 720} suffix="gal" />
        </div>
      )}
      <div className="mfd-softkeys" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}

function SideSystemsDisplay({ telemetry, label }: { telemetry: AircraftTelemetry | null; label: string }) {
  return (
    <div className="side-systems-display">
      <DisplayHeader label={label} left="SYS" right={telemetry?.warning ?? "OK"} />
      <div className="systems-schematic">
        <span className="schematic-line schematic-fuel" />
        <span className="schematic-line schematic-hyd" />
        <span className="schematic-node schematic-node-a" />
        <span className="schematic-node schematic-node-b" />
        <span className="schematic-node schematic-node-c" />
      </div>
    </div>
  );
}

function SystemMemo({ telemetry, tone }: { telemetry: AircraftTelemetry | null; tone: "airbus" | "boeing" }) {
  return (
    <div className={`system-memo system-memo-${tone}`}>
      <span>{telemetry?.engineRunning ? "ENG" : "ENG OFF"}</span>
      <span>FLAPS {formatGaugeValue(telemetry?.flapsDeg ?? 0)}</span>
      <span>TRIM {formatGaugeValue(telemetry?.elevatorTrim ?? 0, 2)}</span>
      <span>{telemetry?.onGround ? "GROUND" : "AIR"}</span>
    </div>
  );
}

function DisplayHeader({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="display-header">
      <span>{label}</span>
      <strong>{left}</strong>
      <em>{right}</em>
    </div>
  );
}

function RoundGauge({ label, value, unit, needleDeg, accent }: { label: string; value: string; unit?: string; needleDeg: number; accent: "green" | "amber" | "teal" | "white" }) {
  return (
    <div className={`round-gauge round-gauge-${accent}`}>
      <div className="round-gauge-ticks" />
      <div className="round-gauge-needle" style={{ transform: `translateX(-50%) rotate(${needleDeg}deg)` }} />
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </div>
  );
}

function RoundAttitude({ pitch, bank, compact = false }: { pitch: number; bank: number; compact?: boolean }) {
  return (
    <div className={`round-attitude${compact ? " round-attitude-compact" : ""}`}>
      <div className="round-attitude-mask">
        <div className="round-attitude-horizon" style={{ transform: `rotate(${-bank}deg) translateY(${pitch * 1.5}px)` }}>
          <div className="round-attitude-sky" />
          <div className="round-attitude-ground" />
        </div>
        <div className="round-attitude-reference" />
      </div>
      <span>ATT</span>
    </div>
  );
}

function RoundHeading({ heading }: { heading: number }) {
  return (
    <div className="round-heading">
      <div className="heading-card" style={{ transform: `rotate(${-heading}deg)` }}>
        <span className="heading-n">N</span>
        <span className="heading-e">E</span>
        <span className="heading-s">S</span>
        <span className="heading-w">W</span>
      </div>
      <div className="heading-bug" />
      <span>HDG</span>
      <strong>{formatGaugeValue(heading)}</strong>
    </div>
  );
}

function SmallBar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="small-bar">
      <div className="small-bar-label">
        <span>{label}</span>
        <strong>{formatGaugeValue(value, value < 20 ? 1 : 0)} {suffix}</strong>
      </div>
      <div className="small-bar-track">
        <div style={{ width: `${percentage(value, max)}%` }} />
      </div>
    </div>
  );
}

function StatusLamp({ label, active }: { label: string; active: boolean }) {
  return <span className={`status-lamp${active ? " status-lamp-active" : ""}`}>{label}</span>;
}

function Lever({ label, value }: { label: string; value: number }) {
  return (
    <div className="cockpit-lever">
      <span>{label}</span>
      <div className="cockpit-lever-slot">
        <div style={{ bottom: `${clamp(value, 0, 1) * 76}%` }} />
      </div>
    </div>
  );
}

function percentage(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return clamp(value / max, 0, 1) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}