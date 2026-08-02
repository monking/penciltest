enum Renderers {
  CANVAS = "canvas",
  SVG = "svg"
};

enum PenciltestModes {
  DRAWING = "drawing",
  ERASING = "erasing",
  WORKING = "working",
  PLAYING = "playing"
};

enum PenciltestTools { PENCIL, ERASER };

interface PenciltestOptions {
  background?: string;
  container?: string;
  debug?: boolean;
  frameHold?: number;
  framerate?: number;
  hideCursor?: boolean;
  lineColor?: string;
  lineWeight?: number;
  loop?: boolean;
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

interface PenciltestInsrument {
  id: string;
  version: string;
}

interface PenciltestFrame {
  strokes?: Array<Stroke>;
  packedStrokes?: string;
  hold?: number;
  time?: number;
}

interface PenciltestFrameMeta {
  duration: number;
  exposure: number;
  id: number;
  time: number;
}

interface PenciltestSceneAudio {
  url: string;
  info?: string;
  offset?: number;
}

interface PenciltestSceneState {
  frames?: Array<PenciltestFrameMeta>;
  //exposures?: Array<PenciltestFrameMeta>; // DELME exposures not used @1785520725
  duration?: number;
  exposureCount?: number;
  exposureNumber?: number;
  frameNumber?: number;
  singleFrameDuration?: number;
}

interface PenciltestScene {
  aspectRatio?: string;
  audio?: PenciltestSceneAudio;
  background?: string;
  current?: PenciltestSceneState;
  dateCreated?: string;
  dateModified?: string;
  framerate?: number;
  frames?: Array<PenciltestFrame>;
  height?: number;
  instrument?: PenciltestInsrument;
  lineColor?: string;
  lineWeight?: number;
  name?: string;
  uuid?: string;
  width?: number;
};

interface PenciltestState {
  mode: PenciltestModes;
  toolStack: Array<PenciltestTools>;
  version: string;
  smoothDrawInterval?: number;
};

type Color = [number, number, number, number] | [number, number, number];

interface PenciltestLineOptions {
  color?: Color | string;
  corner?: CanvasLineJoin;
  opacity?: number;
  weight?: number;
}


interface PenciltestRendererOptions {
  background?: string;
  container?: string | HTMLElement;
  height?: number;
  lineColor?: string;
  lineCorner?: CanvasLineJoin;
  lineOpacity?: number;
  lineWeight?: number;
  width?: number;
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



interface Point { x: number; y: number; }

interface Stroke extends PenciltestLineOptions {
  path: Array<Point>;
}

interface PositionDescription { x: string; y: string; }

interface Bounds {
  width?: number;
  height?: number;
  aspect?: number;
  aspectRatio?: string;
}

interface Rect extends Point, Bounds {};

interface PenciltestUIOptions extends PenciltestUIComponentOptions {
  controller?: Penciltest;
}

interface PenciltestAppAction {
  label: string;
  hotkey?: Array<string>;
  gesture?: RegExp;
  listener?: Function;
  action?: Function;
  triggerOnMove?: boolean;
  repeat?: boolean;
  cancelComplementKeyEvent?: boolean;
  text?: string;
  title?: string;
}

type AppActionsList = {
  [key: string]: PenciltestAppAction
}

interface PenciltestUIComponentOptions {
  tagName?: string;
  className?: string | null;
  text?: string | null;
  id?: string | null;
  parent: HTMLElement;
};

interface GIFEncoderInterface {
  setDelay(ms: number): void;
  setDispose(code: number): void;
  setRepeat(iter: number): void;
  setTransparent(c: number | null): void;
  setComment(c:string): void;
  addFrame(im:CanvasRenderingContext2D | null, ...is_imageData: boolean[]): boolean;
  finish(): void;
  setFrameRate(fps:number): void;
  setQuality(quality:number): void;
  setSize(w:number, h:number): void;
  start(): boolean;
  cont(): boolean;
  stream(): { bin:Array<number> } | null;
  setProperties(has_start:boolean, is_first:boolean): null;
};

interface RaphaelInterface {
  version: string;
  eve(name:string, scope:any, ...varargs:any): Array<any>;
  // eve._events: Array<any>
  // eve.listeners(name:string): Array<Function>
  // eve.on(name:string, f:Function): (z:number) => any
  // eve.f(event:string, ...args:any): Function
  // eve.stop(): void
  // eve.nt(subname:string): string | boolean
  _ISURL: RegExp;
  _availableAttrs: any;
  _availableAnimAttrs: any;
  _radial_gradient: RegExp;
  _rectPath(x, y, w, h, r): Array<Array<any>>
  _getPath: any;
  clear(): void;
  remove(): void;
  path(pathString:string): HTMLElement
};
