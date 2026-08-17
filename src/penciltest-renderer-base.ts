interface TextOptions {
  anchor:Point;
  fillColor?:string;
  fontFamily?:string;
  fontSize?:number;
  strokeColor?:string;
  strokeFirst?:boolean;
  strokeWidth?:number;
}

enum RenderOp {
  arc = '⌒',
  clearBG = '▮',
  clear = '⌧',
  circle = '°',
  destroy = '☠',
  lineTo = '_',
  moveTo = '-',
  setOptions = '✔',
  beginPath = '<',
  endPath = '>',
  quadraticCurve = '⩪',
  bezierCurve = '⩫',
  requestRender = '…',
  rect = '▯',
  render = '⌅',
  subpath = '⸾',
  text = 't',
  resize = '⤡',
};

class BaseRenderer implements PenciltestRenderer {

  options: PenciltestRendererOptions;
  overrides: PenciltestRendererOptions;
  currentStyle: PenciltestRendererOptions;
  width: number;
  height: number;
  container: HTMLElement;
  renderWaitId: number;
  renderOperationQueue: Array<Function>;
  renderLog: Array<[string,number]>
  name: string;

  static defaultOptions: PenciltestRendererOptions = {
    container: 'body',
    strokeColor: 'black',
    background: 'lightgray',
    strokeWidth: 1,
    strokeOpacity: 1,
    strokeCorner: 'round',
    strokeCap: 'round',
    variableStyle: true,
    width: 1920,
    height: 1080,
    debug: false,
    name: '',
  };

  constructor(options: PenciltestRendererOptions) {
    this.renderLog = [];
    this.options = {
      ...BaseRenderer.defaultOptions,
      ...options
    };
    this.name = this.options.name;

    this.renderOperationQueue = [];
    this.renderWaitId = NaN;

    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }

    this.overrides = {}

    this.composeStyles();

    //this.resize(this.options.width, this.options.height); // Let descendants do this. It might not be ready yet.
  }

  queueLog(verb:RenderOp): void {
    const lastLog = this.renderLog[this.renderLog.length - 1];
    if (lastLog && lastLog[0] === verb) {
      lastLog[1]++;
    } else {
      this.renderLog.push([verb, 1]);
    }
  }

  flushLog(): string {
    const output = this.renderLog
      .map((entry) => {
        const [ verb, count ] = entry;
        return `${verb}${count > 1 ? `×${count}` : ''}`;
      })
      .join('');
    this.renderLog = [];
    return `${this.name}:${output}`;
  }

  setOptions(options:PenciltestRendererOptions) {
    this.queueLog(RenderOp.setOptions);
    Object.assign(this.options, options);
  }

  resize(width: number, height: number): void {
    this.queueLog(RenderOp.resize)
    this.width = width;
    this.height = height;
  }

  composeStyles(overrides: PenciltestRendererOptions = {}, persist: boolean | null = null): PenciltestRendererOptions {
    this.currentStyle = {
      ...this.options
    };

    if (persist === true) { Object.assign(this.overrides, overrides); }

    if (persist !== false) { Object.assign(this.currentStyle, this.overrides); }

    if (persist !== true) { Object.assign(this.currentStyle, overrides); }

    if (this.options.debug) { console.debug(`strokeWidth, curr:${this.currentStyle.strokeWidth}, ovrd:${overrides.strokeWidth}`); }

    return this.currentStyle;
  }

  subpath(path: Path) {
    if (!Array.isArray(path)) { return; }
    path.forEach((segment, index) => {
      const { x, y } = segment;
      if (index === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    });
  }

  quadraticStroke(stroke: Stroke, overrides: PenciltestLineOptions = {}) {
    if (!Array.isArray(stroke.path) || stroke.path.length < 3) { return; } // FIXME short paths/marks
    const {
      variableStyle,
      strokeWidth,
      strokeColor,
    } = this.composeStyles({
      strokeWidth: stroke.width,
      ...overrides,
    }, false);

    if (!variableStyle) {
      this.beginPath();
    }
    for (let i = -1; i < stroke.path.length; i++) {
      const segment = stroke.path.slice(Math.max(i, 0), i+3)
      if (segment.length < 2) { continue; }
      if (segment.length === 2) {
        if (i === -1) {
          segment.unshift(segment[0]);
        } else {
          segment.push(segment[1]);
        }
      }
      const [ p0, p1, p2 ] = segment;
      const c1 = PtSpace.lerpPoint(p0, p1);
      const c2 = PtSpace.lerpPoint(p1, p2);
      // LATER: lineJoin of 'round' would show overlap if path is <100% alpha.
      // #889abf7a-831e-4b76-ba2f-38a840b7d87c
      if (variableStyle) {
        const segmentOverrides: PenciltestRendererOptions = {strokeColor};
        if ("weight" in p1) {
          // NOTE: this.overrides is only set if this.composeStyles was called
          // with persist = true (2nd param).
          segmentOverrides.strokeWidth = strokeWidth * (p1.weight as number);
        }
        this.beginPath(segmentOverrides);
      }
      this.moveToPoint(c1);
      this.quadraticCurveToPoint(p1, c2);
      if (variableStyle) { this.endPath(); }
    }
    if (!variableStyle) {
      this.endPath();
    }
  }

  quadraticCurveToPoint(p1:Point, p2:Point): void {
    this.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  }

  quadraticCurveTo(x1: number, y1: number, x2: number, y2: number): void {
    this.queueLog(RenderOp.quadraticCurve);
  }

  moveTo(x: number, y: number): void {
    this.queueLog(RenderOp.moveTo);
  }

  moveToPoint(point:Point): void {
    this.moveTo(point.x, point.y);
  }

  lineTo(x: number, y: number): void {
    this.queueLog(RenderOp.lineTo);
  }

  lineToPoint(point:Point): void {
    this.lineTo(point.x, point.y);
  }

  rect(rect:Rect, options: PenciltestLineOptions): void {
    this.queueLog(RenderOp.rect)
  }

  requestRender(...enqueueWork:Array<Function>): void {
    this.queueLog(RenderOp.requestRender)
    if (enqueueWork.length > 0) {
      Array.prototype.push.apply(this.renderOperationQueue, enqueueWork);
    }
    if (!isNaN(this.renderWaitId)) { return; } // Already pending request.
    this.renderWaitId = globalThis.requestAnimationFrame((timestamp) => {
      this.renderWaitId = NaN;
      this.render(timestamp);
    });
  }

  render(timestamp:number = 0): void {
    this.queueLog(RenderOp.render);
    const queueLength = this.renderOperationQueue.length;
    if (queueLength === 0) { return; }
    const renderStart = performance.now();
    this.renderOperationQueue.forEach((o) => o(this, timestamp));
    const renderElapsed = performance.now() - renderStart;
    this.renderOperationQueue = [];
    console.log(this.flushLog());
  }

  getFieldRect(): Rect {
    return {x:0, y:0, width:this.width, height:this.height};
  }

  beginPath(options:PenciltestLineOptions | null = null): void {
    this.queueLog(RenderOp.beginPath);
    if (options !== null) {
      this.composeStyles(options, false);
    }
  }

  endPath(): void {
    this.queueLog(RenderOp.endPath);
  }

  clear(redrawBackground:boolean = false): void {
    this.queueLog(redrawBackground ? RenderOp.clearBG : RenderOp.clear);
    if (redrawBackground && this.options.background !== 'transparent') {
      const fieldRect = this.getFieldRect();
      this.rect(fieldRect, { fillColor: this.options.background });
    }
  }

  destroy(): void {
    this.queueLog(RenderOp.destroy);
    if (this.options.debug) { console.log(this.flushLog()); }
  }

  arc(arc:Arc, options:PenciltestLineOptions = {}): void {
    Object.assign(arc, PtSpace.defaultArc, arc);
    const arcPoints = PtSpace.traceArc(arc)
    this.composeStyles(options, false);
    this.queueLog(RenderOp.arc)
    this.subpath(arcPoints);
  }

  circle(arc:Arc, options:PenciltestLineOptions): void {
    this.queueLog(RenderOp.circle)
    const circle:Arc = { start: 0, ...arc }
    circle.end = circle.start + 1;
    this.arc(circle, options);
    // Maybe other contexts will have diferent logic. For now, the default
    // "arc" without arguments is a circle, so `arc` and `circle` are the same
    // for now..
  }

  text(text:string, options: TextOptions) {
    this.queueLog(RenderOp.text)
  }
}
