type comparisonTrinary = -1 | 0 | 1; // Like A - B, i.e. -1: A < B | 0: A == B | 1: A > B

interface PenciltestSceneMunger {
  version:string;
  packScene?:Function;
  unpackScene?:Function;
};

interface PenciltestMigrationInterface {
  fromVersion:string;
  toVersion:string;
  migrateScene?:(scene:any) => any;
  migrateStorage?:(name:string, get:Function) => any;
  migrateApp?:(controller:Penciltest) => any;
};

interface PenciltestMigrationMetadata {
  json?:boolean;
  retrieved?:boolean;
};

class PenciltestMigrationBase implements PenciltestMigrationInterface {
  fromVersion:string = '0.0.0';
  toVersion:string = '0.0.0';
}

class PTMigration_v0_to_v0_0_4 extends PenciltestMigrationBase {
  static fromVersion = '0.0.0';
  static toVersion = '0.0.4';
  constructor() {
    super();
    this.fromVersion = '0.0.0';
    this.toVersion = '0.0.4';
  }

  migrateScene(film:any) {
    // change strokes from Raphael SVG format to simple arrays
    for (let frameIndex = 0; frameIndex < film.frames.length; frameIndex++) {
      const frame = film.frames[frameIndex];
      for (let strokeIndex = 0; strokeIndex < frame.strokes.length; strokeIndex++) {
        const stroke = frame.strokes[strokeIndex];
        for (let segmentIndex = 0; segmentIndex < stroke.length; segmentIndex++) {
          const segment = stroke[segmentIndex];
          if (typeof segment === 'string') {
            const newSegment = segment.replace(/[ML]/g, '').split(' ').map(Number);
            if (newSegment.length !== 2) {
              throw new Error(`bad stroke segment '${segment}': f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
            }
            if (isNaN(newSegment[0]) || isNaN(newSegment[1])) {
              throw new Error(`NaN stroke segment '${segment}':  f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
            }
            for (let i = 0, end = newSegment.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) { newSegment[i] = Number(newSegment[i]); }
            film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment;
          }
        }
      }
    }
    return film;
  }

  migrateStorage(name:string, get:Function) {
    if (!/^film:/.test(name)) { return null; }
    const film = get();
    if (!film || !film.frames || !film.frames.length) { return null; }
    return this.migrateScene(film);
  }
};

class PTMigration_v0_2_0_to_v0_3_0 extends PenciltestMigrationBase {
  constructor() {
    super();
    this.fromVersion = '0.2.0';
    this.toVersion = '0.3.0';
  }
  migrateScene(scene:any) {
    // BEGIN: `aspect` is a number, and `aspectRatio` is a string.
    if (typeof scene?.aspect === 'string' && typeof scene?.aspectRatio !== 'string') {
      scene.aspectRatio = scene.aspect;
      delete scene.aspect;
    }
    // BEGIN: `stroke` has other properties, so points moved to `.path[]`.
    if (Array.isArray(scene?.frames)) {
      scene?.frames.forEach((frame) => {
        if (!Array.isArray(frame.strokes)) { return; };

        frame.strokes = frame.strokes.map((stroke) => {
          if (!Array.isArray(stroke)) { return {old:stroke}; }

          return {
            path: stroke.map((coords) => {
              const point:any = {
                x:coords[0],
                y:coords[1]
              };
              if (coords.length === 3) {
                if (coords[2] && (!Array.isArray(coords[2]) || coords[2].length > 0)) {
                  point.etc = coords[2];
                }
              } else if (coords.length > 3) {
                point.etc = coords.slice(2);
              }
              return point;
            })
          };
        });
      });
    }
    // BEGIN: All times recorded in milliseconds.
    if (scene?.audio?.offset) {
      scene.audio.offset *= 1000;
    }
    if (scene?.current?.duration) {
      scene.current.duration *= 1000;
    }
    if (scene?.current?.singleFrameDuration) {
      scene.current.singleFrameDuration *= 1000;
    }

    return scene;
  }
};

class PTMigration_v0_3_0_to_v0_3_1 extends PenciltestMigrationBase {
  constructor() {
    super();
    this.fromVersion = '0.3.0';
    this.toVersion = '0.3.1';
  }
  migrateApp(controller:any) {
    // BEGIN: onion skin opacity is part of the color, and so configurable separately forward and backward.
    const onionSkinOpacity = controller.options.onionSkinOpacity;
    controller.options.onionSkinForwardColor = [0, 200, 50, onionSkinOpacity];
    controller.options.onionSkinBackwardColor = [220, 0, 0, onionSkinOpacity];
    delete controller.options.onionSkinOpacity;
  }
  migrateScene(scene:any) {
    // BEGIN: `line-` prefix changed to `stroke-`
    Object.assign(scene.options, {
      strokeColor: scene.options.lineColor,
      strokeWeight: scene.options.lineWeight,
      strokeOpacity: scene.options.lineOpacity,
      strokeCorner: scene.options.lineCorner,
    });
    delete scene.options.lineColor;
    delete scene.options.lineWeight;
    delete scene.options.lineOpacity;
    delete scene.options.lineCorner;

    return scene;
  }
};

class PTMunger_V0_3_0 implements PenciltestSceneMunger {
  version:string;
  packSeparators: {stroke:string, point:string, coord:string};

  constructor() {
    this.version = '0.3.0';

    this.packSeparators = {
      stroke: "|",
      point: ';',
      coord: ','
    };
  }

  packNumber(value:number): string {
    return Utils.toDecimal(value, 2) as string;
  }

  unpackNumber(value:string): number {
    return Number(value);
  }

  packPoint(point:Point): string {
    return `${this.packNumber(point.x)}${this.packSeparators.coord}${this.packNumber(point.y)}`;
  }

  unpackPoint(packedPoint) {
    const coords = packedPoint.split(this.packSeparators.coord).map(this.unpackNumber.bind(this));
    return {x:coords[0], y:coords[1]};
  }

  packStroke(stroke:Stroke, scene:PenciltestScene): string {
    const packedStrokeObject = { ...stroke };
    delete packedStrokeObject.path;
    let packedStrokeString = stroke.path
      .map(this.packPoint.bind(this))
      .join(this.packSeparators.point);
    if (Object.keys(packedStrokeObject).length > 0) {
      packedStrokeString += JSON.stringify(packedStrokeObject);
    }
    return packedStrokeString;
  }

  unpackStroke(packedStroke:string): Stroke {
    const jsonIndex = packedStroke.indexOf('{');
    const stroke:Stroke = {} as Stroke;
    if (jsonIndex !== -1) {
      try {
        Object.assign(stroke, JSON.parse(packedStroke.slice(jsonIndex)))
      } catch(e) {
        console.error(e);
      }
    }
    stroke.path = (jsonIndex > -1 ? packedStroke.substr(0, jsonIndex) : packedStroke)
      .split(this.packSeparators.point)
      .map(this.unpackPoint.bind(this));
    return stroke;
  }

  packFrame(frame:PenciltestFrame, scene:PenciltestScene): PenciltestFrame {
    const packedFrame:PenciltestFrame = {
      ...frame,
    };
    if (frame.strokes?.length > 0) {
      packedFrame.packedStrokes = frame.strokes
        .map((stroke) => this.packStroke(stroke, scene))
        .join(this.packSeparators.stroke);
    }
    if (packedFrame.hold === scene.frameHold) {
      delete packedFrame.hold;
    }
    delete packedFrame.strokes;
    return packedFrame;
  }

  unpackFrame(frame:PenciltestFrame, scene:PenciltestSceneData): PenciltestFrame {
    if (!frame.packedStrokes?.length) { return frame; }

    const unpackedFrame:PenciltestFrame = {
      hold: scene.frameHold,
      ...frame,
      strokes: frame.packedStrokes
        .split(this.packSeparators.stroke)
        .map(this.unpackStroke.bind(this))
    };
    delete unpackedFrame.packedStrokes;
    return unpackedFrame;
  }

  packScene(scene:PenciltestScene): PenciltestSceneData {
    const packedScene:PenciltestSceneData = {
      ...scene,
      frames: scene.frames.map((frame) => this.packFrame(frame, scene))
    };
    return packedScene;
  }

  unpackScene(packedScene:PenciltestSceneData): PenciltestSceneData {
    const scene = new PenciltestScene(packedScene);
    scene.frames = scene.frames.map((frame) => this.unpackFrame(frame, scene));
    return scene;
  }
};

interface SceneAnalysis {
  // descending order
  colorCount?:{[key:ColorHex | string]:number};
  colors?:Array<ColorHex | string>;
  widthCount?:{[key:string]:number};
  widths?:Array<string>;
};
class PTMunger_V0_3_1 extends PTMunger_V0_3_0 {
  packedScale:number;
  analysis:SceneAnalysis

  constructor() {
    super();
    this.version = '0.3.1';
    this.packedScale = 100;
  }

  analyzeScene(scene:PenciltestScene): SceneAnalysis {
    const analysis:SceneAnalysis = {
      colorCount: {},
      widthCount:{},
    };

    const sceneStrokeWidth = scene.strokeWidth || 1;
    const sceneStrokeColor = Utils.getColorString(
      scene.strokeColor || ColorHexNames.black,
      scene.strokeOpacity || -1
    );
    if (!(sceneStrokeColor in analysis.colorCount)) {
      analysis.colorCount[sceneStrokeColor] = 0;
    }
    analysis.colorCount[sceneStrokeColor]++;

    scene.frames.forEach((frame) => {
      frame.strokes.forEach((stroke) => {
        const strokeWidth = "width" in stroke
          ? stroke.width
          : sceneStrokeWidth;
        const widthString = String(strokeWidth);
        if (!(widthString in analysis.widthCount)) {
          analysis.widthCount[widthString] = 0;
        }
        analysis.widthCount[widthString]++;

        const colorString = Utils.getColorString(stroke.strokeColor) || sceneStrokeColor;
        // Sounds redundant, but a stroke COULD also have a fill color.
        if (!(colorString in analysis.colorCount)) {
          analysis.colorCount[colorString] = 0;
        }
        analysis.colorCount[colorString]++;
      });
    });

    analysis.colors = Object.keys(analysis.colorCount)
      .filter((key) => analysis.colorCount[key] !== 1) // omit singletons
      .sort((a,b) => analysis.colorCount[b] - analysis.colorCount[a]) // descending

    analysis.widths = Object.keys(analysis.widthCount)
      .filter((key) => analysis.widthCount[key] !== 1) // omit singletons
      .sort((a,b) => analysis.widthCount[b] - analysis.widthCount[a]) // descending

    return analysis;
  }

  packScene(scene:PenciltestScene): PenciltestSceneData {
    this.analysis = this.analyzeScene(scene);
    const packedScene:any = super.packScene(scene);
    packedScene.pack = {
      scale: this.packedScale,
    }
    packedScene.strokeWidth = Number(this.analysis.widths[0]);
    packedScene.strokeColor = this.analysis.colors[0];
    return packedScene;
  }

  unpackScene(packedScene:PenciltestSceneData): PenciltestSceneData {
    if ("pack" in packedScene) {
      this.packedScale = packedScene.pack.scale;
      this.analysis = {
        colors: packedScene.pack.colors || [],
      }
    }
    const sceneData = super.unpackScene(packedScene);
    return sceneData;
  }

  packStroke(stroke:Stroke, scene:PenciltestScene): string {
    const packedStrokeObject = { ...stroke };

    if (!("width" in packedStrokeObject)) {
      packedStrokeObject.width = scene.strokeWidth;
    }
    if (String(packedStrokeObject.width) === this.analysis.widths[0]) {
      delete packedStrokeObject.width
    }

    if (!("strokeColor" in packedStrokeObject)) {
      packedStrokeObject.strokeColor = scene.strokeColor || ColorHexNames.black;
    }
    if (packedStrokeObject.strokeColor === this.analysis.colors[0]) {
      delete packedStrokeObject.strokeColor
    }

    return super.packStroke(packedStrokeObject, scene);
  }

  unpackStroke(packedStroke:string): Stroke {
    const jsonIndex = packedStroke.indexOf('{');
    const stroke:Stroke = {} as Stroke;
    if (jsonIndex !== -1) {
      try {
        Object.assign(stroke, JSON.parse(packedStroke.slice(jsonIndex)))
      } catch(e) {
        console.error(e);
      }
    }
    stroke.path = (jsonIndex > -1 ? packedStroke.substr(0, jsonIndex) : packedStroke)
      .split(this.packSeparators.point)
      .map(this.unpackPoint.bind(this));
    return stroke;
  }

  packPoint(point:Mark): string {
    const coords = [point.x, point.y].map(this.packNumber.bind(this));
    if ("weight" in point && point.weight !== 1) {
      coords.push('w' + this.packNumber(point.weight));
    }
    return coords.join(this.packSeparators.coord);
  }

  unpackPoint(packedPoint) {
    const coords = packedPoint.split(this.packSeparators.coord)
    const mark:Mark = {
      x: this.unpackNumber(coords[0]),
      y: this.unpackNumber(coords[1]),
    };
    if (coords[2] && coords[2][0] === 'w') {
      mark.weight = this.unpackNumber(coords[2].substr(1))
    }
    return mark;
  }

  packNumber(value:number): string {
    return String(Math.floor(value * this.packedScale));
  }

  unpackNumber(value:string): number {
    return Number(value) / this.packedScale;
  }
};

class PTMigration_debug extends PenciltestMigrationBase {
  constructor() {
    super();
    this.fromVersion = Penciltest.version;
    this.toVersion = Penciltest.debugVersion;
  }
  migrateScene(scene:any) { return scene; }
};

class PenciltestMigrator {

  mungers:Array<PenciltestSceneMunger>
  migrations:Array<PenciltestMigrationInterface>

  constructor() {
    this.mungers = [
      new PTMunger_V0_3_0(),
      new PTMunger_V0_3_1(),
    ];

    this.migrations = [
      new PTMigration_v0_to_v0_0_4(),
      // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
      new PTMigration_v0_2_0_to_v0_3_0(),
      new PTMigration_v0_3_0_to_v0_3_1(),
      new PTMigration_debug()
    ];
  }

  compareVersions(va: string, vb:string): comparisonTrinary {
    const prepVersionParts = (version:string) => version
        .split('.')
        .slice(0,3)
        .map((x) => isNaN(Number(x)) ? 0 : Number(x));
    const vaParts = prepVersionParts(va);
    const vbParts = prepVersionParts(vb);
    return vaParts.reduce((diff: comparisonTrinary, xa, i) => {
      const xb = vbParts[i];
      if (diff !== 0) { return diff; }
      if (xa === xb) { return 0 as comparisonTrinary; }
      if (xa > xb) { return 1 as comparisonTrinary; }
      if (xa < xb) { return -1 as comparisonTrinary; }
    }, 0) as comparisonTrinary;
  }

  static filterByMethods(methodNames:Array<string>): (value: PenciltestMigrationInterface, index: number, array: PenciltestMigrationInterface[]) => boolean {
    return (migration:PenciltestMigrationInterface) => {
      for (let methodName of methodNames) {
        if (typeof migration[methodName] !== 'function') {
          return false;
        }
      }
      return true;
    };
  }

  getSceneVersion(sceneData:any): string {
    return sceneData.instrument?.version || sceneData.version;
  }

  getMigrationsByVersion(srcVersion:string, targetVersion:string): Array<PenciltestMigrationInterface> {
    let start:number = -Infinity, end:number = Infinity;
    this.migrations.forEach((migration, i) => {
      const srcVsMigrationFrom = this.compareVersions(srcVersion, migration.fromVersion);
      const targetVsMigrationFrom = this.compareVersions(targetVersion, migration.fromVersion);
      const srcVsMigrationTo = this.compareVersions(srcVersion, migration.toVersion);
      const targetVsMigrationTo = this.compareVersions(targetVersion, migration.toVersion);

      if (srcVsMigrationTo > -1) { return; } // migration's output is older than src
      if (targetVsMigrationTo === -1) { return; } // migration's output is newer than targer

      if (srcVsMigrationFrom != -1) { // migration's input is not newer than src
        start = i;
      }
      end = i;
    });
    if (start === -Infinity || end === Infinity) { return []; }
    return this.migrations.slice(start, end + 1); // Include end index in slice.
  }

  getMunger(sceneData:any): PenciltestSceneMunger | null {
    const sceneDataVersion = this.getSceneVersion(sceneData);
    for (let i = this.mungers.length - 1; i >= 0; i--) {
      const mungerIsTooNew = this.compareVersions(sceneDataVersion, this.mungers[i].version) === -1
      if (!mungerIsTooNew) {
        // munger version is not newer than scene version
        return this.mungers[i];
      }
    }
    return null;
  }

  async packScene(scene:PenciltestScene): Promise<PenciltestScene> {
    return new Promise((resolve, reject) => {
      try {
        const munger = this.getMunger(scene);
        if (typeof munger?.packScene === 'function') {
          try {
            const packedScene = munger.packScene(Utils.clone(scene));
            if (packedScene.current?.frames) {
              delete packedScene.current.frames;
            }
            if (packedScene.current?.singleFrameDuration) {
              packedScene.current.singleFrameDuration = Utils.toDecimal(packedScene.current.singleFrameDuration, 3);
            }
            if (packedScene.current?.duration) {
              packedScene.current.duration = Utils.toDecimal(packedScene.current.duration, 3);
            }
            resolve(packedScene);
            return;
          } catch(e) {
            console.error(e);
            reject(`Error packing scene: ${e.message}`);
          }
        } else {
          console.warn(`No packScene method found for scene version ${scene.instrument.version}.`);
        }
      } catch(e) {
        console.error(e);
      }
      resolve(scene);
    });
  }

  async unpackScene(packedScene:PenciltestSceneData): Promise<PenciltestSceneData> {
    return new Promise((resolve, reject) => {
      const munger = this.getMunger(packedScene);
      if (typeof munger?.unpackScene === 'function') {
        try {
          resolve(munger.unpackScene(packedScene));
          return;
        } catch(e) {
          console.error(e);
        }
      }
      resolve(packedScene);
    });
  }

  async migrateScene(startingSceneData:any, untilVersion:string = ''): Promise<[ PenciltestScene, Dictionary ]> {
    let startingVersion:string = this.getSceneVersion(startingSceneData)
    if (!untilVersion) {
      untilVersion = Penciltest.version;
    }
    const context = { fromVersion: startingVersion, toVersion: startingVersion, errorMessage: '' };
    const scene:any = this.getMigrationsByVersion(startingVersion, untilVersion)
      .filter(PenciltestMigrator.filterByMethods(['migrateScene']))
      .reduce((scene, migration) => {
        try {
          const migratedScene = migration.migrateScene(scene);
          if (!("instrument" in migratedScene)) { migratedScene.instrument = {}; }
          migratedScene.instrument.version = migration.toVersion;
          context.toVersion = migration.toVersion;
          return migratedScene;
        } catch (e) {
          console.error(e);
          context.errorMessage = e.message;
        }
        return scene;
      }, startingSceneData);
    return [ scene, context ];
  }

  migrateStorage(untilVersion:string = '') {
    if (!untilVersion) {
      untilVersion = Penciltest.version;
    }

    const migrations = this.getMigrationsByVersion('0.0.0', untilVersion)
      .filter(PenciltestMigrator.filterByMethods(['migrateStorage']));

    const makeStorageGetter = (storageName:string, data:any, is:PenciltestMigrationMetadata) => {
      return () => {
        if (!is.retrieved && data === null) {
          data = globalThis.localStorage.getItem(storageName);
          is.retrieved = true;
          try {
            data = JSON.parse(data);
            is.json = true;
          } catch(ignore) {}
        }
        return data;
      };
    };

    for (let storageName in globalThis.localStorage) {
      const is:PenciltestMigrationMetadata = {};
      const migratedData = migrations.reduce((data, migration) => {
        const get = makeStorageGetter(storageName, data, is);
        const result = migration.migrateStorage(storageName, get);
        if (result === null) {
          return data;
        }
        return result;
      }, null);

      if (migratedData !== null) {
        globalThis.localStorage.setItem(
          storageName,
          typeof migratedData === 'string' && !is.json
            ? migratedData
            : JSON.stringify(migratedData)
        )
      }
    }
  }

}
