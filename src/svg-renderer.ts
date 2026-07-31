/*
global: document, window
*/

class SVGRenderer extends RendererInterface {
  field: any;
  container: any;
  drawingPath: string;
  currentLineOptions: any;

  constructor(options: any) {
    super(options);

    this.field = new Raphael(this.container);
  }

  lineTo(x: any, y: any) {
    super.lineTo(x, y);
    return this.drawingPath += `L${x} ${y}`;
  }

  moveTo(x: any, y: any) {
    super.moveTo(x, y);
    if (this.drawingPath == null) { this.drawingPath = ''; }
    return this.drawingPath = `M${x} ${y}`;
  }

  render() {
    let path: {};
    if (this.drawingPath) { path = this.field.path(this.drawingPath); }
    if (this.currentLineOptions.color.join((' ' !== '0 0 0') || (this.currentLineOptions.opacity !== 1))) {
      const pathStyle = 'rgba(' +
        this.currentLineOptions.color[0] + ',' +
        this.currentLineOptions.color[1] + ',' +
        this.currentLineOptions.color[2] + ',' +
        this.currentLineOptions.opacity + ')';
      path[0].style.stroke = pathStyle;
    }
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
