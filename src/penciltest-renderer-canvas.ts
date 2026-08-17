class CanvasRenderer extends BaseRenderer {
  field: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  currentCanvasStyle: {
    fillStyle:string;
    strokeStyle:string;
    lineCap:CanvasLineCap;
    lineJoin:CanvasLineJoin;
    lineWidth:number;
  };
  //container: HTMLElement;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = document.createElement('canvas') as HTMLCanvasElement;
    this.field.style.backgroundColor = Utils.getColorString(this.options.background);
    this.context = this.field.getContext('2d', {alpha: options.alpha});

    this.resize(this.options.width, this.options.height);

    this.container.appendChild(this.field);

    this.applyStyle(); // Was skipped over in super's composeStyles, because this.context can't be set before super() is called.
  }

  beginPath(options:PenciltestLineOptions | null = null): void {
    super.beginPath(options);
    this.context.beginPath();
  }

  endPath(): void {
    this.context.strokeStyle = this.currentCanvasStyle.strokeStyle;
    super.endPath();
    this.context.stroke();
  }

  moveTo(x: number, y: number): void {
    super.moveTo(x, y);
    this.context.moveTo(x, y);
  }

  lineTo(x: number, y: number) {
    super.lineTo(x, y);
    return this.context.lineTo(x, y);
  }
  
  rect(rect:Rect, options: PenciltestLineOptions): void {
    const { x, y, width, height } = rect;
    //this.beginPath();
    this.composeStyles(options);
    if (options.fillColor && !options.strokeColor) {
      this.context.fillStyle = this.currentCanvasStyle.fillStyle;
      this.context.fillRect(x, y, width, height);
    } else {
      this.context.rect(x, y, width, height);
    }
    if (options.strokeColor) {
      this.context.strokeStyle = this.currentCanvasStyle.strokeStyle;
      this.context.stroke();
    }
    super.rect(rect, options);
  }

  applyStyle() {
    if (this.context) {
      Object.assign(this.context, this.currentCanvasStyle);
    }
  }

  composeStyles(overrides: PenciltestRendererOptions = {}, persist: boolean | null = null): PenciltestRendererOptions {
    super.composeStyles(overrides, persist);
    this.currentCanvasStyle = {
      fillStyle: Utils.getColorString(
        this.currentStyle.fillColor,
        "fillOpacity" in this.currentStyle ? this.currentStyle.fillOpacity : -1
      ),
      strokeStyle: Utils.getColorString(
        this.currentStyle.strokeColor,
        "strokeOpacity" in this.currentStyle ? this.currentStyle.strokeOpacity : -1
      ),
      lineJoin: this.currentStyle.strokeCorner,
      lineCap: this.currentStyle.strokeCap,
      lineWidth: this.currentStyle.strokeWidth,
    };

    this.applyStyle();

    return this.currentStyle;
  }

  clear(redrawBackground:boolean = false) {
    const { x, y, width, height } = this.getFieldRect();
    this.context.clearRect(x, y, width, height);
    return super.clear(redrawBackground);
  }

  destroy() {
    this.field.remove(); // FIXME Doesn't get removed?
    return super.destroy();
  }

  resize(width: number, height: number) {
    this.field.setAttribute('width', String(width));
    this.field.setAttribute('height', String(height));
    return super.resize(width, height);
  }

  arc(arc:Arc, options:PenciltestLineOptions = {}): void {
    this.composeStyles(options);
    this.applyStyle();
    this.context.arc(
      arc.center.x,
      arc.center.y,
      arc.radius,
      arc.start * Math.PI * 2,
      arc.end * Math.PI * 2
    );
  }

  text(text:string, options: TextOptions) {
    super.text(text, options);
    const {
      anchor,
      fillColor,
      font,
      strokeColor,
      strokeFirst,
      strokeWidth,
    } = {
      fillColor: 'black',
      font: '12px sans-serif',
      strokeColor: '',
      strokeFirst: false,
      strokeWidth: 0,
      ...options
    };
    this.context.font = font;
    const renderOperations = [];
    if (fillColor) {
      renderOperations.push(() => {
        this.context.fillStyle = fillColor;
        this.context.fillText(text, anchor.x, anchor.y);
      });
    }
    if (strokeColor && strokeWidth) {
      renderOperations.push(() => {
        this.context.strokeStyle = strokeColor;
        this.context.lineWidth = strokeWidth;
        this.context.strokeText(text, anchor.x, anchor.y);
      });
    }

    if (strokeFirst && renderOperations.length > 1) {
      renderOperations.reverse();
    }

    renderOperations.forEach((o) => o());
  }

  quadraticCurveTo(x1: number, y1: number, x2: number, y2: number): void {
    super.quadraticCurveTo(x1, y1, x2, y2);
    this.context.quadraticCurveTo(x1, y1, x2, y2);
  }
}
