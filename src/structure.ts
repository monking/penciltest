enum Renderers {
  CANVAS = "canvas",
  SVG = "svg"
};

enum PenciltestModes { DRAWING, ERASING, WORKING, PLAYING };

enum PenciltestTools { PENCIL, ERASER };

enum Color {
  black = [0,0,0],
  blue = [0,0,255],
  cyan = [0,255,255],
  green = [255,255,0],
  red = [255,0,0],
  white = [256,255,255],
};


interface PenciltestOptions {
  container?: string;
  hideCursor?: boolean;
  loop?: boolean;
  showStatus?: boolean;
  frameHold?: number;
  onionSkin?: boolean;
  smoothing?: number;
  onionSkinFrameRadius?: number;
  lineColor?: string;
  lineWeight?: number;
  background?: string;
  renderer?: Renderers;
  onionSkinOpacity?: number;
};

interface PenciltestGesture {
  touches: number;
  origin: Point;
  last?: Point;
  delta?: Point;
  deltaNormalized?: Point;
  startFrameNumber?: number;
}

interface PenciltestInsrument {
  id: string;
  version: string;
}

interface PenciltestFrame {
  hold: number,
  strokes: Array<Stroke>
}

interface PenciltestFrameMeta {
  id: number,
  exposure: number,
  duration: number,
  time: number
}

interface PenciltestScene { 
  aspect: string;
  background: string;
  width: number;
  height: number;
  framerate: number;
  frames: Array<PenciltestFrame>;
  lineColor: string;
  lineWeight: number;
  dateCreated?: string;
  dateModified?: string;
  name?: string;
  uuid?: string;
  instrument?: PenciltestInsrument;
};

interface PenciltestState {
  version: string;
  mode: PenciltestModes;
  toolStack: Array<PenciltestTools>;
  smoothDrawInterval?: number;
};

type Color = [number, number, number, number] | [number, number, number];

enum LineCorner { round, bevel, miter };

interface PenciltestLineOptions {
  color?: Color;
  weight?: number;
  corner?: LineCorner;
}


interface PenciltestRendererOptions {
  container: string | HTMLElement;
  width: number;
  height: number;
  lineColor?: string;
  lineWeight?: number;
  lineOpacity?: number;
  lineCorner?: string;
}

interface PenciltestRenderer {
  options: PenciltestRendererOptions;
  container: HTMLElement;
  width: number;
  height: number;

  currentLineOptions: PenciltestLineOptions;

  constructor(options: PenciltestRendererOptions): void;

  resize(width: number, height: number): void;

  moveTo(x: number, y: number): void

  lineTo(x: number, y: number): void

  rect(x: number, y: number, width: number, height: number, backgroundColor: string, strokeColor: string): void

  composeOptions(overrides: PenciltestRendererOptions, persist: boolean | null = null): void;

  path(path: Stroke): void;

  render(): void

  clear(): void

  destroy(): void
}



interface Point { x: number; y: number; }

interface Mark extends Point { weight: number; }

interface Stroke {
  path: Array<Mark>,
  options?: PenciltestLineOptions
}

interface PositionDescription { x: string; y: string; }

interface Bounds { width: number; height: number; }

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
  cancelComplementKeyEvent: boolean;
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

