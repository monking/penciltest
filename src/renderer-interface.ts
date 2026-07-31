/*
global: document
*/

interface PenciltestRendererOptions {
  container: string | HTMLElement;
  lineColor: string;
  lineWeight: number;
  lineOpacity: number;
  lineCorner: string;
  width: number;
  height: number;
}

interface PenciltestRenderer {
  options: PenciltestRendererOptions;
  container: any;
  width: any;
  height: any;
  currentLineOptions: { color: any; weight: any; corner: any; opacity: any; };
}

class RendererInterface implements PenciltestRenderer {
  options: { container: string; lineColor: string; lineWeight: number; lineOpacity: number; lineCorner: string; width: number; height: number; };
  container: any;
  width: any;
  height: any;
  currentLineOptions: { color: any; weight: any; corner: any; opacity: any; };
  static initClass() {
  
    this.prototype.options = {
      container: 'body',
      lineColor: 'black',
      lineWeight: 1,
      lineOpacity: 1,
      lineCorner: 'round',
      width: 1920,
      height: 1080
    };
  }

  constructor(options: any) {
    this.options = Utils.inherit(
      options,
      this.options
    );

    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }

    this.composeOptions();

    this.resize(this.options.width, this.options.height);
  }

  resize(width: any, height: any) {
    this.width = width;
    return this.height = height;
  }

  moveTo(x: any, y: any) {
    return null;
  }

  lineTo(x: any, y: any) {
    return null;
  }

  rect(x: any, y: any, width: any, height: any, backgroundColor: any, strokeColor: any) {
    return null;
  }

  composeOptions(overrides: undefined, persist = null) {
    const composedOptions = Object.assign({}, this.options);

    if (persist === true) { Object.assign(this.overrides, overrides); }

    if (persist !== false) { Object.assign(composedOptions, this.overrides); }

    if (persist !== true) { Object.assign(composedOptions, overrides); }

    return this.currentLineOptions = {
      color: composedOptions.lineColor,
      weight: composedOptions.lineWeight,
      corner: composedOptions.lineCorner,
      opacity: composedOptions.lineOpacity
    };
  }
    overrides(overrides: any, overrides: undefined) {
        throw new Error("Method not implemented.");
    }

  path(path: { length?: any; }) {
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (i === 0) {
        this.moveTo(segment[0], segment[1]);
      } else {
        this.lineTo(segment[0], segment[1]);
      }
    }

    return this.render();
  }

  render() {
    return null;
  }

  clear() {
    return null;
  }

  destroy() {
    return null;
  }
}
RendererInterface.initClass();
