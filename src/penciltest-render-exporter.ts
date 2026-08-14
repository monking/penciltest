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
    const renderRange: PenciltestRange = this.controller.state.frameSelection
      ? this.controller.state.frameSelection
      : { start: 0, end: this.controller.scene.frames.length - 1 };

    const {
      width: sceneWidth,
      height: sceneHeight,
      aspectRatio: sceneAspectRatio,
    } = this.controller.scene.getDimensions();
    const gifConfigInputDefs: Array<PenciltestUIComponentOptions> = [
      {
        text: `Scene width: ${sceneWidth}, height: ${sceneHeight} (${sceneAspectRatio})`,
      },
      {
        children: PenciltestUIComponent.makeInputLabel({
          key: 'maxDimension',
          'tagName': 'input',
          attr:{
            value: String(Math.min(512, this.controller.scene.height))
          },
        }, {
          text: 'render to size: ',
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
    ];

    const gifConfigPromptOptions: PromptOptions = {
      inputKeys: [
      'maxDimension',
      'start',
      'end',
      ]
    };
    const gifConfig: Dictionary = await Utils.promptForm(`<h3>Render settings</h3>`, gifConfigInputDefs, gifConfigPromptOptions);
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

    // rebuild renderer to ensure correct resolution for capture
    // FIXME: Is this still necessary?
    this.controller.setOptions({renderer: Renderers.CANVAS});
    this.controller.resize();

    const baseFrameDelay = 1000 / this.controller.scene.framerate;

    // prepare encoder
    const gifEncoder = GIFEncoder();
    // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
    gifEncoder.setRepeat(0);
    gifEncoder.setDelay(baseFrameDelay);
    gifEncoder.start();

    const start = Number(gifConfig.start) - 1;
    const end = Math.max(start, Number(gifConfig.end) - 1);
    for (let frameNumber = start; frameNumber <= end; frameNumber++) {
      this.controller.goToFrame(frameNumber);
      gifEncoder.setDelay(baseFrameDelay * this.controller.scene.getFrameHold());
      // FIXME output image data is fully black, no detail.
      gifEncoder.addFrame((this.controller.sceneRenderer as CanvasRenderer).context);
    }

    gifEncoder.finish();
    const gifBinary = gifEncoder.stream().bin;
    const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifBinary).buffer], { type: "image/gif" }));


    // reset to user's configuration
    //this.controller.setOptions({renderer: oldRendererType});
    this.controller.forceDimensions = null;
    this.controller.resize();

    return blobUrl
  }

}

