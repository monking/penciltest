/// <reference path="vendor/GIFEncoder.js">
declare function GIFEncoder():GIFEncoderInterface;

class SceneState implements PenciltestSceneState {
  constructor(overrides: PenciltestSceneState = {}) {
    Object.assign(this, {
      frames: [],
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
    toolStack: [
      PenciltestTools.PENCIL,
      PenciltestTools.ERASER,
      PenciltestTools.PAN
    ],
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

    this.ui = new PenciltestUI( this, { parentElement: this.container } );

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
    //this.ui.updateStatusBar();
  }


  resetOptionsAndState() {
    this.state = { ...Penciltest.defaultState };
    this.setOptions(Penciltest.defaultOptions);

    this.currentStrokeIndex = -1;
    if (this.scene) {
      this.scene.updateState();
    }
    this.resize();
  }

  setPlayback(newPlayback: PlaybackState) {
    Object.assign(this.playback, newPlayback);
    for (let key in newPlayback) {
      if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
        this.ui.handleAppReaction(key);
      }
    }
    //this.ui.updateStatusBar();
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
      this.container.setAttribute('x-mode', mode);
      this.ui.updateStatusBar();
      return true;
    }
    return false;
  }

  setPreviousMode(): boolean {
    return this.setMode(this.state.previousMode || PenciltestModes.DRAWING);
  }

  getVisibleFrameRange(): PenciltestRange {
    const range = {start: this.scene.current.frameNumber, end: this.scene.current.frameNumber};
    if (this.options.onionSkin && this.options.onionSkinFrameRadius > 0) {
      range.start = Math.max(0, range.start - this.options.onionSkinFrameRadius);
      range.end = Math.min(this.scene.frames.length - 1, range.end + this.options.onionSkinFrameRadius);
    }
    return range;
  }

  getVisibleFrames(): Array<PenciltestFrame> {
    return Utils.getRange(this.getVisibleFrameRange(), this.scene.frames)[0];
  }

  getCurrentFrame() {
    return this.scene.frames[this.scene.current.frameNumber || 0];
  }

  getCurrentStroke() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex > -1 ? this.currentStrokeIndex : 0];
  }

  getFrameBounds(frames:Array<PenciltestFrame> = []): Bounds {
    if (frames.length === 0) { frames = [this.getCurrentFrame()]; }

    const frameBounds = {};

    frames.forEach((frame) => {
      if (!frame.strokes) { return; }
      frame.strokes.forEach((stroke) => {
        if (stroke.path) {
          Utils.unionBounds(stroke.path, frameBounds);
        }
      });
    });

    return frameBounds;
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
      for (let strokeIndex = 0; strokeIndex < Number(currentFrame.strokes?.length); strokeIndex++) {
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
    this.ui.updateStatusBar(); // FIXME: Probably too slow, rewriting all status DOM elemets, on each frame of play.
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
            this.ui.updateStatusBar();
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
      this.setPreviousMode();
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
    const isChanging = index !== 0
    if (isChanging) {
      if (index > -1) {
        this.state.toolStack.splice(index, 1);
      }
      this.state.toolStack.unshift(toolName);
      this.container.setAttribute('x-tool', toolName);
    }

    return isChanging;
  }

  usePreviousTool(): [ PenciltestTools, boolean ] {
    return [ this.state.toolStack[1], this.useTool(this.state.toolStack[1]) ];
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
    this.ui.updateStatusBar();
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
      this.scene.newFrame();
    }
    if (this.scene.current.frameNumber >= start) {
      if (this.scene.current.frameNumber - start <= droppedFrames.length) {
        this.scene.current.frameNumber = Math.min(start, this.scene.frames.length - 1);
      } else {
        this.scene.current.frameNumber -= droppedFrames.length;
      }
    }

    this.drawCurrentFrame();

    this.ui.updateStatusBar();

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
      try {
        amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
      } catch(reason) {
        if (reason !== Utils.promptCanceled) {
          console.error(reason);
        }
        return;
      }
    }
    return smooth(amount);
  }

  async smoothScene(amount: number = 1) {
    if (await Utils.confirm('Would you like to smooth every frame of this scene?')) {
      if (amount < 1) {
        try {
          amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
        } catch(reason) {
          if (reason !== Utils.promptCanceled) {
            console.error(reason);
          }
          return;
        }
      }
      this.setMode(PenciltestModes.WORKING);
      this.queueWork(() => {
        this.scene.frames.forEach((frame, i) => this.smoothFrame(i, amount))
        this.setPreviousMode();
      });
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
    this.scene.setFrameHold(newHold);
    this.scene.updateState();
    return this.ui.updateStatusBar();
  }

  newScene() {
    this.scene = new PenciltestScene(this.options);

    this.hasUnsavedChanges = false;

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
      this.ui.showFeedback({text:`Failed to parse stored data at name '${storageName}'.`});
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
      this.ui.showFeedback({text:`Failed to store local data at name '${storageName}': ${e.message}.`});
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
      return self.ui.triggerAppAction('linkAudio', [e, message]);
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

  pan(deltaPoint: Point, selection:Array<PenciltestFrame> = []) {
    if (selection.length === 0) {
      [ selection ] = this.getSelectedFrames()
    }

    selection.map((frame: PenciltestFrame) => {
      if (!frame.strokes) { return; }
      frame.strokes.forEach((stroke: Stroke) => {
        if (!stroke.path) { return; }
        stroke.path.forEach((segment) => {
          segment.x += deltaPoint.x;
          segment.y += deltaPoint.y;
        });
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
    this.zoomFactor = this.height / sceneDimensions.height;
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
