/// <reference path="vendor/raphael.js">
declare function Raphael(first:HTMLElement | Function | null):void;

class SVGRenderer extends BaseRenderer {
  field: RaphaelInterface;
  //container: HTMLElement;
  drawingPath: string;
  //currentLineOptions: PenciltestLineOptions;

  constructor(options: PenciltestRendererOptions) {
    super(options);

    this.field = new Raphael(this.container) as RaphaelInterface;
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
    let path: HTMLElement;
    if (this.drawingPath) {
      path = this.field.path(this.drawingPath);
      Object.assign(path.style, {
        stroke: this.getColorString(this.currentLineOptions.lineColor)
      });
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
