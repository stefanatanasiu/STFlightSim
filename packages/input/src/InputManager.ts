import { clamp, DEFAULT_AIRCRAFT_CONTROLS, moveTowards, type AircraftControls, type CameraViewMode } from "@stflightsim/shared";

export interface InputCommands {
  pauseToggleRequested: boolean;
  resetRequested: boolean;
  viewCycleRequested: boolean;
  viewModeRequested: CameraViewMode | null;
}

export interface InputSnapshot {
  controls: AircraftControls;
  commands: InputCommands;
  activeGamepad: string | null;
}

const AXIS_RESPONSE_PER_SECOND = 3.2;

export class InputManager {
  private readonly pressedKeys = new Set<string>();
  private controls: AircraftControls = { ...DEFAULT_AIRCRAFT_CONTROLS };
  private commands: InputCommands = { pauseToggleRequested: false, resetRequested: false, viewCycleRequested: false, viewModeRequested: null };
  private activeGamepad: string | null = null;
  private readonly keydownHandler = (event: KeyboardEvent) => this.onKeyDown(event);
  private readonly keyupHandler = (event: KeyboardEvent) => this.onKeyUp(event);

  constructor(private readonly target: Window = window) {
    this.target.addEventListener("keydown", this.keydownHandler);
    this.target.addEventListener("keyup", this.keyupHandler);
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.keydownHandler);
    this.target.removeEventListener("keyup", this.keyupHandler);
  }

  update(deltaSeconds: number): InputSnapshot {
    const keyboardAxes = this.getKeyboardAxes();
    const gamepadAxes = this.getGamepadAxes();
    const pitchTarget = clamp(keyboardAxes.pitch + gamepadAxes.pitch, -1, 1);
    const rollTarget = clamp(keyboardAxes.roll + gamepadAxes.roll, -1, 1);
    const rudderTarget = clamp(keyboardAxes.rudder + gamepadAxes.rudder, -1, 1);

    this.controls.elevator = moveTowards(this.controls.elevator, pitchTarget, AXIS_RESPONSE_PER_SECOND * deltaSeconds);
    this.controls.aileron = moveTowards(this.controls.aileron, rollTarget, AXIS_RESPONSE_PER_SECOND * deltaSeconds);
    this.controls.rudder = moveTowards(this.controls.rudder, rudderTarget, AXIS_RESPONSE_PER_SECOND * deltaSeconds);
    this.controls.brakeLeft = this.controls.brakeRight = this.isPressed("KeyB") || this.isPressed("Space") ? 1 : gamepadAxes.brake;

    const throttleDelta = (this.isPressed("ShiftLeft") || this.isPressed("ShiftRight") ? 0.45 : 0) -
      (this.isPressed("ControlLeft") || this.isPressed("ControlRight") ? 0.45 : 0) +
      gamepadAxes.throttleDelta;
    const mixtureDelta = (this.isPressed("KeyC") ? 0.35 : 0) - (this.isPressed("KeyX") ? 0.35 : 0);
    this.controls.throttle = clamp(this.controls.throttle + throttleDelta * deltaSeconds, 0, 1);
    this.controls.mixture = clamp(this.controls.mixture + mixtureDelta * deltaSeconds, 0, 1);

    const snapshot: InputSnapshot = {
      controls: { ...this.controls },
      commands: { ...this.commands },
      activeGamepad: this.activeGamepad
    };

    this.commands = { pauseToggleRequested: false, resetRequested: false, viewCycleRequested: false, viewModeRequested: null };
    return snapshot;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat && ["KeyF", "KeyR", "BracketLeft", "BracketRight", "KeyP", "KeyV", "Digit1", "Digit2", "Digit3", "Backspace"].includes(event.code)) {
      return;
    }

    this.pressedKeys.add(event.code);

    if (event.code === "KeyF") {
      this.controls.flapsIndex = clamp(this.controls.flapsIndex + 1, 0, 3);
    }

    if (event.code === "KeyR") {
      this.controls.flapsIndex = clamp(this.controls.flapsIndex - 1, 0, 3);
    }

    if (event.code === "BracketRight") {
      this.controls.elevatorTrim = clamp(this.controls.elevatorTrim + 0.05, -1, 1);
    }

    if (event.code === "BracketLeft") {
      this.controls.elevatorTrim = clamp(this.controls.elevatorTrim - 0.05, -1, 1);
    }

    if (event.code === "KeyP") {
      this.commands.pauseToggleRequested = true;
    }

    if (event.code === "Backspace") {
      this.commands.resetRequested = true;
    }

    if (event.code === "KeyV") {
      this.commands.viewCycleRequested = true;
    }

    if (event.code === "Digit1") {
      this.commands.viewModeRequested = "pilot";
    }

    if (event.code === "Digit2") {
      this.commands.viewModeRequested = "cockpit";
    }

    if (event.code === "Digit3") {
      this.commands.viewModeRequested = "chase";
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.code);
  }

  private isPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  private getKeyboardAxes(): { pitch: number; roll: number; rudder: number } {
    return {
      pitch: (this.isPressed("KeyS") || this.isPressed("ArrowDown") ? 1 : 0) - (this.isPressed("KeyW") || this.isPressed("ArrowUp") ? 1 : 0),
      roll: (this.isPressed("KeyD") || this.isPressed("ArrowRight") ? 1 : 0) - (this.isPressed("KeyA") || this.isPressed("ArrowLeft") ? 1 : 0),
      rudder: (this.isPressed("KeyE") ? 1 : 0) - (this.isPressed("KeyQ") ? 1 : 0)
    };
  }

  private getGamepadAxes(): { pitch: number; roll: number; rudder: number; throttleDelta: number; brake: number } {
    const gamepads = navigator.getGamepads?.() ?? [];
    const gamepad = Array.from(gamepads).find((candidate): candidate is Gamepad => Boolean(candidate));

    if (!gamepad) {
      this.activeGamepad = null;
      return { pitch: 0, roll: 0, rudder: 0, throttleDelta: 0, brake: 0 };
    }

    this.activeGamepad = gamepad.id;
    const deadzone = 0.08;
    const axis = (index: number): number => {
      const value = gamepad.axes[index] ?? 0;
      return Math.abs(value) < deadzone ? 0 : value;
    };

    const buttonValue = (index: number): number => gamepad.buttons[index]?.value ?? 0;

    return {
      pitch: clamp(axis(1), -1, 1),
      roll: clamp(axis(0), -1, 1),
      rudder: clamp(axis(2), -1, 1),
      throttleDelta: clamp(buttonValue(7) * 0.35 - buttonValue(6) * 0.35 - axis(3) * 0.08, -0.5, 0.5),
      brake: clamp(buttonValue(4) + buttonValue(5), 0, 1)
    };
  }
}
