class BaseRenderer implements PenciltestRenderer {

  options: PenciltestRendererOptions;
  overrides: PenciltestRendererOptions;
  width: number;
  height: number;
  container: HTMLElement;
  currentLineOptions: PenciltestLineOptions;

  static defaultOptions: PenciltestRendererOptions = {
    container: 'body',
    lineColor: 'black',
    lineWeight: 1,
    lineOpacity: 1,
    lineCorner: 'round',
    width: 1920,
    height: 1080
  };

  getColorString(color: Color | string): string {
    if (Array.isArray(color)) {
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
    this.options = {
      ...BaseRenderer.defaultOptions,
      ...options
    };

    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }

    this.overrides = {}

    this.composeOptions();

    //this.resize(this.options.width, this.options.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  composeOptions(overrides: PenciltestRendererOptions = {}, persist: boolean | null = null): void {
    const composedOptions = {
      ...this.options
    };

    if (persist === true) { Object.assign(this.overrides, overrides); }

    if (persist !== false) { Object.assign(composedOptions, this.overrides); }

    if (persist !== true) { Object.assign(composedOptions, overrides); }

    this.currentLineOptions = {
      lineColor: composedOptions.lineColor,
      lineWeight: composedOptions.lineWeight,
      lineCorner: composedOptions.lineCorner,
      lineOpacity: composedOptions.lineOpacity
    };
  }

  path(stroke: Stroke) {
    // TODO apply stroke options
    stroke.path.forEach((segment, index) => {
      if (index === 0) {
        this.moveTo(segment.x, segment.y);
      } else {
        this.lineTo(segment.x, segment.y);
      }
    });

    return this.render();
  }

  moveTo(x: number, y: number): void {}

  moveToPoint(point:Point): void {
    this.moveTo(point.x, point.y);
  }

  lineTo(x: number, y: number): void {}

  lineToPoint(point:Point): void {
    this.lineTo(point.x, point.y);
  }

  rect(x: number, y: number, width: number, height: number, backgroundColor: string, strokeColor: string = ''): void {}

  rectBounds(bounds:Bounds, backgroundColor: string, strokeColor: string = ''): void {
    this.rect(bounds.x, bounds.y, bounds.width, bounds.height, backgroundColor, strokeColor);
  }

  render(): void {}

  clear(): void {}

  destroy(): void {}

  arc(config:Arc): void {
  }

  circle(center:Point, radius:number): void {
    
  }
}
