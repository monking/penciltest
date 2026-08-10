interface TextOptions {
  anchor:Point;
  fillColor?:string;
  fontFamily?:string;
  fontSize?:number;
  strokeColor?:string;
  strokeFirst?:boolean;
  strokeWidth?:number;
}

class BaseRenderer implements PenciltestRenderer {

  options: PenciltestRendererOptions;
  overrides: PenciltestRendererOptions;
  currentStyle: PenciltestRendererOptions;
  width: number;
  height: number;
  container: HTMLElement;
  renderWaitId: number;
  renderOperationQueue: Array<Function>;

  static defaultOptions: PenciltestRendererOptions = {
    container: 'body',
    strokeColor: 'black',
    background: 'lightgray',
    strokeWidth: 1,
    strokeOpacity: 1,
    strokeCorner: 'round',
    width: 1920,
    height: 1080,
    debug: false
  };

  constructor(options: PenciltestRendererOptions) {
    this.options = {
      ...BaseRenderer.defaultOptions,
      ...options
    };

    this.renderOperationQueue = [];
    this.renderWaitId = NaN;

    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }

    this.overrides = {}

    this.composeOptions();

    //this.resize(this.options.width, this.options.height); // Let descendants do this. It might not be ready yet.
  }

  setOptions(options:PenciltestRendererOptions) {
    if (this.options.debug) { console.log('   setOptions'); }
    Object.assign(this.options, options);
  }

  getColorString(color: Color | string | null, opacity:number = -1): string {
    if (!color) {
      return '';
    }
    let rgb:string;
    let opacityValue:string = '';
    if (opacity !== -1) {
      opacityValue = String(opacity);
    }
    if (Array.isArray(color)) {
      rgb = color.slice(0,3).join(' ');
      if (opacityValue.length === 0 && color.length === 4) {
        opacityValue = String(color[3]);
      }
    } else if (opacityValue) {
      rgb = `from ${String(color)} r g b`;
    } else {
      return String(color);
    }
    return `rgb(${rgb}${opacityValue ? ' / '+opacityValue : ''})`;
  }

  resize(width: number, height: number): void {
    if (this.options.debug) { console.log('  resize'); }
    this.width = width;
    this.height = height;
  }

  composeOptions(options: PenciltestRendererOptions = {}, persist: boolean | null = null) {
    this.currentStyle = {
      ...this.options
    };

    if (persist === true) { Object.assign(this.overrides, options); }

    if (persist !== false) { Object.assign(this.currentStyle, this.overrides); }

    if (persist !== true) { Object.assign(this.currentStyle, options); }
  }

  subpath(path: Path) {
    if (this.options.debug) { console.log(' subpath'); }
    path.forEach((segment, index) => {
      const { x, y } = segment;
      if (index === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    });
  }

  moveTo(x: number, y: number): void {
    if (this.options.debug) { console.log('moveTo: %s, %s', x, y); }
  }

  moveToPoint(point:Point): void {
    this.moveTo(point.x, point.y);
  }

  lineTo(x: number, y: number): void {
    if (this.options.debug) { console.log('lineTo: %s, %s', x, y); }
  }

  lineToPoint(point:Point): void {
    this.lineTo(point.x, point.y);
  }

  rect(rect:Rect, options: PenciltestLineOptions):void {
    if (this.options.debug) { console.log('rect'); }
  }

  requestRender(...enqueueWork:Array<Function>): void {
    if (this.options.debug) { console.log('   render: REQ'); }
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
    if (this.options.debug) { console.log('   render:     BEGIN'); }
    const queueLength = this.renderOperationQueue.length;
    if (queueLength === 0) { return; }
    const renderStart = performance.now();
    this.renderOperationQueue.forEach((o) => o(this, timestamp));
    const renderElapsed = performance.now() - renderStart;
    if (this.options.debug) { console.log(`   render:           DONE (${renderElapsed} ms, ${queueLength} operations)`); }
    this.renderOperationQueue = [];
  }



  getFieldRect():Rect {
    if (this.options.debug) { console.log('  getFieldRect'); }
    return {x:0, y:0, width:this.width, height:this.height};
  }

  beginPath(options:PenciltestLineOptions | null = null):void {
    if (this.options.debug) { console.log('beginPath'); }
    if (options !== null) {
      this.composeOptions(options);
    }
  }

  endPath():void {
    if (this.options.debug) { console.log('endPath'); }
  }

  clear(redrawBackground:boolean = true):void {
    if (this.options.debug) { console.log(` clear${redrawBackground ? ' BACK' : ''}`); }
    if (redrawBackground && this.options.background !== 'transparent') {
      const fieldRect = this.getFieldRect();
      this.rect(fieldRect, { fillColor: this.options.background });
    }
  }

  destroy(): void {
    if (this.options.debug) { console.log('   destroy'); }
  }

  arc(arc:Arc, options:PenciltestLineOptions = {}): void {
    Object.assign(arc, PTSpace.defaultArc, arc);
    const arcPoints = PTSpace.traceArc(arc)
    this.composeOptions(options);
    if (this.options.debug) { console.log(` arc ⊙ ${arc.radius} ⊾ ${arc.end - arc.start} ▷ ${arc.resolution} ▦ ${arc.center.x},${arc.center.y} ⾊ ${this.currentStyle.strokeColor}`); }
    this.subpath(arcPoints);
  }

  circle(arc:Arc, options:PenciltestLineOptions): void {
    if (this.options.debug) { console.log({'fn':'circle',arc,options}); }
    const circle:Arc = { start: 0, ...arc }
    circle.end = circle.start + 1;
    this.arc(circle, options);
    // Maybe other contexts will have diferent logic. For now, the default
    // "arc" without arguments is a circle, so `arc` and `circle` are the same
    // for now..
  }

  text(text:string, options: TextOptions) {
    if (this.options.debug) { console.log({'fn':'text',text,options}); }
  }
}
