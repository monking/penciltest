enum PenciltestRenderers { CANVAS, SVG }; //"canvas" | "svg";

enum PenciltestModes { DRAWING, ERASING, WORKING, PLAYING }; //"drawing" | "erasing" | "working" | "playing";

enum PenciltestTools { PENCIL, ERASER }; //"pencil" | "eraser";

interface PenciltestRenderer {
};

interface PenciltestOptions {
  container?: string;
  hideCursor?: boolean;
  loop?: boolean;
  showStatus?: boolean;
  frameHold?: number;
  onionSkin?: boolean;
  smoothing?: number;
  onionSkinFrameRadius?: number;
  lineColor?: string;
  lineWeight?: number;
  background?: string;
  renderer?: PenciltestRenderers;
  onionSkinOpacity?: number;
};

interface PenciltestState {
  version: string;
  mode: PenciltestModes;
  toolStack: Array<PenciltestTools>;
};

class Penciltest {

  static version: string = '0.2.15';

  static defaultOptions: PenciltestOptions = {
    container: 'body',
    hideCursor: false,
    loop: true,
    showStatus: true,
    frameHold: 2,
    onionSkin: true,
    smoothing: 1,
    onionSkinFrameRadius: 4,
    lineColor: 'black',
    lineWeight: 1,
    background: 'gray',
    renderer: PenciltestRenderers.CANVAS,
    onionSkinOpacity: 0.5,
  };

  static modes = { // deprecated
    WORKING: "working",
    DRAWING: "drawing",
    ERASING: "erasing",
    PLAYING: "playing",
  };

  static availableRenderers = {
    [PenciltestRenderers.CANVAS]: CanvasRenderer,
    [PenciltestRenderers.SVG]: SVGRenderer
  };
    
  availableRenderers: { [PenciltestRenderers.CANVAS]: PenciltestRenderer; [PenciltestRenderers.SVG]: PenciltestRenderer; };
  options: PenciltestOptions;
  state: { version: string; mode: any; toolStack: {}; };
  current: { frames: {}; exposures: {}; exposureCount: number; exposureNumber: number; frameNumber: number; };
  container: any;
  ui: any;
  fieldContainer: any;
  fieldElement: any;
  scene: any;
  currentStrokeIndex: number;
  renderer: any;
  zoomFactor: number;
  unsavedChanges: boolean;
  markPoint: { x: number; y: number; };
  markBuffer: {};
  playDirection: any;
  framesHeld: number;
  playInterval: any;
  audioElement: any;
  copyBuffer: any;
  redoQueue: any;
  forceDimensions: { width: any; height: any; };

  constructor(options: PenciltestOptions) {
    this.options = {
      ...Penciltest.defaultOptions,
      ...this.getStoredData('app', 'options'),
    };
  
    this.state = {
      version: Penciltest.version,
      mode: "drawing",
      toolStack: ['pencil','eraser'],
      ...this.getStoredData('app', 'state'),
    };
  
    // metadata generated while interpreting the scene data
    this.current = {
      frames: [],
      exposures: [],
      exposureCount: 0,
      exposureNumber: 0,
      frameNumber: 0
    };

    this.container = globalThis.document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';

    this.buildContainer();

    this.ui = new PenciltestUI( { controller: this, parent: this.container } );

    this.newScene();

    this.setOptions(this.options); // do all the option actions

    if (this.state.version !== Penciltest.prototype.state.version) {
      this.state.version = PenciltestLegacy.update(this, this.state.version, Penciltest.prototype.state.version);
    }

    this.resize();

    globalThis.pt = this;
  };

  setOptions(newOptions: { [x: string]: any; renderer?: any; }) {
    this.options = Utils.inherit(
      newOptions,
      this.options || {},
      Penciltest.prototype.state
    );

    return (() => {
      const result = [];
      for (let key in newOptions) {
        const value = newOptions[key];
        if (key in this.ui.appActions && this.ui.appActions[key].action) { result.push(this.ui.appActions[key].action.call(this)); } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  buildContainer() {
    const markup = '<div class="field-container">' +
      '<div class="field"></div>' +
    '</div>';

    this.container.innerHTML = markup;

    this.fieldContainer = this.container.querySelector('.field-container');
    return this.fieldElement = this.container.querySelector('.field');
  }

  newFrame(index = null) {
    const frame = {
      hold: this.options.frameHold,
      strokes: []
    };

    if (index === null) {
      index = this.scene.frames.length;
    }

    this.lift();
    this.scene.frames.splice(index, 0, frame);
    return this.buildSceneMeta();
  }

  getCurrentFrame() {
    return this.scene.frames[this.current.frameNumber || 0];
  }

  getCurrentStroke() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex || 0];
  }

  mark(x: any,y: any) {
    x = Utils.getDecimal(x, 1);
    y = Utils.getDecimal(y, 1);

    if (!this.currentStrokeIndex) {
      let base: { strokes: {}; };
      if ((base = this.getCurrentFrame()).strokes == null) { base.strokes = []; }
      this.currentStrokeIndex = this.getCurrentFrame().strokes.length;
      this.getCurrentFrame().strokes.push([]);
      this.renderer.moveTo(x, y);
    } else {
      this.renderer.lineTo(x, y);
    }

    this.getCurrentStroke().push(this.scaleCoordinates([x, y], 1 / this.zoomFactor));
    if (this.state.mode === "drawing") {
      this.renderer.render();
    }

    this.clearRedo();
    return this.unsavedChanges = true;
  }

  track(x: number,y: number) {
    const coords = {
      x,
      y
    };

    if (this.state.toolStack[0] === 'eraser') {
      const screenPoint = [x, y];
      const point = this.scaleCoordinates(screenPoint, 1 / this.zoomFactor);
      let done = false;
      const currentFrame = this.getCurrentFrame();
      const screenEraseRadius = 10;
      this.drawCurrentFrame();
      for (let strokeIndex = 0; strokeIndex < currentFrame.strokes.length; strokeIndex++) {
        const stroke = currentFrame.strokes[strokeIndex];
        for (let segment of Array.from(stroke)) {
          const realEraseRadius = screenEraseRadius / this.zoomFactor;
          if ((Math.abs(point[0] - segment[0]) < realEraseRadius) && (Math.abs(point[1] - segment[1]) < realEraseRadius)) {
            currentFrame.strokes.splice(strokeIndex, 1);
            this.drawCurrentFrame();
            done = true;
          }
          if (done) { break; }
        }
        if (done) { break; }
      }
      return this.renderer.rect(screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red');

    } else {
      if ((this.currentStrokeIndex == null)) {
        this.markPoint = coords;
        this.markBuffer = [];
      }

      this.markBuffer.push(coords);

      // TODO  Mark multiple points per @options.smoothing
      this.markPoint.x = ((this.markPoint.x * this.options.smoothing) + x) / (this.options.smoothing + 1);
      this.markPoint.y = ((this.markPoint.y * this.options.smoothing) + y) / (this.options.smoothing + 1);

      // TODO  Use previous mark for velocity, to interpolate `smoothing`×
      if (this.markBuffer.length > this.state.smoothDrawInterval) {
        this.markBuffer = [];
      }

      return this.mark(this.markPoint.x, this.markPoint.y);
    }
  }

  updateCurrentFrame(segment: any) {
    return this.drawCurrentFrame();
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

  goToFrame(targetFrameNumber: number, overrides: { lineWeight: any; }) {
    const selectedFrameNumber = this.resolveFrameNumber(targetFrameNumber);

    this.current.frameNumber = selectedFrameNumber;
    this.current.frame = this.scene.frames[this.current.frameNumber];

    if (this.state.mode !== "playing") {
      this.seekAudioToFrame(selectedFrameNumber);
    }
    return this.drawCurrentFrame(overrides);
  }

  seekAudioToFrame(frameNumber: number) {
    if (this.scene.audio) {
      Utils.log(this.current.frames[frameNumber]);
      const seekTime = this.current.frames[frameNumber].time - this.scene.audio.offset;
      return this.seekAudio(seekTime);
    }
  }

  play() {
    const self = this;
    if (this.playDirection == null) { this.playDirection = 1; }
    if (this.current.frameNumber < this.scene.frames.length) { // i.e. it is a frame in the scene (in case @current.frameNumber was
      this.framesHeld = 0;
      this.goToFrame(this.current.frameNumber); // reset the audio position to the _beginning_ of the current frame
    } else {
      this.framesHeld = -1;
      this.goToFrame(0);
    }

    const stepListener = function(firstStep: boolean) {
      self.framesHeld++;
      const currentFrame = self.getCurrentFrame();
      let newIndex = self.current.frameNumber + self.playDirection;
      if ((self.framesHeld >= currentFrame.hold) || ( firstStep && (newIndex === self.scene.frames.length) )) {
        self.framesHeld = 0;
        if ((newIndex >= self.scene.frames.length) || (newIndex < 0)) {
          if (self.options.loop || firstStep) {
            newIndex = (newIndex + self.scene.frames.length) % self.scene.frames.length;
            self.goToFrame(newIndex);
            return self.seekAudioToFrame(0);
          } else {
            return self.stop();
          }
        } else {
          return self.goToFrame(newIndex);
        }
      }
    };

    this.stop();
    stepListener(true);
    this.playInterval = setInterval(stepListener, 1000 / this.scene.framerate);
    this.lift();
    this.state.mode = "playing";
    return this.playAudio();
  }

  stop() {
    if (this.audioElement) { this.pauseAudio(); }
    clearInterval(this.playInterval);
    if (this.state.mode === "playing") {
      return this.state.mode = "drawing";
    }
  }

  togglePlay() {
    if (this.state.mode !== "working") {
      if (this.state.mode === "playing") { return this.stop(); } else { return this.play(); }
    }
  }

  drawCurrentFrame(overrides: undefined) {
    // NOTE: This draws the background, while drawFrame() does not.
    if (!this.renderer || !this.scene.frames.length) { return; }

    this.renderer.clear();

    if (this.scene.background) {
      this.renderer.rect(0, 0, this.width, this.height, this.scene.background);
    }

    if (this.options.onionSkin) {
      for (let i = 1, end = this.options.onionSkinFrameRadius, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const previousFrameNumber = this.resolveFrameNumber(this.current.frameNumber - i);
        if (previousFrameNumber !== this.current.frameNumber) {
          this.drawFrame(
            previousFrameNumber,
            Object.assign(
              {},
              overrides,
              {
                lineColor: [255, 0, 0],
                lineOpacity: Math.pow(this.options.onionSkinOpacity, i)
              }
            )
          );
        }
        const nextFrameNumber = this.resolveFrameNumber(this.current.frameNumber + i);
        if (nextFrameNumber !== this.current.frameNumber) {
          this.drawFrame(
            nextFrameNumber,
            Object.assign(
              {},
              overrides,
              {
                lineColor: [0, 255, 255],
                lineOpacity: Math.pow(this.options.onionSkinOpacity, i)
              }
            )
          );
        }
      }
    }
    this.renderer.composeOptions();
    this.drawFrame(this.current.frameNumber, overrides);
    return this.ui.updateStatus();
  }
    width(arg0: number, arg1: number, width: any, height: any, background: any) {
        throw new Error("Method not implemented.");
    }
    height(arg0: number, arg1: number, width: any, height: any, background: any) {
        throw new Error("Method not implemented.");
    }

  drawFrame(frameNumber: string | number, overrides: any) {
    if (!this.width || !this.height) { return; }

    if (overrides) { this.renderer.composeOptions(overrides); }

    return Array.from(this.scene.frames[frameNumber].strokes).map((stroke: any) =>
      this.renderer.path(this.scaleStroke(stroke, this.zoomFactor)));
  }

  scaleStroke(stroke: any, factor: any) {
    return Array.from(stroke).map((coords: any) => this.scaleCoordinates(coords, factor));
  }

  scaleCoordinates(coords: { slice?: any; }, factor: number) {
    const newCoords = [
      coords[0] * factor,
      coords[1] * factor
    ];
    newCoords.push(coords.slice(2));
    return newCoords;
  }

  useTool(toolName: any) {
    const index = this.state.toolStack.indexOf(toolName);
    if (index > -1) {
      return this.state.toolStack.unshift(this.state.toolStack.splice(index, 1)[0]);
    }
  }

  cancelStroke() {
    this.markBuffer = [];
    return this.currentStrokeIndex = null;
  }

  lift() {
    if (this.markBuffer && this.markBuffer.length) {
      const last = this.markBuffer.pop();
      this.mark(last.x, last.y);
      this.markBuffer = [];
    }
    this.currentStrokeIndex = null;
    if (this.state.toolStack[0] === 'eraser') {
      return this.drawCurrentFrame();
    }
  }

  copyFrame(frame: { strokes: { length: any; }; }) {
    if (frame == null) { frame = this.getCurrentFrame(); }
    if (frame.strokes.length) {
      return this.copyBuffer = Utils.clone(frame);
    }
  }

  pasteFrame() {
    if (this.copyBuffer) {
      const newFrameNumber = this.current.frameNumber + 1;
      this.scene.frames.splice(newFrameNumber, 0, Utils.clone(this.copyBuffer));
      this.buildSceneMeta();
      return this.goToFrame(newFrameNumber);
    }
  }

  pasteStrokes() {
    if (this.copyBuffer) {
      this.scene.frames[this.current.frameNumber].strokes = this.scene.frames[this.current.frameNumber].strokes.concat(Utils.clone(this.copyBuffer.strokes));
      return this.drawCurrentFrame();
    }
  }

  clearStrokes() {
    this.scene.frames[this.current.frameNumber].strokes = [];
    return this.drawCurrentFrame();
  }

  cutFrame() {
    const droppedFrame = this.dropFrame();
    if (droppedFrame.strokes.length) { return this.copyFrame(droppedFrame); }
  }

  dropFrame() {
    const droppedFrame = this.getCurrentFrame();
    this.scene.frames.splice(this.current.frameNumber, 1);
    if ((this.current.frameNumber >= this.scene.frames.length) && (this.current.frameNumber > 0)) { this.current.frameNumber--; }
    if (this.scene.frames.length === 0) {
      this.newFrame();
    }

    this.buildSceneMeta();
    this.drawCurrentFrame();

    return droppedFrame;
  }

  smoothFrame(index: number, amount: any) {
    const self = this;
    const smooth = function(amount: any) {
      amount = Number(amount);
      const smoothingBackup = self.options.smoothing;
      self.options.smoothing = amount;
      const frame = self.scene.frames[index];
      const oldStrokes = JSON.parse(JSON.stringify(frame.strokes));
      self.lift();
      frame.strokes = [];
      self.current.frameNumber = index;
      self.renderer.clear();
      return (() => {
        const result = [];
        for (let stroke of Array.from(oldStrokes)) {
          for (let segment of Array.from(stroke)) {
            self.track.apply(self, segment);
          }
          result.push(self.lift());
        }
        return result;
      })();
    };

    this.options.smoothing = smoothingBackup;
    if (amount) {
      return Utils.prompt('How much to smooth? 1-5', 2, smooth);
    } else {
      return smooth(amount);
    }
  }

  smoothScene(amount: any) {
    const self = this;
    if (this.state.mode === "drawing") {
      return Utils.confirm('Would you like to smooth every frame of this scene?', function() {
        const beginSmoothingScene = function(amount: any) {
          amount = Number(amount);
          self.state.mode = "working";
          const lastIndex = self.scene.frames.length - 1;
          for (let frame = 0, end = lastIndex, asc = 0 <= end; asc ? frame <= end : frame >= end; asc ? frame++ : frame--) {
            self.smoothFrame(frame, amount);
          }
          return self.state.mode = "drawing";
        };
        if (!amount) {
          return Utils.prompt('How much to smooth? 1-5', 2, beginSmoothingScene);
        } else {
          return beginSmoothingScene(amount);
        }
      });
    } else {
      return Utils.log('Unable to alter scene while playing');
    }
  }

  undo() {
    if (this.getCurrentFrame().strokes && this.getCurrentFrame().strokes.length) {
      if (this.redoQueue == null) { this.redoQueue = []; }
      this.redoQueue.push(this.getCurrentFrame().strokes.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  }

  redo() {
    if (this.redoQueue && this.redoQueue.length) {
      this.getCurrentFrame().strokes.push(this.redoQueue.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  }

  clearRedo() {
    return this.redoQueue = [];
  }

  setCurrentFrameHold(newHold: any) {
    this.getCurrentFrame().hold = Math.max(1, newHold);
    this.buildSceneMeta();
    return this.ui.updateStatus();
  }

  defaultScene(sceneData = null) {
    const now = new Date();
    const nowString = now.toISOString();
    const scene = { 
      name: '',
      dateModified: nowString,
      dateCreated: nowString,
      uuid: null,
      instrument: {
        name: 'io.lovejoy.penciltest',
        version: Penciltest.prototype.state.version
      },
      aspect: '1:1',
      width: 1024,
      framerate: 12,
      background: this.options.background,
      lineColor: this.options.lineColor,
      lineWeight: this.options.lineWeight,
      frames: []
    };

    if (sceneData) {
      Object.assign(scene, sceneData);
    }

    if (scene.uuid === null) {
      if (typeof crypto !== 'undefined' && crypto !== null) {
        crypto.randomUUID();
      }
    } else if (scene === false) {
      delete scene.uuid;
    }

    return scene;
  }

  newScene() {
    this.scene = this.defaultScene();

    this.unsavedChanges = false;

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

  encodeStorageReference(namespace: string, name: any) {
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

  getStoredData(namespace: string, name: string) {
    const storageName = this.encodeStorageReference(namespace, name);
    return JSON.parse(globalThis.localStorage.getItem(storageName));
  }

  putStoredData(namespace: string, name: string | boolean, data: any) {
    const storageName = this.encodeStorageReference(namespace, name);
    return globalThis.localStorage.setItem(storageName, JSON.stringify(data));
  }

  updateScene(callback: (arg0: any) => any) {
    const self = this;
    this.scene.dateModified = (new Date()).toISOString();
    this.scene.current = {
      frameNumber: this.current.frameNumber
    };
    if (!this.scene.name) {
      return Utils.prompt("What's the name of your scene?", this.scene.name, function(name: any) {
        if (name) { self.scene.name = name; }
        if (callback) { return callback(self.scene); }
      });
    } else {
      if (callback) { return callback(self.scene); }
    }
  }

  saveScene(update: boolean){
    if (update == null) { update = true; }
    const name = (this.scene.name != null) || 'Untitled';
    this.putStoredData('scene', name, this.scene);
    if (update) { return this.unsavedChanges = false; }
  }

  renderGif() {
    const self = this;
    const beginRenderingGif = function(gifConfigurationString: any) {
      let asc: boolean, end: number;
      const gifConfiguration = (gifConfigurationString || '512 2').split(' ');
      // configure for rendering
      // dimensions = [64, 64]
      const dimensions = self.getSceneDimensions();
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

      self.forceDimensions = {
        width: dimensions.width,
        height: dimensions.height
      };
      // rebuild renderer to ensure correct resolution for capture
      self.ui.appActions.renderer.action();
      self.resize();

      const oldRendererType = self.options.renderer;
      self.setOptions({renderer: 'canvas'});
      self.ui.appActions.renderer.action();

      const gifRenderOverrides = 
        {lineWeight: gifLineWeight};

      const baseFrameDelay = 1000 / self.scene.framerate;
      let frameNumber = 0;

      // prepare encoder
      const gifEncoder = new GIFEncoder();
      // gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
      gifEncoder.setRepeat(0);
      gifEncoder.setDelay(baseFrameDelay);
      gifEncoder.start();

      for (frameNumber = 0, end = self.scene.frames.length, asc = 0 <= end; asc ? frameNumber < end : frameNumber > end; asc ? frameNumber++ : frameNumber--) {
        self.goToFrame(frameNumber, gifRenderOverrides);
        gifEncoder.setDelay(baseFrameDelay * self.getCurrentFrame().hold); // FIXME no good; how to set individual delays for each fram in gifEncoder?
        gifEncoder.addFrame(self.renderer.context);
      }

      gifEncoder.finish();
      const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }));

      const gifElementId = 'rendered_gif';
      let gifElement = globalThis.document.getElementById(gifElementId);
      const gifLinkId = 'rendered_gif_link';
      let gifLink = globalThis.document.getElementById(gifLinkId);
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
        let containerCss = {
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

        var gifCloseHandler = function(event: { target: any; type: boolean; key: string; }) {
          if ((event.target !== gifElement) || ( event.type = 'keydown' && (event.key === 'escape') )) {
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

      gifElement.src = blobUrl;
      gifLink.href = blobUrl;
      gifLink.download = (self.scene.name || 'untitled')+'.penciltest.gif';

      // TODO 1) render each frame small in canvas
      // TODO 2) append with the corect duration to a GIF in memory
      // TODO 3) draw the GIF as a `data:` URL, prompting to right-click and save'

      // reset to user's configuration
      self.setOptions({renderer: oldRendererType});
      self.forceDimensions = null;
      return self.resize();
    };

    const gifSize = Math.min(512, self.scene.width);
    const lineWeight = 1;
    return Utils.prompt('GIF size & line weight (px)', gifSize+' '+lineWeight, beginRenderingGif);
  }

  selectSceneName(message: string, callback: { (name: any): any; (sceneName: any): any; (arg0: any): any; }) {
    const sceneNames = this.getSceneNames();
    if (sceneNames.length) {
      if (message == null) { message = 'Choose a scene'; }
      Utils.select(message, sceneNames, this.scene.name, function(selectedSceneName: any) {
        if (selectedSceneName) {
          return callback(selectedSceneName);
        } else {
          return Utils.alert("No scene by that name.");
        }
      });
    } else {
      Utils.alert("You don't have any saved scenes yet.");
    }

    return false;
  }

  setScene(scene: any) {
    this.scene = Object.assign(this.defaultScene({uuid:false}), scene);
    if (this.scene != null ? this.scene.current : undefined) {
      this.current = this.scene.current;
      delete this.scene.current;
    }
    this.buildSceneMeta();
    if (this.scene.audio && this.scene.audio.url) {
      this.loadAudio(this.scene.audio.url, (this.scene.audio.info != null));
    } else {
      this.destroyAudio();
    }
    if (this.renderer) {
      if (this.scene.background) { this.renderer.options.background = this.scene.background; }
      if (this.scene.lineColor) { this.renderer.options.lineColor = this.scene.lineColor; }
      if (this.scene.lineWeight) { this.renderer.options.lineWeight = this.scene.lineWeight; }
    }
    this.goToFrame((this.current != null ? this.current.frameNumber : undefined) || 0);
    this.ui.updateStatus();
    this.unsavedChanges = false;
    return this.resize(); // FIXME
  }

  loadScene() {
    const self = this;
    return this.selectSceneName('Choose a scene to load', (name: any) => self.setScene(self.getStoredData('scene', name)));
  }

  deleteScene() {
    const self = this;
    return this.selectSceneName('Choose a scene to DELETE...FOREVER', (sceneName: any) => globalThis.localStorage.removeItem(self.encodeStorageReference('scene', sceneName)));
  }

  buildSceneMeta() {
    this.current.frames = [];
    this.current.exposures = [];
    this.current.exposureCount = 0;
    this.current.singleFrameDuration = 1 / this.scene.framerate;

    for (let i = 0, end = this.scene.frames.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      const frame = this.scene.frames[i];
      const frameMeta = {
        id: i,
        exposure: this.current.exposureCount,
        duration: frame.hold * this.current.singleFrameDuration,
        time: this.current.exposureCount * this.current.singleFrameDuration
      };
      this.current.frames.push(frameMeta);
      for (let j = 1, end1 = frame.hold, asc1 = 1 <= end1; asc1 ? j < end1 : j > end1; asc1 ? j++ : j--) { this.current.exposures.push(frameMeta); }
      this.current.exposureCount += this.scene.frames[i].hold;
    }

    return this.current.duration = this.current.exposureCount * this.current.singleFrameDuration;
  }

  getFrameDuration(frameNumber: string | number) {
    if (frameNumber == null) { ({
      frameNumber
    } = this.current); }
    const frame = this.scene.frames[frameNumber];
    return frame.hold / this.scene.framerate;
  }

  loadAudio(audioURL: any, audioInfo: boolean) {
    const self = this;
    if (this.scene.audio == null) { this.scene.audio = {}; }
    this.scene.audio.url = audioURL;
    this.scene.audio.offset = 0;
    this.scene.audio.info = audioInfo;
    this.unsavedChanges = true;
    if (!this.audioElement) { // TODO: abstract away from browser
      this.audioElement = globalThis.document.createElement('audio');
      this.audioElement.preload = true;
      this.fieldContainer.appendChild(this.audioElement);
    } else {
      this.pauseAudio();
    }
    this.audioElement.addEventListener('error', (e: any) => {
      console.log('audio file error', e);
      return self.ui.appActions.linkAudio.listener.apply(self, ["The audio URL is no longer available. Please load the file again: "+this.scene.audio.info]);
  });
    return this.audioElement.src = audioURL;
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

  scrubAudio() {
    const self = this;
    Utils.log('scrubAudio', this.current.frameNumber);
    this.seekAudioToFrame(this.current.frameNumber);
    clearTimeout(this.scrubAudioTimeout);
    this.playAudio();
    return this.scrubAudioTimeout = setTimeout(
      () => self.pauseAudio(),
      Math.max(this.getFrameDuration * 1000, 100)
    );
  }
    scrubAudioTimeout(scrubAudioTimeout: any) {
        throw new Error("Method not implemented.");
    }

  pan(deltaPoint: {}) {
    return Array.from(this.scene.frames).map((frame: { strokes: any; }) =>
      Array.from(frame.strokes).map((stroke: any) =>
        (() => {
          const result = [];
          for (let segment of Array.from(stroke)) {
            segment[0] += deltaPoint[0];
            result.push(segment[1] += deltaPoint[1]);
          }
          return result;
        })()));
  }

  getSceneDimensions() {
    const aspect = this.scene.aspect || '1:1';
    const aspectParts = aspect.split(':');
    const dimensions = { 
      width: this.scene.width,
      aspect: aspectParts[0] / aspectParts[1]
    };
    dimensions.height = Math.ceil(dimensions.width / dimensions.aspect);
    return dimensions;
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
    const sceneDimensions = this.getSceneDimensions();
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

}
