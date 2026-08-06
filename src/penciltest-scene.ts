class SceneState implements PenciltestSceneState {
  constructor(overrides: PenciltestSceneState = {}) {
    Object.assign(this, {
      frames: [],
      exposureCount: 0,
      exposureNumber: 0,
      frameNumber: 0,
      strokeNumber: -1,
      ...overrides
    });
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
    this.height = 1024;
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

    if (this.frames.length === 0) {
      this.newFrame();
    }

    if (!this.uuid) {
      if (typeof crypto !== 'undefined' && crypto !== null) {
        crypto.randomUUID();
      }
    }

    this.updateState();
  }

  getDimensions(): Bounds {
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
    Object.assign(this.current, dimensions);
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
    return Math.max(1, this.frames[frameNumber]?.hold || this.frameHold);
  }

  setFrameHold(frameHold:number = 1, frameNumber:number = -1) {
    if (frameNumber === -1) {
      frameNumber = this.current.frameNumber;
    }
    this.frames[frameNumber].hold = Math.max(1, frameHold);
  }

  setVolume(volume:number, relative:boolean = false) {
    if (typeof this.audio?.volume !== 'number') {
      if (!this.audio) { this.audio = {}; }
      this.audio.volume = 100;
    }

    const newVolume = relative ? volume + this.audio.volume : volume;
    this.audio.volume = Math.max(0, Math.min(100, newVolume));
  }

  newFrame(insertAtIndex:number = -1, count:number = 1, options:PenciltestFrame = {}): Array<PenciltestFrame> {
    const newFrames = []
    for (let i = 0; i < count; i++) {
      const frame:PenciltestFrame = {
        hold: this.getFrameHold(),
        strokes: [],
        ...options
      };
      newFrames.push(frame);
    }
    if (insertAtIndex === -1) {
      insertAtIndex = this.frames.length;
    }
    Array.prototype.splice.apply(this.frames, [insertAtIndex, 0].concat(newFrames));

    this.updateState();

    return newFrames;
  }

  getCurrentFrame(makeIfEmpty = false): PenciltestFrame {
    if (makeIfEmpty) {
      if (this.frames.length === 0) {
        this.current.frameNumber = 0;
        return this.newFrame()[0];
      }
    }
    return this.frames[this.current.frameNumber || 0];
  }

  getCurrentStroke(makeNewIfEmpty:boolean = false): Stroke {
    const frame = this.getCurrentFrame(makeNewIfEmpty);
    const isNewStroke = this.current.strokeNumber === -1;
    if (isNewStroke || makeNewIfEmpty) {
      if (!("strokes" in frame)) {
        frame.strokes = []
      }
      if (isNewStroke || (makeNewIfEmpty && frame.strokes.length === 0)) {
        this.current.strokeNumber = frame.strokes.length;
        const stroke = {path: []} as Stroke;
        frame.strokes.push(stroke);
        return stroke;
      }
    }
    if (!frame?.strokes) { throw new Error('Missing strokes on current frame in scene.'); }
    return frame.strokes[this.current.strokeNumber > -1 ? this.current.strokeNumber : frame.strokes.length - 1];
  }

}
