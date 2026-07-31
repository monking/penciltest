class SVGRenderer extends BaseRenderer {
  field: any;
  container: HTMLElement;
  drawingPath: string;
  currentLineOptions: PenciltestLineOptions;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = new Raphael(this.container);
  }

  lineTo(x: number, y: number) {
    super.lineTo(x, y);
    return this.drawingPath += `L${x} ${y}`;
  }

  moveTo(x: number, y: number) {
    super.moveTo(x, y);
    if (this.drawingPath == null) { this.drawingPath = ''; }
    return this.drawingPath = `M${x} ${y}`;
  }

  render() {
    let path: {};
    if (this.drawingPath) { path = this.field.path(this.drawingPath); }
    path[0].style.stroke = BaseRenderer.getColorString(this.currentLineOptions.color);
    return super.render();
  }

  clear() {
    this.field.clear();
    return super.clear();
  }

  destroy() {
    this.field.remove();
    return super.destroy();
  }
}
