class Penciltest {

  static version = '0.3.0';
  static debugVersion = '0.3.1';
  static instrumentIdentifier = 'io.lovejoy.penciltest';

  // components
  sceneRenderer: CanvasRenderer | SVGRenderer;
  toolRenderer: CanvasRenderer;
  scene: PenciltestScene | null;
  ui: PenciltestUI;
  migrator: PenciltestMigrator;

  // global config/state
  forceDimensions: Rect | null;
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
  trackBuffer: Array<Mark>;
  redoQueue: Array<Stroke>;
  workingOn: Array<Promise<any>>;


  static defaultOptions: PenciltestOptions = {
    background: 'gray',
    strokeColor: 'black',
    strokeOpacity: -1,
    strokeWidth: 1,
    eraserWidth: 40,
    container: 'body',
    hideCursor: true,
    onionSkin: true,
    onionSkinFrameRadius: 4,
    renderer: Renderers.CANVAS,
    scrubAudio: false,
    showStatus: true,
    smoothing: 1,
    onionSkinForwardColor: [0, 200, 50, 0.5],
    onionSkinBackwardColor: [220, 0, 0, 0.5],
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
    mode: PenciltestMode.DRAWING,
    toolStack: [],
    pointerMode: PointerMode.AWAY,
    previousMode: null
  };


  constructor(options: PenciltestOptions) {
    const [ storedOptions ] = this.getStoredData('app', 'options');
    this.options = {
      ...PenciltestScene.defaultOptions,
      ...Penciltest.defaultOptions,
      ...storedOptions,
    };
  
    const [ storedState ] = this.getStoredData('app', 'state');
    this.state = {
      ...Penciltest.defaultState,
      ...storedState,
    };

		this.trackBuffer = []
  
    this.workingOn = [];

    this.playback = { ...Penciltest.defaultPlayback };

    this.migrator = new PenciltestMigrator();

    this.container = globalThis.document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';

    this.buildContainer();

    this.ui = new PenciltestUI( this, { parentElement: this.container } );

    this.newScene();

    this.setOptions(this.options)
      .then(() => {
        //this.prepareRenderers(); // Already called in penciltest-ui reaction to `renderer` setting. Leaving this note here to remember this is when it happens.
        this.resize();
        this.drawCurrentFrame();
        this.useTool(PenciltestTool.PENCIL);
      });
  };

  async setOptions(newOptions: PenciltestOptions) {
    Object.assign(this.options, newOptions);
    if (newOptions.debug && Penciltest.debugVersion && Penciltest.debugVersion !== Penciltest.version) {
      this.state.version = Penciltest.debugVersion;
    }
    const reactions = [];
    for (let key in newOptions) {
      if (key in this.ui.appActions && typeof this.ui.appActions[key].action === 'function') {
        reactions.push(this.ui.handleAppReaction(key));
      }
    }
    await Promise.all(reactions);
  }


  async resetOptionsAndState() {
    this.state = { ...Penciltest.defaultState };
    await this.setOptions(Penciltest.defaultOptions);

    this.scene.current.strokeNumber = -1;
    if (this.scene) {
      this.scene.updateState();
    }
    this.resize();
  }

  prepareRenderers() {
    const rendererOptions:PenciltestRendererOptions = {
      strokeColor: this.scene.strokeColor,
      strokeWidth: this.scene.strokeWidth,
      strokeOpacity: this.scene.strokeOpacity,
      container: this.fieldElement,
      background: this.scene.background,
      debug: this.options.debug
    };

    if (this.options.renderer === Renderers.SVG) {
      this.sceneRenderer = new SVGRenderer(rendererOptions);
    } else {
      this.sceneRenderer = new CanvasRenderer(rendererOptions);
    }

    const toolRendererOptions:PenciltestRendererOptions = {
      ...rendererOptions,
      background: 'transparent',
      alpha: true,
    };
    this.toolRenderer = new CanvasRenderer(toolRendererOptions);
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

  setMode(mode:PenciltestMode): boolean {
    if (mode !== this.state.mode) {
      this.state.previousMode = this.state.mode;
      this.state.mode = mode;
      this.container.setAttribute('x-mode', mode);
      if (this.state.previousMode === PenciltestMode.PLAYING) {
        this.stop();
      }
      this.ui.updateStatusBar();
      return true;
    }
    return false;
  }

  setPreviousMode(): boolean {
    return this.setMode(this.state.previousMode || PenciltestMode.DRAWING);
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

  getFrameBounds(frames:Array<PenciltestFrame> = []): Rect {
    if (frames.length === 0) { frames = [this.scene.getCurrentFrame()]; }

    const frameBounds = {};

    frames.forEach((frame) => {
      if (!frame.strokes) { return; }
      frame.strokes.forEach((stroke) => {
        if (stroke.path) {
          PTSpace.unionBounds(stroke.path, frameBounds);
        }
      });
    });

    return frameBounds;
  }

  previousMark:Mark;
  mark(mark: Mark) {
    const stroke = this.scene.getCurrentStroke(true);
    const isNewStroke = stroke.path.length === 0;
    if (isNewStroke) { delete this.previousMark; }
    stroke.path.push(PTSpace.scalePoint(mark, 1 / this.zoomFactor));

    if (this.options.debug) { console.log(`  mark ${this.previousMark?.x || '_'},${this.previousMark?.y || '_'}-->${mark.x},${mark.y}`); }

    if (this.state.mode === PenciltestMode.DRAWING) {
      if (this.previousMark && this.previousMark !== mark) {
        const previousMark = Utils.clone(this.previousMark); // to enable deferred rendering
        this.sceneRenderer.requestRender((renderer, timestamp) => {
          renderer.beginPath({strokeWidth: this.options.strokeWidth * this.zoomFactor});
          renderer.moveToPoint(previousMark);
          renderer.lineToPoint(mark);
          renderer.endPath();
        });
      }
    }

    this.clearRedo();
    this.hasUnsavedChanges = true;
    this.previousMark = mark;
  }

  track(trackMark: Mark) {
    const isDown = this.state.pointerMode === PointerMode.PRESS;

    this.trackBuffer.unshift(trackMark);
    if (this.trackBuffer.length > 3) {
      this.trackBuffer.pop();
    }

    const scenePoint = PTSpace.scalePoint(trackMark, 1 / this.zoomFactor);
    this.drawTool({trackPoint: trackMark, down:isDown});

    if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
      if (isDown) {
        this.mark({ ...trackMark, w: this.options.strokeWidth });
      }
    } else if (this.state.toolStack[0] === PenciltestTool.ERASER) {
      if (isDown) {
        const currentFrame = this.scene.getCurrentFrame();
        let erasures = 0;
        if (currentFrame.strokes?.length > 0) {
          const erasingStrokeIndexes = this.findIntersectingStrokes(currentFrame.strokes, scenePoint, this.options.eraserWidth / 2);
          if (erasingStrokeIndexes.length > 0) {
            erasingStrokeIndexes.reverse().forEach((strokeIndex) => {
              currentFrame.strokes.splice(strokeIndex, 1);
              erasures++;
            });
          }
        }
        if (erasures > 0) {
          this.drawCurrentFrame();
        }
      }
    }
  }

  findIntersectingStrokes(strokes:Array<Stroke>, scenePoint:Point, radius:number, checkCircle:boolean = true, findAll:boolean = true): Array<number> {
    const matches = [];
    for (let strokeIndex = 0; strokeIndex < Number(strokes.length); strokeIndex++) {
      for (let segment of strokes[strokeIndex].path) {
        if (Math.abs(scenePoint.x - segment.x) < radius && Math.abs(scenePoint.y - segment.y) < radius) {
          if (checkCircle && PTSpace.magnitude(PTSpace.diffPoints(scenePoint, segment)) > radius) {
            continue;
          }
          matches.push(strokeIndex);
          if (!findAll) return matches;
          break;
        }
      }
    }
    return matches;
  }

  resolveFrameNumber(inputIndex: number) {
    return this.scene.resolveFrameNumber(inputIndex, this.options.loop);
  }

  goToFrame(targetFrameNumber: number, overrides: PenciltestRendererOptions = {}) {
    const selectedFrameNumber = this.scene.setCurrentFrameNumber(targetFrameNumber, this.options.loop);

    if (this.state.mode !== PenciltestMode.PLAYING) {
      this.lift();
      this.seekAudioToFrame(selectedFrameNumber);
    }
    this.ui.updateStatusBar(); // FIXME: Probably too slow, rewriting all status DOM elemets, on each frame of play.
    return this.drawCurrentFrame(overrides);
  }

  seekAudioToFrame(frameNumber: number, exposureOffset:number = 0) {
    if (this.scene.audio) {
      const frame = this.scene.current.frames[frameNumber]
      if (!frame || !("time" in frame)) { return; }

      let offset = typeof this.scene.audio?.offset === 'number' ? -this.scene.audio.offset : 0;
      if (exposureOffset !== 0) {
        offset += exposureOffset * this.scene.current.singleFrameDuration;
      }
      const seekTime = (frame.time + offset) / 1000;
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
    if (this.playback.scrubAudioId) {
      clearTimeout(this.playback.scrubAudioId);
    }
    stepListener(true);
    this.playback.stepId = setInterval(stepListener, 1000 / this.scene.framerate);
    this.lift();
    this.setMode(PenciltestMode.PLAYING);
    return this.playAudio(); // FIXME: if audio offset is positive, it should not begin playing on the first frame, but later.
  }

  stop() {
    if (this.audioElement) { this.pauseAudio(); }
    clearInterval(this.playback.stepId);
    if (this.state.mode === PenciltestMode.PLAYING) {
      this.setPreviousMode();
    }
  }

  togglePlay() {
    if (this.state.mode !== PenciltestMode.WORKING) {
      if (this.state.mode === PenciltestMode.PLAYING) {
        return this.stop();
      } else {
        return this.play();
      }
    }
  }

  drawCurrentFrame(overrides: PenciltestRendererOptions = {}) {
    // NOTE: This draws the background, while drawFrame() does not.
    // NOTE: This also calls drawFrame.
    if (!this.sceneRenderer || !this.scene.frames.length) { return; }
    if (this.options.debug) { console.log('    drawCurrentFrame: REQ'); }

    this.sceneRenderer.requestRender((renderer:PenciltestRenderer, timestamp) => {
      if (this.options.debug) { console.log('    drawCurrentFrame:     HAP'); }
      renderer.clear(true);

      if (this.options.onionSkin) {
        for (let i = 1, end = this.options.onionSkinFrameRadius, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
          const previousFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber - i);
          if (previousFrameNumber !== this.scene.current.frameNumber) {
            this.drawFrame(
              previousFrameNumber,
              renderer,
              {
                ...overrides,
                strokeColor: this.options.onionSkinBackwardColor.slice(0,3).concat([Math.pow(this.options.onionSkinBackwardColor[3], i)]) as Color
              }
            );
          }
          const nextFrameNumber = this.resolveFrameNumber(this.scene.current.frameNumber + i);
          if (nextFrameNumber !== this.scene.current.frameNumber) {
            this.drawFrame(
              nextFrameNumber,
              renderer,
              {
                ...overrides,
                strokeColor: this.options.onionSkinForwardColor.slice(0,3).concat([Math.pow(this.options.onionSkinForwardColor[3], i)]) as Color
              }
            );
          }
        }
      }
      renderer.composeOptions();
      this.drawFrame(this.scene.current.frameNumber, renderer, overrides);
      if (this.options.debug) { console.log('    drawCurrentFrame:         END'); }
    });
  }

  drawFrame(frameNumber: number, renderer:PenciltestRenderer, overrides: PenciltestRendererOptions = {}): PenciltestFrame {
    if (!this.width || !this.height) { return; }
    if (this.options.debug) { console.log('   drawFrame: BEGIN'); }

    const frame = this.scene.frames[frameNumber]
    if (frame?.strokes?.length > 0) {
      renderer.beginPath();
      frame.strokes.forEach((stroke: Stroke) => {
        renderer.composeOptions({
          ...overrides,
          strokeWidth: (stroke.width || this.scene.strokeWidth || 1) * this.zoomFactor
        });
        const scaledStroke = this.scaleStroke(stroke, this.zoomFactor)
        renderer.subpath(scaledStroke.path)
      });
      renderer.endPath();
    }
    if (this.options.debug) { console.log('   drawFrame:       END'); }
    return frame;
  }

  toolMetaTimeoutId:number;
  drawTool(state: {trackPoint?:Point, down?:boolean, metadataTimeout?:number} = {}) {
    const { trackPoint, down: isDown, metadataTimeout } = { trackPoint: this.trackBuffer[0], ...state };
    if (
      typeof trackPoint?.x !== 'number'
      || typeof trackPoint?.y !== 'number'
    ) { return; }
    //console.log({trackPoint, buffer: this.trackBuffer, state}); // XXX

    let toolDiameterSceneSpace,
      outerWidth = 1,
      innerWidth = 2,
      crosshairOuterRadius = 12,
      crosshairInnerRadius = 6,
      innerColor = 'white',
      outerColor = 'black';
    if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
      toolDiameterSceneSpace = this.options.strokeWidth;
      innerWidth = 2;
      innerColor = 'white';
    } else if (this.state.toolStack[0] === PenciltestTool.ERASER) {
      toolDiameterSceneSpace = this.options.eraserWidth;
      innerWidth = 3;
      innerColor = 'red';
    } else if (this.state.toolStack[0] === PenciltestTool.PAN) {
      return;
    }
    const toolScreenRadius = Math.max(0.5, toolDiameterSceneSpace / 2 * this.zoomFactor);
    const innerScreenRadius = Math.max(0.5, toolScreenRadius - innerWidth / 2);
    if (this.options.debug) {
      console.log(`  track:${this.state.toolStack[0]} ⊙ ${toolDiameterSceneSpace}`, {toolScreenRadius, innerScreenRadius, innerWidth, innerColor, outerColor});
    }

    if (metadataTimeout > 0) {
      if (this.toolMetaTimeoutId) {
        clearTimeout(this.toolMetaTimeoutId);
      }
      this.toolMetaTimeoutId = setTimeout(() => {
        this.toolMetaTimeoutId = 0;
        this.drawTool();
      }, metadataTimeout);
    }

    this.toolRenderer.requestRender((renderer, timestamp) => {
      renderer.clear();

      // ID
      if (innerScreenRadius !== toolScreenRadius) {
        renderer.beginPath();
        renderer.circle({center:trackPoint, radius:innerScreenRadius}, {strokeColor: innerColor, strokeWidth: innerWidth});
        renderer.endPath();
      }
      
      // OD
      renderer.beginPath();
      renderer.circle({center:trackPoint, radius:toolScreenRadius}, {strokeColor: outerColor, strokeWidth: outerWidth});
      renderer.endPath();

      // crosshair
      renderer.beginPath({
        lineWidth: 1,
        strokeColor: 'black'
      });
      renderer.moveToPoint(PTSpace.sumPoints(trackPoint, {x:0,y:-crosshairOuterRadius}));
      renderer.lineToPoint(PTSpace.sumPoints(trackPoint, {x:0,y:-crosshairInnerRadius}));
      renderer.moveToPoint(PTSpace.sumPoints(trackPoint, {x:0,y:crosshairOuterRadius}));
      renderer.lineToPoint(PTSpace.sumPoints(trackPoint, {x:0,y:crosshairInnerRadius}));
      renderer.moveToPoint(PTSpace.sumPoints(trackPoint, {x:-crosshairOuterRadius,y:0}));
      renderer.lineToPoint(PTSpace.sumPoints(trackPoint, {x:-crosshairInnerRadius,y:0}));
      renderer.moveToPoint(PTSpace.sumPoints(trackPoint, {x:crosshairOuterRadius,y:0}));
      renderer.lineToPoint(PTSpace.sumPoints(trackPoint, {x:crosshairInnerRadius,y:0}));
      renderer.endPath();

      // metadata text
      if (this.toolMetaTimeoutId > 0) {
        const metadataOutput = `${toolDiameterSceneSpace}px`;
        const metaTextOptions = {
          anchor: PTSpace.sumPoints(trackPoint, {x:Math.max(toolScreenRadius, crosshairOuterRadius) + 8, y:0}),
          fillColor: 'black',
          font: 'bold 14px monospace',
          strokeColor: 'white',
          strokeFirst: true,
          strokeWidth: 3,
        };
        this.toolRenderer.text(metadataOutput, metaTextOptions);
      }
    });
  }

  scaleStroke(stroke: Stroke, factor: number): Stroke {
    return {
      ...stroke,
      // TODO: scale stroke weight, too?
      path: stroke.path.map((point: Mark) => PTSpace.scalePoint(point, factor))
    };
  }

  useTool(toolName: PenciltestTool) {
    const index = this.state.toolStack.indexOf(toolName);
    const isChanging = index !== 0;
    if (this.options.debug) { console.log(`   useTool:${toolName} ${isChanging ? 'CHANGE' : 'SAME'}`); }
    if (isChanging) {
      if (index > -1) {
        this.state.toolStack.splice(index, 1);
      }
      this.state.toolStack.unshift(toolName);
      this.container.setAttribute('x-tool', toolName);
      this.ui.updateStatusBar();
      this.drawTool();
    }
    return isChanging;
  }

  usePreviousTool() {
    this.useTool(this.state.toolStack[1]);
  }

  toggleTool(toolName: PenciltestTool, complementTools:Array<PenciltestTool> = []) {
    const index = this.state.toolStack.indexOf(toolName);
    if (index === 0) {
      if (complementTools.length > 0) {
        this.useTool(complementTools[0]);
      } else {
        this.usePreviousTool();
      }
    } else {
      this.useTool(toolName);
    }
  }

  cancelStroke() {
    this.trackBuffer = [];
    return this.scene.current.strokeNumber = -1;
  }

  lift() {
    //if (this.trackBuffer && this.trackBuffer.length > 0) {
    //  const lastMark = this.trackBuffer.shift()
    //  this.track(lastMark);
    //  this.trackBuffer = [];
    //}
    if (this.state.toolStack[0] === PenciltestTool.PENCIL) {
      this.scene.current.strokeNumber = -1;
    }
    //if (this.state.toolStack[0] === PenciltestTool.ERASER) {
    //  return this.drawCurrentFrame();
    //}
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
        return [ [this.scene.getCurrentFrame()], this.scene.current.frameNumber];
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
      const insertFrameNumber = this.scene.current.frameNumber + 1;
      this.scene.insertFrames(Utils.clone(this.copyBuffer), insertFrameNumber);
      this.ui.updateStatusBar();
    }
  }

  splitFrame(frameNumber:number, splitOffset:number) {
    const frame = this.scene?.frames[frameNumber];
    const oldHold = this.scene.getFrameHold();
    frame.hold = splitOffset;
    const newFrame = Utils.clone(frame);
    newFrame.hold = oldHold - splitOffset;
    this.scene.insertFrames([newFrame], frameNumber + 1);
    this.ui.updateStatusBar();
  }

  pasteStrokes() {
    if (this.copyBuffer?.length > 0 && this.copyBuffer[0].strokes) {
      const currentFrame = this.scene.getCurrentFrame(true);
      if (!("strokes" in currentFrame)) { currentFrame.strokes = []; }
      Array.prototype.push.apply(currentFrame.strokes, Utils.clone(this.copyBuffer[0].strokes));
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
      this.sceneRenderer.clear(true);

      const result = [];
      for (let stroke of oldStrokes) {
        for (let segment of stroke.path) {
          const fieldScalePoint = PTSpace.scalePoint(segment, this.zoomFactor);
          this.track(fieldScalePoint);
        }
        result.push(this.lift());
      }

      this.options.smoothing = smoothingBackup;

      return result;
    };

    if (!amount) {
      amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
      if (!amount) {
        return;
      }
    }
    smooth(amount);
		this.drawCurrentFrame();
  }

  async smoothScene(amount: number = 1) {
    if (await Utils.confirm('Would you like to smooth every frame of this scene?')) {
      if (amount < 1) {
        amount = Number(await Utils.prompt('How much to smooth? 1-5', 2));
        if (!amount) {
          return;
        }
      }
      this.setMode(PenciltestMode.WORKING);
      this.queueWork(() => {
        this.scene.frames.forEach((frame, i) => this.smoothFrame(i, amount))
        this.setPreviousMode();
      });
    }
  }

  undo() {
    if (this.scene.getCurrentFrame().strokes && this.scene.getCurrentFrame().strokes.length) {
      this.redoQueue.push(this.scene.getCurrentFrame().strokes.pop());
      this.hasUnsavedChanges = true;
      return this.drawCurrentFrame();
    }
  }

  redo() {
    if (this.redoQueue && this.redoQueue.length) {
      this.scene.getCurrentFrame().strokes.push(this.redoQueue.pop());
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

  newScene(options:PenciltestSceneData = {}) {
    this.scene = new PenciltestScene({ ...this.options, ...options });
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

  getStoredData(namespace: string, name: string): [ any, Dictionary ] {
    const context = { errorMessage: '' };
    const storageName = this.encodeStorageReference(namespace, name);
    try {
      return [ JSON.parse(globalThis.localStorage.getItem(storageName)), context ];
    } catch(e) {
      console.error(e);
      context.errorMessage = `Failed to parse stored data at name '${storageName}'.`
      return [ null, context ];
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
    let sceneToStore = this.scene;
    try {
      sceneToStore = await this.migrator.packScene(this.scene);
    } catch(e) {
      console.error(e);
    }
    if (sceneToStore && this.putStoredData('scene', sceneName, sceneToStore)) {
      this.hasUnsavedChanges = false;
      return true;
    }
    return false;
  }

  async setScene(sceneData: PenciltestSceneData): Promise<[ PenciltestScene, Dictionary ]> {
    const context:Dictionary = {};
    try {
      this.migrator
        .unpackScene(sceneData)
        .then(async (unpackedSceneData) => {
          const [ migratedSceneData, migrationContext ] = await this.migrator.migrateScene(unpackedSceneData, this.state.version);
          Object.assign(context, migrationContext);
          this.scene = new PenciltestScene(migratedSceneData);
        });
    } catch(e) {
      console.error(e);
      context.errorMessage = e.message;
      this.scene = new PenciltestScene(sceneData);
    }

    if (this.scene.audio?.url) {
      this.loadAudio(this.scene.audio.url, this.scene.audio.info);
    } else {
      this.destroyAudio();
    }

    if (this.sceneRenderer) {
      if (this.scene.background) { this.sceneRenderer.options.background = this.scene.background; }
      //if (this.scene.strokeColor) { this.sceneRenderer.options.strokeColor = this.scene.strokeColor; }
      //if (this.scene.strokeOpacity) { this.sceneRenderer.options.strokeOpacity = this.scene.strokeOpacity; }
      //if (this.scene.strokeWidth) { this.sceneRenderer.options.strokeWidth = this.scene.strokeWidth; }
    }
    this.scene.updateState();
    this.goToFrame(this.scene.current.frameNumber || 0);
    this.hasUnsavedChanges = false;
    this.resize();
    return [ this.scene, context ];
  }

  async loadScene(sceneName:string): Promise<[ PenciltestScene | boolean, Dictionary ]> {
    const [ storedScene, storageContext ] = this.getStoredData('scene', sceneName);
    if (!storedScene) { return [ false, storageContext ]; }
    const [ scene, sceneContext ] = await this.setScene(storedScene);
    return [ scene, { ...storageContext, ...sceneContext } ];
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
      console.error('audio file error', e);
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
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
    if (this.playback.scrubAudioId) {
      clearTimeout(this.playback.scrubAudioId);
    }
  }

  playAudio() {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play();
    }
  }

  seekAudio(time: number) {
    if (this.audioElement) { return ( this.audioElement.currentTime = time ); }
  }

  scrubAudio(exposureOffset:number = 0) {
    // If negative, plays that many exposures at the end of the current frame hold.
    // This is useful for quickly previewing frame hold changes relative to audio.
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
      this.scene.current.singleFrameDuration * (frameExposures - exposureOffset)
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
    const bounds:Rect = this.forceDimensions || {
      width: this.container.offsetWidth,
      height: this.container.offsetHeight,
    };
    if (this.options.showStatus && !this.forceDimensions) {
      const toolbarElement = this.ui.components.toolbar.getElement();
      const toolbarHeight = toolbarElement.offsetHeight
      if (toolbarHeight) {
        bounds.height -= toolbarHeight;
      }
    }
    const boundsAspect = bounds.width / bounds.height;
    const sceneDimensions = this.scene.getDimensions();

    if (boundsAspect > sceneDimensions.aspect) {
      this.width = Math.floor(bounds.height * sceneDimensions.aspect);
      this.height = bounds.height;
    } else {
      this.width = bounds.width;
      this.height = Math.floor(bounds.width / sceneDimensions.aspect);
    }

    this.fieldElement.style.width = `${this.width}px`;
    this.fieldElement.style.height = `${this.height}px`;
    this.sceneRenderer.resize(this.width, this.height);
    this.toolRenderer.resize(this.width, this.height);
    this.zoomFactor = this.height / sceneDimensions.height;
    //this.sceneRenderer.options.strokeWidth = this.zoomFactor * this.scene.strokeWidth;
    //this.toolRenderer.options.strokeWidth = this.zoomFactor * this.scene.strokeWidth;
    this.drawCurrentFrame();
    this.drawTool();
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
