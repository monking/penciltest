class CanvasRenderer extends BaseRenderer {
  field: HTMLElement;
  context: any;
  container: HTMLElement;
  currentLineOptions: PenciltestLineOptions;
  drawingPath: any;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = document.createElement('canvas');
    this.context = (this.field as HTMLCanvasElement).getContext('2d',
      {alpha: false});

    super(options);

    this.container.appendChild(this.field);

    this.applyStrokeStyle();
  }

  lineTo(x: any, y: any) {
    super.lineTo(x, y);
    return this.context.lineTo(x, y);
  }

  rect(x: any, y: any, width: any, height: any, backgroundColor: any, strokeColor: any = '') {
    super.rect(x, y, width, height, backgroundColor, strokeColor);
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    if (backgroundColor) {
      this.context.fillStyle = backgroundColor;
      this.context.fill();
    }
    if (strokeColor) {
      this.context.strokeStyle = strokeColor;
      this.context.stroke();
    }

    return this.applyStrokeStyle();
  }

  applyStrokeStyle() {
    if (this.context) {
      this.context.fillStyle = null;
      this.context.lineWidth = this.currentLineOptions.weight;
      this.context.lineJoin = this.currentLineOptions.corner;
      this.context.strokeStyle = super.getColorString(this.currentLineOptions.color);
    }
  }

  composeOptions(overrides: PenciltestRendererOptions, persist: boolean | null = null) {
    super.composeOptions(overrides);
    this.applyStrokeStyle();
  }

  moveTo(x: number, y: number) {
    super.moveTo(x, y);
    this.context.moveTo(x, y);
    return this.drawingPath = this.context.beginPath();
  }

  render() {
    super.render();
    if (this.context) {
      this.context.stroke();
      return this.drawingPath = null;
    }
  }

  clear() {
    this.drawingPath = null;
    this.context.clearRect(0, 0, this.width, this.height);
    return super.clear();
  }

  destroy() {
    this.field.remove();
    return super.destroy();
  }

  resize(width: any, height: any) {
    this.field.setAttribute('width', width);
    this.field.setAttribute('height', height);
    return super.resize(width, height);
  }
}
