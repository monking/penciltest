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
  //migrateState?:(appState:any) => any;
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

  packCoord(coord:number):string {
    return Utils.toDecimal(coord, 2, {string:true}) as string;
  }

  unpackCoord(coord:string):number {
    return Number(coord);
  }

  packPoint(point:Point):string {
    return `${this.packCoord(point.x)}${this.packSeparators.coord}${this.packCoord(point.y)}`;
  }

  unpackPoint(packedPoint) {
    const coords = packedPoint.split(this.packSeparators.coord).map(this.unpackCoord.bind(this));
    return {x:coords[0], y:coords[1]};
  }

  packStroke(stroke:Stroke, scene:PenciltestScene):string {
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

  unpackStroke(packedStroke:string):Stroke {
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

  packFrame(frame:PenciltestFrame, scene:PenciltestScene):PenciltestFrame {
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

  unpackFrame(frame:PenciltestFrame, scene:PenciltestSceneData):PenciltestFrame {
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

  packScene(scene:PenciltestScene):PenciltestSceneData {
    const packedScene:PenciltestSceneData = {
      ...scene,
      frames: scene.frames.map((frame) => this.packFrame(frame, scene))
    };
    return packedScene;
  }

  unpackScene(packedScene:PenciltestSceneData):PenciltestSceneData {
    const scene = new PenciltestScene(packedScene);
    scene.frames = scene.frames.map((frame) => this.unpackFrame(frame, scene));
    return scene;
  }
};

class PTMunger_V0_3_1 extends PTMunger_V0_3_0 {
  packedScale:number;

  constructor() {
    super();
    this.version = '0.3.1';
    this.packedScale = 100;
  }

  packScene(scene:PenciltestScene):PenciltestSceneData {
    const packedScene:any = super.packScene(scene);
    packedScene.packedScale = this.packedScale;
    return packedScene;
  }

  unpackScene(packedScene:PenciltestSceneData):PenciltestSceneData {
    if ("packedScale" in packedScene) {
      this.packedScale = packedScene.packedScale;
      delete packedScene.packedScale;
    }
    const sceneData = super.unpackScene(packedScene);
    return sceneData;
  }

  packCoord(coord:number):string {
    return Utils.toDecimal(coord * this.packedScale, 0, {string:true}) as string;
  }

  unpackCoord(coord:string):number {
    return Number(coord) / this.packedScale;
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
      //new PTMunger_V0_3_1(), // not ready yet to test this iteration of pack/unpack
    ];

    this.migrations = [
      new PTMigration_v0_to_v0_0_4(),
      // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
      new PTMigration_v0_2_0_to_v0_3_0(),
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

  static filterByMethods(methodNames:Array<string>):(value: PenciltestMigrationInterface, index: number, array: PenciltestMigrationInterface[]) => boolean {
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

  getMigrationsByVersion(fromVersion:string, toVersion:string):Array<PenciltestMigrationInterface> {
    let start:number = -Infinity, end:number = Infinity;
    this.migrations.forEach((migration, i) => {
      if (this.compareVersions(fromVersion, migration.fromVersion) != -1) {
        start = i;
      }
      if (start > -Infinity && this.compareVersions(toVersion, migration.toVersion) != 1) {
        end = i;
      }
    });
    return this.migrations.slice(start, end + 1); // Include end index in slice.
  }

  getMunger(sceneData:any):PenciltestSceneMunger | null {
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
