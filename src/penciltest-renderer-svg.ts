/// <reference path="vendor/raphael.js">
declare function Raphael(first:HTMLElement | Function | null): void;

interface RaphaelInterface {
  version: string;
  eve(name:string, scope:any, ...varargs:any): Array<any>;
  // eve._events: Array<any>
  // eve.listeners(name:string): Array<Function>
  // eve.on(name:string, f:Function): (z:number) => any
  // eve.f(event:string, ...args:any): Function
  // eve.stop(): void
  // eve.nt(subname:string): string | boolean
  _ISURL: RegExp;
  _availableAttrs: any;
  _availableAnimAttrs: any;
  _radial_gradient: RegExp;
  _rectPath(x, y, w, h, r): Array<Array<any>>
  _getPath: any;
  clear(): void;
  remove(): void;
  path(pathString:string): HTMLElement
};

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
        stroke: Utils.getColorString(this.options.strokeColor)
      });
    }
    return super.render();
  }

  clear(redrawBackground:boolean = false) {
    this.field.clear();
    return super.clear(redrawBackground);
  }

  destroy() {
    this.field.remove();
    return super.destroy();
  }
}
