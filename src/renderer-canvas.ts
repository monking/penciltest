class CanvasRenderer extends BaseRenderer {
  field: HTMLElement;
  context: CanvasRenderingContext2D;
  //container: HTMLElement;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = document.createElement('canvas');
    this.context = (this.field as HTMLCanvasElement).getContext('2d',
      {alpha: false});

    this.resize(this.options.width, this.options.height);

    this.container.appendChild(this.field);

    this.applyStrokeStyle();
  }

  lineTo(x: number, y: number) {
    super.lineTo(x, y);
    return this.context.lineTo(x, y);
  }

  rect(x: number, y: number, width: number, height: number, backgroundColor: string, strokeColor: string = '') {
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

  composeOptions(overrides: PenciltestRendererOptions = {}, persist: boolean | null = null): void {
    super.composeOptions(overrides);
    this.applyStrokeStyle();
  }

  moveTo(x: number, y: number):void {
    super.moveTo(x, y);
    this.context.moveTo(x, y);
    this.context.beginPath();
  }

  render():void {
    super.render();
    if (this.context) {
      this.context.stroke();
    }
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
    return super.clear();
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
