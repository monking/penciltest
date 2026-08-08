/// <reference path="vendor/GIFEncoder.js">
declare function GIFEncoder():GIFEncoderInterface;

interface GIFEncoderInterface {
  setDelay(ms: number): void;
  setDispose(code: number): void;
  setRepeat(iter: number): void;
  setTransparent(c: number | null): void;
  setComment(c:string): void;
  addFrame(im:CanvasRenderingContext2D | null, ...is_imageData: boolean[]): boolean;
  finish(): void;
  setFrameRate(fps:number): void;
  setQuality(quality:number): void;
  setSize(w:number, h:number): void;
  start(): boolean;
  cont(): boolean;
  stream(): { bin:Array<number> } | null;
  setProperties(has_start:boolean, is_first:boolean): null;
};

class PenciltestRenderExporter {

  controller: Penciltest;

  constructor(controller:Penciltest) {
    this.controller = controller;
  }

  async renderGif(): Promise<string> {
    const renderRange: PenciltestRange = this.controller.state.frameSelection
      ? this.controller.state.frameSelection
      : { start: 0, end: this.controller.scene.frames.length - 1 };

    const gifSize = Math.min(512, this.controller.scene.height);
    const strokeWeight = 1;
    let gifConfigurationString;
    try {
      gifConfigurationString = await Utils.prompt(`Rendering ${renderRange.end - renderRange.start + 1} frames, ${renderRange.start} through ${renderRange.end}.\nWhat dimensions (maximum width/height) and line weight would you like?`, `${gifSize} ${strokeWeight}`);
    } catch(reason) {
      if (reason !== Utils.promptCanceled) {
        console.error(reason);
      }
      return;
    }

    const gifConfiguration = (gifConfigurationString || '512 2').split(' ');
    const maxGifDimension = parseInt(gifConfiguration[0], 10);
    const gifLineWeight = parseInt(gifConfiguration[1], 10);
    const dimensions = this.controller.scene.getDimensions();
    if (dimensions.width > maxGifDimension) {
      dimensions.width = maxGifDimension;
      dimensions.height = maxGifDimension / dimensions.aspect;
    } else if (dimensions.height > maxGifDimension) {
      dimensions.height = maxGifDimension;
      dimensions.width = maxGifDimension * dimensions.aspect;
    }

    this.controller.forceDimensions = dimensions;

    const oldRendererType = this.controller.options.renderer;
    this.controller.setOptions({renderer: Renderers.CANVAS});
    //// rebuild renderer to ensure correct resolution for capture
    //this.controller.ui.appActions.renderer.action();
    this.controller.resize();

    //this.controller.ui.appActions.renderer.action();

    const gifRenderOverrides = {strokeWeight: gifLineWeight};

    const baseFrameDelay = 1000 / this.controller.scene.framerate;

    // prepare encoder
    const gifEncoder = GIFEncoder();
    // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
    gifEncoder.setRepeat(0);
    gifEncoder.setDelay(baseFrameDelay);
    gifEncoder.start();

    ;
    for (let frameNumber = renderRange.start; frameNumber <= renderRange.end; frameNumber++) {
      this.controller.goToFrame(frameNumber, gifRenderOverrides);
      gifEncoder.setDelay(baseFrameDelay * this.controller.scene.getFrameHold()); // FIXME This seems to work once for the whole GIF, and not individually per frame. How to set individual delays for each fram in gifEncoder?
      gifEncoder.addFrame((this.controller.renderer as CanvasRenderer).context);
    }

    gifEncoder.finish();
    const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }));


    // reset to user's configuration
    this.controller.setOptions({renderer: oldRendererType});
    this.controller.forceDimensions = null;
    this.controller.resize();

    return blobUrl
  }

}

