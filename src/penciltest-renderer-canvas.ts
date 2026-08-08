class CanvasRenderer extends BaseRenderer {
  field: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  currentLineOptions: {
      fillStyle:string;
      strokeStyle:string;
      lineJoin:string;
      lineWidth:number;
    };
  //container: HTMLElement;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = document.createElement('canvas') as HTMLCanvasElement;
    this.context = this.field.getContext('2d', {alpha: false});

    this.resize(this.options.width, this.options.height);

    this.container.appendChild(this.field);

    this.applyStyle(); // Was skipped over in super's composeOptions, because this.context can't be set before super() is called.
  }

  beginPath():void {
    super.beginPath();
    this.context.beginPath();
  }

  endPath():void {
    this.context.strokeStyle = this.currentLineOptions.strokeStyle;
    super.endPath();
    this.context.stroke();
  }

  moveTo(x: number, y: number):void {
    super.moveTo(x, y);
    this.context.moveTo(x, y);
  }

  lineTo(x: number, y: number) {
    super.lineTo(x, y);
    return this.context.lineTo(x, y);
  }
  
  rect(rect:Rect, options: PenciltestLineOptions):void {
    const { x, y, width, height } = rect;
    //this.beginPath();
    this.composeOptions(options);
    if (options.fillColor && !options.strokeColor) {
      this.context.fillStyle = this.currentLineOptions.fillStyle;
      this.context.fillRect(x, y, width, height);
    } else {
      this.context.rect(x, y, width, height);
    }
    if (options.strokeColor) {
      this.context.strokeStyle = this.currentLineOptions.strokeStyle;
      this.context.stroke();
    }
    super.rect(rect, options);
  }

  applyStyle() {
    if (this.context) {
      Object.assign(this.context, this.currentLineOptions);
    }
  }

  composeOptions(overrides: PenciltestRendererOptions = {}, persist: boolean | null = null):PenciltestLineOptions {
    const composedOptions = super.composeOptions(overrides);
    this.currentLineOptions = {
      fillStyle: this.getColorString(composedOptions.fillColor, composedOptions.fillOpacity),
      strokeStyle: this.getColorString(composedOptions.strokeColor, composedOptions.strokeOpacity),
      lineJoin: composedOptions.strokeCorner,
      lineWidth: composedOptions.strokeWeight,
    };
    this.applyStyle();
    return composedOptions;
  }

  clear(redrawBackground:boolean = true) {
    const { x, y, width, height } = this.getFieldRect();
    this.context.clearRect(x, y, width, height);
    return super.clear(redrawBackground);
  }

  destroy() {
    this.field.remove();
    return super.destroy();
  }

  resize(width: number, height: number) {
    this.field.setAttribute('width', String(width));
    this.field.setAttribute('height', String(height));
    return super.resize(width, height);
  }
}
