declare function GIFEncoder():GIFEncoderInterface;

class SceneState implements PenciltestSceneState {
  constructor(overrides: PenciltestSceneState = {}) {
    Object.assign(this, {
      frames: [],
      //exposures: [], // DELME exposures not used @1785520725
      exposureCount: 0,
      exposureNumber: 0,
      frameNumber: 0,
      ...overrides
    });
  }
}

class Penciltest {

  static version = '0.3.0';
  static instrumentIdentifier = 'io.lovejoy.penciltest';

  static defaultOptions: PenciltestOptions = {
    background: 'gray',
    container: 'body',
    hideCursor: false,
    onionSkin: true,
    onionSkinFrameRadius: 4,
    onionSkinOpacity: 0.5,
    renderer: Renderers.CANVAS,
    scrubAudio: false,
    showStatus: true,
    smoothing: 1,
  };

  static defaultPlayback: PlaybackState = {
    heldExposures: 0,
    direction: 1,
    muteAudio: false,
    stepId: -1,
    scrubAudioId: -1,
  };

  static defaultState: PenciltestState = {
    version: Penciltest.version,
    mode: PenciltestModes.DRAWING,
    toolStack: [PenciltestTools.PENCIL,PenciltestTools.ERASER],
    previousMode: null
  };

  // components
  renderer: CanvasRenderer | SVGRenderer;
  scene: PenciltestScene | null;
  ui: PenciltestUI;

  // global config/state
  forceDimensions: Bounds | null;
  hasUnsavedChanges: boolean;
  height: number;
  options: PenciltestOptions;
  playback: PlaybackState;
  state: PenciltestState;
  width: number;
  zoomFactor: number;

  // elements
  audioElement: HTMLMediaElement;
  container: HTMLElement;
  fieldContainer: HTMLElement;
  fieldElement: HTMLElement;

  // operation buffers
  copyBuffer: Array<PenciltestFrame>;
  currentStrokeIndex: number;
  markBuffer: Array<Point>;
  markPoint: Point;
  redoQueue: Array<Stroke>;
  workingOn: Array<Promise<any>>;


  constructor(options: PenciltestOptions) {
    this.options = {
      ...PenciltestScene.defaultOptions,
      ...Penciltest.defaultOptions,
      ...this.getStoredData('app', 'options') as PenciltestOptions,
    };
  
    this.state = {
      ...Penciltest.defaultState,
      ...this.getStoredData('app', 'state') as PenciltestState,
    };
    this.currentStrokeIndex = -1;
  
    this.workingOn = [];

    this.playback = { ...Penciltest.defaultPlayback };

    this.container = globalThis.document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';

    this.buildContainer();

    this.ui = new PenciltestUI( { controller: this, parent: this.container } );

    this.newScene();

    this.setOptions(this.options); // do all the option actions

    if (this.state.version !== Penciltest.version) {
      (async () => {
        // User is not prompted about migration on launch, only on loading a scene.
        // The app won't work without compatible state data.
        this.state.version = await PenciltestVersions.migrate(this, this.state.version, Penciltest.version);
      })();
    }

    this.resize();
  };

  setOptions(newOptions: PenciltestOptions) {
    Object.assign(this.options, newOptions);
    for (let key in newOptions) {
      if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
        this.ui.handleAppReaction(key);
      }
    }
    //this.ui.updateStatus();
  }


  resetOptionsAndState() {
    this.state = { ...Penciltest.defaultState };
    this.setOptions(Penciltest.defaultOptions);
    this.currentStrokeIndex = -1;
    this.resize();
  }

  setPlayback(newPlayback: PlaybackState) {
    Object.assign(this.playback, newPlayback);
    for (let key in newPlayback) {
      if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
        this.ui.handleAppReaction(key);
      }
    }
    //this.ui.updateStatus();
  }

  buildContainer() {
    const markup = '<div class="field-container">' +
      '<div class="field"></div>' +
    '</div>';

    this.container.innerHTML = markup;

    this.fieldContainer = this.container.querySelector('.field-container');
    return this.fieldElement = this.container.querySelector('.field');
  }

  setMode(mode:PenciltestModes): boolean {
    if (mode !== this.state.mode) {
      this.state.previousMode = this.state.mode;
      this.state.mode = mode;
      this.ui.updateStatus();
      return true;
    }
    return false;
  }

  resetMode(): boolean {
    return this.setMode(this.state.previousMode || PenciltestModes.DRAWING);
  }

  newFrame(insertAtIndex = null, count:number = 1, options:PenciltestFrame = {}): Array<PenciltestFrame> {
    // this.lift(); // FIXME This should be called elsewhere, or not at all, right? @1785601871

    if (insertAtIndex === null) {
      insertAtIndex = this.scene.frames.length;
    }

    //this.scene.frames.splice(insertAtIndex, 0, frame);
    const spliceParams = [insertAtIndex, 0]

    let i:number;
    const newFrames = []
    for (i = 0; i < count; i++) {
      newFrames.push({
        hold: this.options.frameHold,
        strokes: [],
        ...options
      } as PenciltestFrame);
    }
    Array.prototype.splice.apply(this.scene.frames, spliceParams.concat(newFrames));

    this.scene.updateState();

    return newFrames;
  }

  getCurrentFrame() {
    return this.scene.frames[this.scene.current.frameNumber || 0];
  }

  getCurrentStroke() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex > -1 ? this.currentStrokeIndex : 0];
  }

  mark(point: Point) {
    if (this.currentStrokeIndex < 0) {
      let frame = this.getCurrentFrame();
      if (!frame.strokes) { frame.strokes = []; }
      this.currentStrokeIndex = frame.strokes.length;
      const stroke = {path: []} as Stroke;
      frame.strokes.push(stroke);
      this.renderer.moveTo(point.x, point.y);
    } else {
      this.renderer.lineTo(point.x, point.y);
    }

    const stroke = this.getCurrentStroke();
    if (!stroke) { return; } // FIXME This shouldn't happen, right?
    stroke.path.push(Utils.scalePoint(point, 1 / this.zoomFactor));
    if (this.state.mode === PenciltestModes.DRAWING) {
      this.renderer.render();
    }

    this.clearRedo();
    return this.hasUnsavedChanges = true;
  }

  track(x: number,y: number) {
    const trackPoint = {x,y};
    if (this.state.toolStack[0] === PenciltestTools.ERASER) {
      const screenPoint = Utils.scalePoint(trackPoint, 1 / this.zoomFactor);
      let done = false;
      const currentFrame = this.getCurrentFrame();
      const screenEraseRadius = 10;
      this.drawCurrentFrame();
      for (let strokeIndex = 0; strokeIndex < currentFrame.strokes.length; strokeIndex++) {
        const stroke = currentFrame.strokes[strokeIndex];
        for (let segment of stroke.path) {
          const realEraseRadius = screenEraseRadius / this.zoomFactor;
          if ((Math.abs(screenPoint.x - segment.x) < realEraseRadius) && (Math.abs(screenPoint.y - segment.y) < realEraseRadius)) {
            currentFrame.strokes.splice(strokeIndex, 1);
            this.drawCurrentFrame();
            done = true;
          }
          if (done) { break; }
        }
        if (done) { break; }
      }
      return this.renderer.rect(screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red');
    } else if (this.options.smoothing > 0) {
      if ((this.currentStrokeIndex < 0)) {
        this.markPoint = trackPoint;
        this.markBuffer = [];
      }

      this.markBuffer.push(trackPoint);

      // TODO  Mark multiple points per @options.smoothing
      this.markPoint.x = ((this.markPoint.x * this.options.smoothing) + x) / (this.options.smoothing + 1);
      this.markPoint.y = ((this.markPoint.y * this.options.smoothing) + y) / (this.options.smoothing + 1);

      // TODO  Use previous mark for velocity, to interpolate `smoothing`×
      if (this.markBuffer.length > this.state.smoothDrawInterval) {
        this.markBuffer = [];
      }

      return this.mark(this.markPoint);
    } else {
      return this.mark(trackPoint);
    }
  }

  resolveFrameNumber(inputIndex: number) {
    let realIndex = inputIndex;
    if (this.options.loop) {
      while ((realIndex < 0) || (realIndex >= this.scene.frames.length)) { realIndex = (realIndex + this.scene.frames.length) % this.scene.frames.length; }
    } else {
      realIndex = Math.max(0, Math.min(this.scene.frames.length - 1, realIndex));
    }
    return realIndex;
  }

  goToFrame(targetFrameNumber: number, overrides: PenciltestRendererOptions = {}) {
    const selectedFrameNumber = this.resolveFrameNumber(targetFrameNumber);

    this.scene.current.frameNumber = selectedFrameNumber;

    if (this.state.mode !== PenciltestModes.PLAYING) {
      this.lift();
      this.seekAudioToFrame(selectedFrameNumber);
    }
    this.ui.updateStatus(); // FIXME: Probably too slow, rewriting all status DOM elemets, on each frame of play.
    return this.drawCurrentFrame(overrides);
  }

  seekAudioToFrame(frameNumber: number, exposureOffset:number = 0) {
    if (this.scene.audio) {
      const seekTime = (this.scene.current.frames[frameNumber].time + exposureOffset * this.scene.current.singleFrameDuration - this.scene.audio.offset) / 1000;
      return this.seekAudio(seekTime);
    }
  }

  play() {
    if (this.playback.direction == null) { this.playback.direction = 1; }
    if (this.scene.current.frameNumber < this.scene.frames.length) { // i.e. it is a frame in the scene (in case this.scene.current.frameNumber was
      this.playback.heldExposures = 0;
      this.goToFrame(this.scene.current.frameNumber); // reset the audio position to the _beginning_ of the current frame
    } else {
      this.playback.heldExposures = -1;
      this.goToFrame(0);
    }

    const stepListener = (firstStep: boolean) => {
      this.playback.heldExposures++;
      const frameHold = this.scene.getFrameHold();
      let newIndex = this.scene.current.frameNumber + this.playback.direction;
      if ((this.playback.heldExposures >= frameHold) || ( firstStep && (newIndex === this.scene.frames.length) )) {
        this.playback.heldExposures = 0;
        if ((newIndex >= this.scene.frames.length) || (newIndex < 0)) {
          if (this.options.loop || firstStep) {
            newIndex = (newIndex + this.scene.frames.length) % this.scene.frames.length;
            this.goToFrame(newIndex);
            return this.seekAudioToFrame(newIndex);
          } else {
            this.stop();
            this.ui.updateStatus();
          }
        } else {
          return this.goToFrame(newIndex);
        }
      }
    };

    this.stop();
    stepListener(true);
    this.playback.stepId = setInterval(stepListener, 1000 / this.scene.framerate);
    this.lift();
    this.setMode(PenciltestModes.PLAYING);
    return this.playAudio();
  }

  stop() {
    if (this.audioElement) { this.pauseAudio(); }
    clearInterval(this.playback.stepId);
    if (this.state.mode === PenciltestModes.PLAYING) {
      this.resetMode();
    }
  }

  togglePlay() {
    if (this.state.mode !== PenciltestModes.WORKING) {
      if (this.state.mode === PenciltestModes.PLAYING) {
        return this.stop();
      } else {
        return this.play();
      }
    }
  }

  drawCurrentFrame(overrides: PenciltestRendererOptions = {}) {
    // NOTE: This draws the background, while drawFrame() does not.
    if (!this.renderer || !this.scene.frames.length) { return; }

    this.renderer.clear();

    if (this.scene.background) {
      this.renderer.rect(0, 0, this.width, this.height, this.scene.background);
    }

    if (this.options.onionSkin) {
      for (let i = 1, end = this.options.onionSkinFrameRadius, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const previousFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber - i);
        const lineOpacity = Math.pow(this.options.onionSkinOpacity, i)
        if (previousFrameNumber !== this.scene.current.frameNumber) {
          this.drawFrame(
            previousFrameNumber,
            Object.assign(
              {},
              overrides,
              {
                lineColor: [255, 0, 0, lineOpacity]
              }
            )
          );
        }
        const nextFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber + i);
        if (nextFrameNumber !== this.scene.current.frameNumber) {
          this.drawFrame(
            nextFrameNumber,
            Object.assign(
              {},
              overrides,
              {
                lineColor: [0, 255, 255, lineOpacity]
              }
            )
          );
        }
      }
    }
    this.renderer.composeOptions();
    this.drawFrame(this.scene.current.frameNumber, overrides);
  }

  drawFrame(frameNumber: number, overrides: PenciltestRendererOptions): PenciltestFrame {
    if (!this.width || !this.height) { return; }

    if (overrides) { this.renderer.composeOptions(overrides); }

    const frame = this.scene.frames[frameNumber]
    if (frame?.strokes?.length > 0) {
      frame.strokes.map((stroke: Stroke) =>
        this.renderer.path(this.scaleStroke(stroke, this.zoomFactor)));
    }
    return frame;
  }

  scaleStroke(stroke: Stroke, factor: number): Stroke {
    return {
      ...stroke,
      // TODO: scale stroke weight, too?
      path: stroke.path.map((point: Point) => Utils.scalePoint(point, factor))
    };
  }

  useTool(toolName: PenciltestTools) {
    const index = this.state.toolStack.indexOf(toolName);
    if (index > -1) {
      this.state.toolStack.splice(index, 1);
    }
    this.state.toolStack.unshift(toolName);
    if (toolName === PenciltestTools.ERASER) {
      if (this.state.mode === PenciltestModes.DRAWING) {
        this.setMode(PenciltestModes.ERASING);
      }
    } else if (PenciltestModes.ERASING) {
      this.setMode(PenciltestModes.DRAWING);
    }
    this.ui.updateStatus();
  }

  cancelStroke() {
    this.markBuffer = [];
    return this.currentStrokeIndex = -1;
  }

  lift() {
    if (this.markBuffer && this.markBuffer.length) {
      const last = this.markBuffer.pop();
      this.mark(last);
      this.markBuffer = [];
    }
    this.currentStrokeIndex = -1;
    if (this.state.toolStack[0] === PenciltestTools.ERASER) {
      return this.drawCurrentFrame();
    }
  }

  getSelectedFrames(frames: Array<PenciltestFrame> = [], cut:boolean = false): [ Array<PenciltestFrame>, number ] {
    if (frames.length > 0) {
      return [ frames, -1 ];
    } else {
      const [ selection, index ] = Utils.getRange(this.state.frameSelection, this.scene.frames, cut);
      if (cut) { this.scene.updateState(); }
      if (selection.length > 0) {
        return [ selection, index ];
      } else if (cut) {
        return [ this.scene.frames.splice(this.scene.current.frameNumber, 1), this.scene.current.frameNumber ];
      } else {
        return [ [this.getCurrentFrame()], this.scene.current.frameNumber];
      }
    }
  }

  copyFrames(): [ Array<PenciltestFrame>, number ] {
    const [ frames, start ] = this.getSelectedFrames();
    this.copyBuffer = Utils.clone(frames);
    return [ this.copyBuffer, start ];
  }

  pasteFrames() {
    if (this.copyBuffer) {
      const newFrameNumber = this.scene.current.frameNumber + 1;
      this.insertFrames(Utils.clone(this.copyBuffer), newFrameNumber);
      this.goToFrame(newFrameNumber);
    }
  }

  insertFrames(frames:Array<PenciltestFrame>, position:number) {
    Array.prototype.splice.apply(this.scene.frames, [position, 0].concat(frames as Array<any>));
    this.scene.updateState();
    this.ui.updateStatus();
  }

  splitFrame(frameNumber:number, splitOffset:number) {
    const frame = this.scene?.frames[frameNumber];
    const oldHold = this.scene.getFrameHold();
    frame.hold = splitOffset;
    const newFrame = Utils.clone(frame);
    newFrame.hold = oldHold - splitOffset;
    this.insertFrames([newFrame], frameNumber + 1);
  }

  pasteStrokes() {
    if (this.copyBuffer?.length > 0) {
      this.scene.frames[this.scene.current.frameNumber].strokes = this.scene.frames[this.scene.current.frameNumber].strokes.concat(Utils.clone(this.copyBuffer[0].strokes));
      return this.drawCurrentFrame();
    }
  }

  clearStrokes() {
    this.scene.frames[this.scene.current.frameNumber].strokes = [];
    return this.drawCurrentFrame();
  }

  cutFrames(): [ Array<PenciltestFrame>, number ] {
    const [ droppedFrames, start ] = this.dropFrames();
    this.copyBuffer = droppedFrames;
    return [ droppedFrames, start ];
  }

  dropFrames(): [ Array<PenciltestFrame>, number ] {
    const [ droppedFrames, start ] = this.getSelectedFrames([], true);
    if (this.scene.frames.length === 0) {
      this.newFrame();
    }
    if (this.scene.current.frameNumber >= start) {
      if (this.scene.current.frameNumber - start <= droppedFrames.length) {
        this.scene.current.frameNumber = Math.min(start, this.scene.frames.length - 1);
      } else {
        this.scene.current.frameNumber -= droppedFrames.length;
      }
    }

    this.drawCurrentFrame();

    this.ui.updateStatus();

    return [ droppedFrames, start ];
  }

  async smoothFrame(index: number, amount: number = 1) {
    const smooth = (amount: number) => {
      const smoothingBackup = this.options.smoothing;
      this.options.smoothing = amount;
      const frame = this.scene.frames[index];
      const oldStrokes = Utils.clone(frame.strokes) as Array<Stroke>;
      this.lift();
      frame.strokes = [];
      this.scene.current.frameNumber = index;
      this.renderer.clear();

      const result = [];
      for (let stroke of oldStrokes) {
        for (let segment of stroke.path) {
          this.track.apply(this, [segment.x, segment.y]);
        }
        result.push(this.lift());
      }

      this.options.smoothing = smoothingBackup;

      return result;
    };

    if (!amount) {
      amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
    }
    return smooth(amount);
  }

  async smoothScene(amount: number = 1) {
    if (this.state.mode === PenciltestModes.WORKING) {
      if (await Utils.confirm('Would you like to smooth every frame of this scene?')) {
        if (amount < 1) {
          amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
        }
        this.setMode(PenciltestModes.WORKING);
        this.queueWork(() => {
          this.scene.frames.forEach((frame, i) => this.smoothFrame(i, amount))
          this.resetMode();
        });
      }
    } else {
      console.log('Unable to alter scene while playing');
    }
  }

  undo() {
    if (this.getCurrentFrame().strokes && this.getCurrentFrame().strokes.length) {
      this.redoQueue.push(this.getCurrentFrame().strokes.pop());
      this.hasUnsavedChanges = true;
      return this.drawCurrentFrame();
    }
  }

  redo() {
    if (this.redoQueue && this.redoQueue.length) {
      this.getCurrentFrame().strokes.push(this.redoQueue.pop());
      this.hasUnsavedChanges = true;
      return this.drawCurrentFrame();
    }
  }

  clearRedo() {
    return this.redoQueue = [];
  }

  setCurrentFrameHold(newHold: number) {
    this.scene.setFrameHold(Math.max(1, newHold));
    this.scene.updateState();
    return this.ui.updateStatus();
  }

  newScene() {
    this.scene = new PenciltestScene(this.options);

    this.hasUnsavedChanges = false;

    this.newFrame();
    return this.goToFrame(0);
  }

  getSceneNames() {
    const sceneNamePattern = /^scene:/;
    const sceneNames = [];
    for (let storageName in globalThis.localStorage) {
      const reference = this.decodeStorageReference(storageName);
      if (reference && (reference.namespace === 'scene')) {
        sceneNames.push(reference.name);
      }
    }
    return sceneNames;
  }

  encodeStorageReference(namespace: string, name: any):string {
    return `${namespace}:${name}`;
  }

  decodeStorageReference(encoded: string) {
    let match: {};
    if ((match = encoded.match(/^(app|scene):(.*)/))) {
      return {
        namespace: match[1],
        name: match[2]
      };
    } else {
      return false;
    }
  }

  getStoredData(namespace: string, name: string): any {
    const storageName = this.encodeStorageReference(namespace, name);
    try {
      return JSON.parse(globalThis.localStorage.getItem(storageName));
    } catch(e) {
      console.error(e);
      this.ui.showFeedback(`Failed to parse stored data at name '${storageName}'.`);
      return null;
    }
  }

  putStoredData(namespace: string, name: string | boolean, data: any): boolean {
    const storageName = this.encodeStorageReference(namespace, name);
    try {
      globalThis.localStorage.setItem(storageName, JSON.stringify(data));
      return true;
    } catch(e) {
      console.error(e);
      this.ui.showFeedback(`Failed to store local data at name '${storageName}': ${e.message}.`);
      return false;
    }
  }

  async saveScene(update: boolean = true): Promise<boolean> {
    const sceneName = this.scene.name || 'Untitled';
    const scenePack = await PenciltestVersions.packScene(this.scene);
    if (scenePack && this.putStoredData('scene', sceneName, scenePack)) {
      this.hasUnsavedChanges = false;
      return true;
    }
    return false;
  }

  async renderGif() {
    const self = this;

    const gifSize = Math.min(512, this.scene.height);
    const lineWeight = 1;
    const gifConfigurationString = await Utils.prompt('GIF size & line weight (px)', gifSize+' '+lineWeight);

    let asc: boolean, end: number;
    const gifConfiguration = (gifConfigurationString || '512 2').split(' ');
    // configure for rendering
    // dimensions = [64, 64]
    const dimensions = this.scene.getDimensions();
    // while rendering is only useful at one size, save the step # dimensions = ().split 'x'
    const maxGifDimension = parseInt(gifConfiguration[0], 10);
    const gifLineWeight = parseInt(gifConfiguration[1], 10);
    if (dimensions.width > maxGifDimension) {
      dimensions.width = maxGifDimension;
      dimensions.height = maxGifDimension / dimensions.aspect;
    } else if (dimensions.height > maxGifDimension) {
      dimensions.height = maxGifDimension;
      dimensions.width = maxGifDimension * dimensions.aspect;
    }

    this.forceDimensions = {
      width: dimensions.width,
      height: dimensions.height
    };
    // rebuild renderer to ensure correct resolution for capture
    this.ui.appActions.renderer.action();
    this.resize();

    const oldRendererType = this.options.renderer;
    this.setOptions({renderer: Renderers.CANVAS});
    this.ui.appActions.renderer.action();

    const gifRenderOverrides = {lineWeight: gifLineWeight};

    const baseFrameDelay = 1000 / this.scene.framerate;
    let frameNumber = 0;

    // prepare encoder
    const gifEncoder = GIFEncoder();
    // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
    gifEncoder.setRepeat(0);
    gifEncoder.setDelay(baseFrameDelay);
    gifEncoder.start();

    for (frameNumber = 0, end = this.scene.frames.length, asc = 0 <= end; asc ? frameNumber < end : frameNumber > end; asc ? frameNumber++ : frameNumber--) {
      this.goToFrame(frameNumber, gifRenderOverrides);
      gifEncoder.setDelay(baseFrameDelay * this.scene.getFrameHold()); // FIXME This seems to work once for the whole GIF, and not individually per frame. How to set individual delays for each fram in gifEncoder?
      gifEncoder.addFrame((this.renderer as CanvasRenderer).context);
    }

    gifEncoder.finish();
    const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }));

    const gifElementId = 'rendered_gif';
    let gifElement:HTMLImageElement = globalThis.document.getElementById(gifElementId) as HTMLImageElement;
    const gifLinkId = 'rendered_gif_link';
    let gifLink:HTMLAnchorElement = globalThis.document.getElementById(gifLinkId) as HTMLAnchorElement;
    if (!gifElement) {
      gifElement = globalThis.document.createElement('img');
      gifElement.id = gifElementId;
      const gifCss = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translateX(-50%) translateY(-50%)',
        maxWidth: '80%',
        maxHeight: '80%'
      };
      Object.assign(gifElement.style, gifCss);
      const gifContainer = globalThis.document.createElement('div');
      let containerCss:any = {
        position: 'absolute',
        top: '0px',
        left: '0px',
        bottom: '0px',
        right: '0px',
        backgroundColor: 'rgba(0,0,0,0.5)'
      };
      Object.assign(gifContainer.style, containerCss);
      const gifInstructions = globalThis.document.createElement('div');
      containerCss = {
        position: 'relative',
        color: 'white',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
      };
      Object.assign(gifInstructions.style, containerCss);
      gifLink = globalThis.document.createElement('a');
      gifInstructions.innerHTML = "Click/touch image to download.<br>Click/touch outside GIF to close.";
      gifLink.appendChild(gifElement);
      gifContainer.appendChild(gifLink);
      gifContainer.appendChild(gifInstructions);
      globalThis.document.body.appendChild(gifContainer);

      const gifCloseHandler = function(event: PointerEvent | TouchEvent | KeyboardEvent) {
        if ((event.target !== gifElement) || ( event.type === 'keydown' && ((event as KeyboardEvent).key === 'escape') )) {
          gifContainer.removeEventListener('click', gifCloseHandler);
          gifContainer.removeEventListener('touchend', gifCloseHandler);
          globalThis.document.body.removeEventListener('keydown', gifCloseHandler);
          return gifContainer.remove();
        }
      };

      gifContainer.addEventListener('click', gifCloseHandler);
      gifContainer.addEventListener('touchend', gifCloseHandler);
      globalThis.document.body.addEventListener('keydown', gifCloseHandler);
    }

    gifElement.setAttribute('src', blobUrl);
    gifLink.setAttribute('href', blobUrl);
    gifLink.setAttribute('download', `${this.scene.name || 'untitled'}.penciltest.gif`);

    // TODO 1) render each frame small in canvas
    // TODO 2) append with the corect duration to a GIF in memory
    // TODO 3) draw the GIF as a `data:` URL, prompting to right-click and save'

    // reset to user's configuration
    this.setOptions({renderer: oldRendererType});
    this.forceDimensions = null;
    return this.resize();
  }

  async setScene(scene: PenciltestSceneData, shouldUnpack:boolean = false): Promise<PenciltestScene> {
    if (shouldUnpack) {
      this.scene = await PenciltestVersions.unpackScene(scene);
    } else {
      this.scene = new PenciltestScene(scene);
    }

    if (this.scene.instrument?.version && PenciltestVersions.compareVersions(this.scene.instrument.version, Penciltest.version) === -1) {
      this.scene.instrument.version = await PenciltestVersions.migrate(this, this.scene.instrument.version, Penciltest.version);
    }

    if (this.scene.audio?.url) {
      this.loadAudio(this.scene.audio.url, this.scene.audio.info);
    } else {
      this.destroyAudio();
    }
    if (this.renderer) {
      if (this.scene.background) { this.renderer.options.background = this.scene.background; }
      if (this.scene.lineColor) { this.renderer.options.lineColor = this.scene.lineColor; }
      if (this.scene.lineWeight) { this.renderer.options.lineWeight = this.scene.lineWeight; }
    }
    this.scene.updateState();
    this.goToFrame(this.scene.current.frameNumber || 0);
    this.hasUnsavedChanges = false;
    this.resize();
    return this.scene;
  }

  async loadScene(sceneName:string): Promise<PenciltestScene | boolean> {
    const storedScene:PenciltestSceneData | null = this.getStoredData('scene', sceneName);
    if (!storedScene) { return false; }
    return await this.setScene(storedScene, true);
  }

  async deleteScene(sceneName:string): Promise<boolean> {
      try {
        globalThis.localStorage.removeItem(this.encodeStorageReference('scene', sceneName));
        return true;
      } catch(e) {
        console.error(e);
      }
    return false;
  }

  loadAudio(audioURL: string, audioInfo: string) {
    const self = this;
    this.scene.audio = {
      ...PenciltestScene.defaultAudioOptions,
      url: audioURL,
      info: audioInfo,
    };
    this.hasUnsavedChanges = true;
    if (!this.audioElement) { // TODO: abstract away from browser
      this.audioElement = globalThis.document.createElement('audio') as HTMLMediaElement;
      this.audioElement.setAttribute('preload', 'true');
      this.fieldContainer.appendChild(this.audioElement);
    } else {
      this.pauseAudio();
    }
    this.audioElement.addEventListener('error', (e: any) => {
      console.log('audio file error', e);
      const message = `The audio URL is no longer available. Please load the file again: ${this.scene.audio.info}`;
      return self.ui.triggerAppAction('linkAudio', [message]);
    });
    return this.audioElement.setAttribute('src', audioURL);
  }

  destroyAudio() {
    if (this.scene.audio) {
      delete this.scene.audio;
    }
    if (this.audioElement) {
      this.pauseAudio();
      this.audioElement.remove();
      return this.audioElement = null;
    }
  }

  pauseAudio() {
    if (this.audioElement && !this.audioElement.paused) { return this.audioElement.pause(); }
  }

  playAudio() {
    if (this.audioElement && this.audioElement.paused) { return this.audioElement.play(); }
  }

  seekAudio(time: number) {
    if (this.audioElement) { return ( this.audioElement.currentTime = time ); }
  }

  scrubAudio(exposureOffset:number = 0) {
    if (!this.options.scrubAudio || !this.audioElement) { return; }
    const frameExposures = this.scene.getFrameHold();
    if (exposureOffset < 0) {
      exposureOffset += frameExposures;
    }
    this.seekAudioToFrame(this.scene.current.frameNumber, exposureOffset);
    clearTimeout(this.playback.scrubAudioId);
    this.playAudio();
    return this.playback.scrubAudioId = setTimeout(
      () => this.pauseAudio(),
      Math.max(this.scene.current.singleFrameDuration * (frameExposures - exposureOffset), 200)
    );
  }

  pan(deltaPoint: Point) {
    return this.scene.frames.map((frame: PenciltestFrame) => {
      return frame.strokes.map((stroke: Stroke) => {
        const result = [];
        for (let segment of Array.from(stroke.path)) {
          segment.x += deltaPoint.x;
          segment.y += deltaPoint.y;
          result.push(segment);
        }
        return result;
      });
    });
  }

  resize() {
    let containerHeight: number, containerWidth: number;
    if (this.forceDimensions) {
      containerWidth = this.forceDimensions.width;
      containerHeight = this.forceDimensions.height;
    } else {
      containerWidth = this.container.offsetWidth;
      containerHeight = this.container.offsetHeight;
      if (this.options.showStatus) {
        containerHeight -= 36;
      }
    }
    const sceneDimensions = this.scene.getDimensions();
    const containerAspect = containerWidth / containerHeight;

    if (containerAspect > sceneDimensions.aspect) {
      this.width = Math.floor(containerHeight * sceneDimensions.aspect);
      this.height = containerHeight;
    } else {
      this.width = containerWidth;
      this.height = Math.floor(containerWidth / sceneDimensions.aspect);
    }

    this.fieldContainer.style.width = `${this.width}px`;
    this.fieldContainer.style.height = `${this.height}px`;
    this.renderer.resize(this.width, this.height);
    this.zoomFactor = this.width / this.scene.width;
    this.renderer.options.lineWeight = this.zoomFactor * this.scene.lineWeight;
    return this.drawCurrentFrame();
  }

  queueWork(work:Function, afterAll: boolean = false): Promise<any> {
    const queueCopy = this.workingOn.map((j)=>j); // shallow clone
    let job: Promise<any>;
    if (afterAll) {
      job = Promise.all(queueCopy).finally(() => work);
    } else {
      const lastJob = queueCopy[0]
      if (lastJob) {
        job = lastJob.finally(() => work);
      } else {
        job = new Promise((res,rej)=>res(work));
      }
    }
    this.workingOn.unshift(job);
    job.finally(() => {
      const jobIndex = this.workingOn.indexOf(job);
      if (jobIndex > -1) {
        this.workingOn.splice(jobIndex, 1);
      }
    });
    return job;
  }

}

class PenciltestScene implements PenciltestSceneData {

  static defaultOptions: PenciltestSceneOptions = {
    frameHold: 2,
    framerate: 24,
    loop: false,

    lineColor: 'black',
    lineCorner: 'round',
    lineOpacity: 1,
    lineWeight: 1,

    aspectRatio: '1:1',
    height: 1024
	};

  static defaultAudioOptions:PenciltestSceneAudio = {
    offset: 0,
    volume: 100,
  };

  audio: PenciltestSceneAudio;
  current: PenciltestSceneState;
  dateCreated: string;
  dateModified: string;
  frames: Array<PenciltestFrame>;
  instrument: PenciltestInsrument;
  name: string;
  uuid: string;

  background: string;
  frameHold: number;
  framerate: number;
  loop: boolean;

  aspectRatio: string;
  aspect: number;
  width: number;
  height: number;

  lineColor: Color | string;
  lineCorner: CanvasLineJoin;
  lineOpacity: number;
  lineWeight: number;

  constructor(sceneData:PenciltestSceneData) {
    const now = new Date();
    const nowString = now.toISOString();

    this.name = '';
    this.dateModified = nowString;
    this.dateCreated = nowString;
    this.uuid = '';
    this.instrument = {
      id: Penciltest.instrumentIdentifier,
      version: Penciltest.version
    };
    this.aspectRatio = '1:1';
    this.width = 1024;
    this.framerate = 24;
    this.frameHold = 2;
    this.background = 'gray';
    this.lineColor = 'black';
    this.lineWeight = 1;
    this.frames = [];
    this.current = new SceneState(sceneData.current || {});

    // Restrict assignment to existing keys in new scene.
    Object.keys(sceneData).forEach((key) => {
      if (key in this) {
        this[key] = sceneData[key];
      }
    });

    if (!this.uuid) {
      if (typeof crypto !== 'undefined' && crypto !== null) {
        crypto.randomUUID();
      }
    }
  }

  getDimensions():Bounds {
    const aspectRatio = this.aspectRatio || '1:1';
    const ratioParts = aspectRatio.split(':').map(Number);
    const dimensions: Bounds = { 
      width: this.width,
      height: this.height,
      aspect: ratioParts[0] / ratioParts[1],
      aspectRatio
    };
    if (!dimensions.width && !dimensions.height) {
      throw new Error('Either width or height must be defined.');
    } else if (!dimensions.width) {
      dimensions.width = Math.ceil(dimensions.height * dimensions.aspect);
    } else {
      dimensions.height = Math.ceil(dimensions.height / dimensions.aspect);
    }
    return dimensions;
  }

  updateState(): PenciltestSceneState {
    Object.assign(this.current, {
      frames: [],
      exposureCount: 0,
      singleFrameDuration: 1000 / this.framerate,
    })

    this.frames.forEach((frame, frameNumber) => {
      const hold = this.getFrameHold(frameNumber);
      const frameMeta:PenciltestFrameMeta = {
        id: frameNumber,
        exposure: this.current.exposureCount,
        duration: hold * this.current.singleFrameDuration,
        time: this.current.exposureCount * this.current.singleFrameDuration
      };
      this.current.frames.push(frameMeta);

      this.current.exposureCount += hold;
    });

    this.current.duration = this.current.exposureCount * this.current.singleFrameDuration;

    return this.current;
  }

  setModified(date:Date | null = null): Date {
    if (date === null) {
      date = new Date();
    }
    this.dateModified = date.toISOString();
    return date;
  }

  getFrameHold(frameNumber:number = -1) {
    if (frameNumber === -1) {
      frameNumber = this.current.frameNumber;
    }
    return this.frames[frameNumber]?.hold || this.frameHold;
  }

  setFrameHold(frameHold:number = 1, frameNumber:number = -1) {
    if (frameNumber === -1) {
      frameNumber = this.current.frameNumber;
    }
    this.frames[frameNumber].hold = frameHold;
  }

}
