var LZWEncoder: Function;
var NeuQuant: Function;
var GIFEncoder: Function; //GIFEncoderInterface;
/// <reference path="vendor/jsgif/LZWEncoder.js">
/// <reference path="vendor/jsgif/NeuQuant.js">
/// <reference path="vendor/jsgif/GIFEncoder.js">

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

  async renderGif(): Promise<string | null> {
    //debugger;
    const renderRange: PenciltestRange = this.controller.state.frameSelection
      ? this.controller.state.frameSelection
      : { start: 0, end: this.controller.scene.frames.length - 1 };

    const gifConfigInputDefs: Array<PenciltestUIComponentOptions> = [].concat(
      {
        children: PenciltestUIComponent.makeInputLabel({
          key: 'maxDimension',
          'tagName': 'input',
          attr:{
            value: String(this.controller.scene.height)
          },
        }, {
          text: 'largest dimension: ',
        })
      },
      {
        children: PenciltestUIComponent.makeInputLabel({
          key: 'start',
          'tagName': 'input',
          attr:{
            id: 'start',
            type: 'range',
            min: '1',
            max: String(this.controller.scene.frames.length),
            value: String(renderRange.start + 1),
          },
        }, {
          prefix: 'start frame: ',
          live: true,
        })
      },
      {
        children: PenciltestUIComponent.makeInputLabel({
          key: 'end',
          'tagName': 'input',
          attr:{
            id: 'end',
            type: 'range',
            min: '1',
            max: String(this.controller.scene.frames.length),
            value: String(renderRange.end + 1),
          },
        }, {
          prefix: 'end frame: ',
          live: true,
        })
      },
    );

    const gifConfigPromptOptions: PromptOptions = {
      inputKeys: [
      'maxDimension',
      'start',
      'end',
      ]
    };
    const gifConfig: Dictionary = await Utils.promptForm(`Render settings`, gifConfigInputDefs, gifConfigPromptOptions);
    console.log({gifConfig}); // XXX
    if (!gifConfig) {
      return null;
    }

    const maxGifDimension = parseInt(gifConfig.maxDimension, 10);
    const dimensions = this.controller.scene.getDimensions();
    if (dimensions.width > maxGifDimension) {
      dimensions.width = maxGifDimension;
      dimensions.height = maxGifDimension / dimensions.aspect;
    } else if (dimensions.height > maxGifDimension) {
      dimensions.height = maxGifDimension;
      dimensions.width = maxGifDimension * dimensions.aspect;
    }

    this.controller.forceDimensions = dimensions;

    // LATER: Switch to CANVAS renderer if not already using it.
    // LATER: Don't reinitialize the renderer if already CANVAS.
    // MEANWHILE: SVG rendering is disabled, and CANVAS is the only choice.

    //// rebuild renderer to ensure correct resolution for capture
    //this.controller.ui.appActions.renderer.action();
    this.controller.resize();

    //this.controller.ui.appActions.renderer.action();

    const baseFrameDelay = 1000 / this.controller.scene.framerate;

    // prepare encoder
    const gifEncoder = GIFEncoder();
    // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
    gifEncoder.setRepeat(0);
    gifEncoder.setDelay(baseFrameDelay);
    gifEncoder.start();

    const start = Number(gifConfig.start) - 1;
    const end = Number(gifConfig.end) - 1;
    for (let frameNumber = start; frameNumber <= end; frameNumber++) {
      debugger;
      this.controller.goToFrame(frameNumber);
      gifEncoder.setDelay(baseFrameDelay * this.controller.scene.getFrameHold()); // FIXME This seems to work once for the whole GIF, and not individually per frame. How to set individual delays for each fram in gifEncoder?
      gifEncoder.addFrame((this.controller.sceneRenderer as CanvasRenderer).context);
    }

    gifEncoder.finish();
    const gifBinary = gifEncoder.stream().bin;
    debugger;
    const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifBinary).buffer], { type: "image/gif" }));


    // reset to user's configuration
    //this.controller.setOptions({renderer: oldRendererType});
    this.controller.forceDimensions = null;
    this.controller.resize();

    return blobUrl
  }

}

