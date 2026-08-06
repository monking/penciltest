enum Renderers {
  CANVAS = "canvas",
  SVG = "svg"
};

enum PenciltestMode {
  DRAWING = "drawing",
  WORKING = "working",
  PLAYING = "playing"
};

enum PenciltestTool {
  PENCIL = "pencil",
  ERASER = "eraser",
  PAN = "pan",
  /**
   * Not yet implemented. TODO 2026-08-05
  SCALE = "scale",
  ROTATE = "rotate",
   */
};

enum PointerMode {
  PRESS = "press",
  HOVER = "hover",
  AWAY = "away",
};

type Color = [number, number, number, number] | [number, number, number];

interface Dictionary {[key:string]:string};

interface PenciltestLineOptions { /* Redundant member names for blending with other option sets. */
  lineColor?: Color | string;
  lineCorner?: CanvasLineJoin;
  lineOpacity?: number;
  lineWeight?: number;
}

interface PenciltestSceneOptions extends PenciltestLineOptions, Bounds {
  background?: string;
  frameHold?: number;
  framerate?: number;
  loop?: boolean;
}

interface PenciltestOptions extends PenciltestSceneOptions {
  container?: string;
  debug?: boolean;
  hideCursor?: boolean;
  onionSkin?: boolean;
  onionSkinFrameRadius?: number;
  onionSkinOpacity?: number;
  renderer?: Renderers;
  scrubAudio?: boolean;
  showStatus?: boolean;
  smoothing?: number;
};

interface PenciltestGesture {
  touches: number;
  origin: Point;
  delta?: Point;
  deltaNormalized?: Point;
  last?: Point;
  startFrameNumber?: number;
}

type AnyPointerEvent = PointerEvent | MouseEvent | TouchEvent;
type AnyPointerScope = "screen" | "page" | "client" | "layer" | "offset" | "movement";

interface PenciltestDragOptions {
  startTarget?: EventTarget;
  moveTarget?: EventTarget;
  endTarget?: EventTarget;
  onstart?: Function;
  onmove?: Function;
  onend?: Function;
  alreadyStartedEvent?: AnyPointerEvent;
  coordinateScope?: AnyPointerScope;
  touchLimit?: number;
};

interface PenciltestInsrument {
  id: string;
  version: string;
}

interface PenciltestFrame {
  strokes?: Array<Stroke>;
  packedStrokes?: string;
  hold?: number;
  time?: number; // milliseconds
}

interface PenciltestFrameMeta {
  duration: number; // milliseconds
  exposure: number;
  id: number;
  time: number; // milliseconds
}

interface PenciltestSceneAudio {
  url?: string;
  info?: string;
  offset?: number; // milliseconds
  volume?: number; // 0 to 100
}

interface PenciltestSceneState {
  frames?: Array<PenciltestFrameMeta>;
  duration?: number; // milliseconds
  exposureCount?: number;
  exposureNumber?: number;
  frameNumber?: number;
  strokeNumber?: number;
  singleFrameDuration?: number; // milliseconds
}

interface PenciltestSceneData extends PenciltestSceneOptions {
  audio?: PenciltestSceneAudio;
  current?: PenciltestSceneState;
  dateCreated?: string;
  dateModified?: string;
  frames?: Array<PenciltestFrame>;
  instrument?: PenciltestInsrument;
  name?: string;
  uuid?: string;
  getDimensions?(): Bounds;
  packedScale?: number;
};

interface PlaybackState {
  direction?: number | null;
  heldExposures?: number;
  stepId?: any;
  muteAudio?: boolean;
  scrubAudioId?: number;
};

type PenciltestRange = { start?: number; end?: number; }

interface PenciltestState {
  frameSelection?: PenciltestRange;
  mode: PenciltestMode;
  pointerMode: PointerMode;
  previousMode?: PenciltestMode;
  toolStack: Array<PenciltestTool>;
  version: string;
};

interface PenciltestRendererOptions extends PenciltestLineOptions, PenciltestSceneOptions {
  container?: string | HTMLElement;
}

interface PenciltestRenderer {
  options: PenciltestRendererOptions;
  container: HTMLElement;
  width: number;
  height: number;

  getColorString(color: Color | string): string;

  currentLineOptions: PenciltestLineOptions;

  resize(width: number, height: number): void;

  moveTo(x: number, y: number): void

  lineTo(x: number, y: number): void

  rect(x: number, y: number, width: number, height: number, backgroundColor: string, strokeColor: string): void

  composeOptions(overrides: PenciltestRendererOptions, persist: boolean | null): void;

  path(stroke: Stroke): void;

  render(): void

  clear(): void

  destroy(): void
}


interface Mark extends Vector { weight?: number; }

interface Stroke extends PenciltestLineOptions {
  path: Array<Point>;
}

interface PositionDescription { x: string; y: string; };

interface PenciltestAppAction {
  action?: Function;
  cancelComplementKeyEvent?: boolean;
  gesture?: RegExp;
  hotkey?: Array<string>;
  hotkeyModifiers?: Array<string>;
  label?: string;
  listener?: Function;
  repeat?: boolean;
  text?: string;
  title?: string;
  triggerOnMove?: boolean;
}

type AppActionsList = {
  [key: string]: PenciltestAppAction
}

interface PenciltestUIComponentOptions {
  key?: string;
  tagName?: string;
  id?: string;
  html?: string;
  text?: string;
  attr?: Dictionary;
  on?: {[key:string]: Function};
  className?: string;
  style?: Dictionary;
  parent?: PenciltestUIComponent | string;
  parentElement?: HTMLElement;
  children?: Array<PenciltestUIComponentOptions>;
};

type PenciltestUIComponentDict = { [key: string]: PenciltestUIComponent; };

interface PenciltestStatusMessageOptions {
  messageTimeout: number;
};
