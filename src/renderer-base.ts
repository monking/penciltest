class BaseRenderer implements PenciltestRenderer {

  options: PenciltestRendererOptions;
  width: number;
  height: number;

  static defaultOptions = {
    container: 'body',
    lineColor: 'black',
    lineWeight: 1,
    lineOpacity: 1,
    lineCorner: 'round',
    width: 1920,
    height: 1080
  };

  static getColorString(color: Color | string): string {
    if (typeof Array.isArray(color)) {
      if (color.length > 3) {
        return `rgba(${color.join(',')})`;
      } else {
        return `rgb(${color.join(',')})`;
      }
    } else {
      return String(color);
    }
  }

  constructor(options: PenciltestRendererOptions) {
    this.options = Utils.inherit(
      ...super.defaultOptions,
      ...options
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

  composeOptions(overrides: PenciltestRendererOptions, persist: boolean | null = null) {
    const composedOptions = {
      ...this.options
    };

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

  rect(x: number, y: number, width: number, height: number, backgroundColor: string, strokeColor: string): void {}

  destroy(): void {}
}
