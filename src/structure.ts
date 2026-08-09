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

interface PenciltestLineOptions {
  strokeColor?: Color | string;
  strokeCorner?: CanvasLineJoin;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: Color | string;
  fillOpacity?: number;
}

interface PenciltestSceneOptions extends PenciltestLineOptions, Rect {
  background?: string;
  debug?: boolean;
  frameHold?: number;
  framerate?: number;
  loop?: boolean;
}

interface PenciltestOptions extends PenciltestSceneOptions {
  container?: string;
  hideCursor?: boolean;
  onionSkin?: boolean;
  onionSkinFrameRadius?: number;
  renderer?: Renderers;
  scrubAudio?: boolean;
  showStatus?: boolean;
  smoothing?: number;
  onionSkinForwardColor?: Color;
  onionSkinBackwardColor?: Color;
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
  getDimensions?(): Rect;
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
  width?: number;
  height?: number;
  backgroundColor?: string;
}

interface PenciltestRenderer {
  options: PenciltestRendererOptions;
  container: HTMLElement;
  width: number;
  height: number;

  resize(width: number, height: number):void;

  moveTo(x: number, y: number):void

  lineTo(x: number, y: number):void

  rect(config:Rect, options:PenciltestLineOptions):void

  composeOptions(overrides: PenciltestRendererOptions, persist: boolean | null):PenciltestLineOptions;

  beginPath():void;

  endPath():void;

  subpath(path: Path):void;

  render():void

  requestRender():void

  getColorString(color: Color | string, opacity:number):string

  clear(redrawBackground:boolean):void

  destroy():void
}


interface Mark extends Vector { weight?: number; }

interface Stroke extends PenciltestLineOptions {
  path: Path;
};

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
  attr?: Dictionary;
  children?: Array<PenciltestUIComponentOptions>;
  className?: string;
  el?: HTMLElement;
  html?: string;
  id?: string;
  is?: PenciltestUIComponent;
  key?: string;
  on?: {[key:string]: Function};
  parent?: PenciltestUIComponent | string;
  parentElement?: HTMLElement;
  style?: Dictionary;
  tagName?: string;
  text?: string;
};

type PenciltestUIComponentDict = { [key: string]: PenciltestUIComponent; };

interface PenciltestStatusMessageOptions {
  messageTimeout: number;
};
