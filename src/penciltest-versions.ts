type comparisonTrinary = -1 | 0 | 1;

interface PenciltestVersionMunger {
  version:string;
  migrate?:Function;
  packScene?:Function;
  unpackScene?:Function;
  packSeparators?:{stroke:string, point:string, coord:string};
};

const PenciltestVersionMungerV0_0_4 = {
  version:'0.0.4',
  migrate(this:Penciltest) {
    // change strokes from Raphael SVG format to simple arrays
    const filmNamePattern = /^film:/;
    return (() => {
      const result = [];
      for (let storageName in globalThis.localStorage) {
        if (filmNamePattern.test(storageName)) {
          const film = JSON.parse(globalThis.localStorage.getItem(storageName));
          if (!film || !film.frames || !film.frames.length) { continue; }

          for (let frameIndex = 0; frameIndex < film.frames.length; frameIndex++) {
            const frame = film.frames[frameIndex];
            for (let strokeIndex = 0; strokeIndex < frame.strokes.length; strokeIndex++) {
              const stroke = frame.strokes[strokeIndex];
              for (let segmentIndex = 0; segmentIndex < stroke.length; segmentIndex++) {
                const segment = stroke[segmentIndex];
                if (typeof segment === 'string') {
                  const newSegment = segment.replace(/[ML]/g, '').split(' ').map(Number);
                  if (newSegment.length !== 2) {
                    throw new Error(`bad stroke segment '${segment}': ${storageName}:f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                  }
                  if (isNaN(newSegment[0]) || isNaN(newSegment[1])) {
                    throw new Error(`NaN stroke segment '${segment}':  ${storageName}:f${frameIndex}:p${strokeIndex}:s${segmentIndex}`);
                  }
                  for (let i = 0, end = newSegment.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) { newSegment[i] = Number(newSegment[i]); }
                  film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment;
                }
              }
            }
          }

          film.version = '0.0.4';
          result.push(globalThis.localStorage.setItem(storageName, JSON.stringify(film)));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
};

const PenciltestVersionMungerV0_0_5 = {
  version:'0.0.5',
  migrate(this:Penciltest) {
    // enable scaling, assuming 16:9, 720 width for undefined
    const filmNamePattern = /^film:/;
    return (() => {
      const result = [];
      for (let storageName in globalThis.localStorage) {
        if (filmNamePattern.test(storageName)) {
          const film = JSON.parse(globalThis.localStorage.getItem(storageName));
          if (!film || !film.frames || !film.frames.length) { continue; }

          if (film.aspect == null) { film.aspect = '16:9'; }
          if (film.width == null) { film.width = 720; }
          film.version = '0.0.5';
          result.push(globalThis.localStorage.setItem(storageName, JSON.stringify(film)));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
};

const PenciltestVersionMungerV0_3_0 = {
  version:'0.3.0',
  migrate(this:Penciltest) {
    const scene = (this?.scene) as any;
    // BEGIN: `aspect` is a number, and `aspectRatio` is a string.
    if (typeof scene?.aspect === 'string' && typeof scene?.aspectRatio !== 'string') {
      scene.aspectRatio = scene.aspect;
      delete scene.aspect;
    }
    // BEGIN: `stroke` has other properties, so points moved to `.path[]`.
    if (Array.isArray(scene?.frames)) {
      scene?.frames.forEach((frame) => {
        if (Array.isArray(frame.strokes)) {
          frame.strokes = frame.strokes.map((stroke) => {
            if (Array.isArray(stroke)) {
              return {path:stroke.map((coords) => { return {x:coords[0],y:coords[1]}; })};
            }
            return stroke; // 🤷
          });
        }
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
  },
  packSeparators: {
    stroke: "|",
    point: ';',
    coord: ','
  },
  packScene(scene:PenciltestScene):PenciltestSceneData {
    const packStroke = (stroke:Stroke, scene:PenciltestScene):string => {
      const packedStrokeObject = { ...stroke };
      delete packedStrokeObject.path
      let packedStrokeString = stroke.path
        .map((point) => {
          return Utils.getDecimal(point.x, 2) + this.packSeparators.coord + Utils.getDecimal(point.y, 2) 
        })
        .join(this.packSeparators.point)
      if (Object.keys(packedStrokeObject).length > 0) {
        packedStrokeString += JSON.stringify(packedStrokeObject);
      }
      return packedStrokeString;
    };

    const packFrame = (frame:PenciltestFrame, scene:PenciltestScene):PenciltestFrame => {
      const packedFrame:PenciltestFrame = {
        ...frame,
      };
      if (frame.strokes?.length > 0) {
        packedFrame.packedStrokes = frame.strokes
          .map((stroke) => packStroke(stroke, scene))
          .join(this.packSeparators.stroke);
      }
      if (packedFrame.hold === scene.frameHold) {
        delete packedFrame.hold;
      }
      delete packedFrame.strokes;
      return packedFrame;
    };

    const packedScene:PenciltestSceneData = {
      ...scene,
      frames: scene.frames.map((frame) => packFrame(frame, scene))
    };
    return packedScene;
  },
  unpackScene(packedScene:PenciltestSceneData):PenciltestScene {
    const unpackStroke = (packedStroke:string):Stroke => {
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
        .map((packedPoint) => {
          const coords = packedPoint.split(this.packSeparators.coord).map(Number);
          return {x:coords[0], y:coords[1]};
        });
      return stroke;
    };

    const unpackFrame = (frame:PenciltestFrame, scene:PenciltestSceneData):PenciltestFrame => {
      if (!frame.packedStrokes?.length) { return frame; }

      const unpackedFrame:PenciltestFrame = {
        hold: scene.frameHold,
        ...frame,
        strokes: frame.packedStrokes
          .split(this.packSeparators.stroke)
          .map((stroke) => unpackStroke(stroke))
      };
      delete unpackedFrame.packedStrokes;
      return unpackedFrame;
    };

    const scene = new PenciltestScene(packedScene);
    scene.frames = scene.frames.map((frame) => unpackFrame(frame, scene));

    return scene;
  }
};

// e.g.
//const PenciltestVersionMungerVNEXT = {
//  ...PenciltestVersionMungerVPREV,
//  migrate(this:Penciltest) {},
//  pack(scene:PenciltestScene) {},
//  unpack(scene:PenciltestScene) {}
//};

class PenciltestVersions {

  static mungers:Array<PenciltestVersionMunger> = [
    PenciltestVersionMungerV0_0_4,
    PenciltestVersionMungerV0_0_5,
    // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
    PenciltestVersionMungerV0_3_0,
  ];

  static compareVersions(va: string, vb:string): comparisonTrinary {
    const vaParts = va.split('.').map(Number);
    const vbParts = vb.split('.').map(Number);
    return vaParts.reduce((diff: comparisonTrinary, vx, i) => {
      if (diff !== 0) { return diff; }
      if (vx === vbParts[i]) { return 0 as comparisonTrinary; }
      if (vx > vbParts[i]) { return 1 as comparisonTrinary; }
      if (vx < vbParts[i]) { return -1 as comparisonTrinary; }
    }, 0) as comparisonTrinary;
  }

  static async migrate(controller: Penciltest, fromVersion: string, toVersion: string) {
    let atVersion = fromVersion;
    const confirmMessage = `Migrate scene data from v${fromVersion} to v${toVersion}?`;
    if (await Utils.confirm(confirmMessage)) {
      try {
        const result = PenciltestVersions.mungers.reduce((acc, munger) => {
          const fromVersionComparison = PenciltestVersions.compareVersions(fromVersion, munger.version)
          const isUpgradeGreaterThanFromVersion = fromVersionComparison === -1
          if (!isUpgradeGreaterThanFromVersion || typeof munger.migrate !== 'function') {
            return acc;
          }
          munger.migrate.apply(controller);
          atVersion = munger.version;
        });
      } catch (error) {
        Utils.log(error);
        Utils.alert(`The conversion from ${fromVersion} to ${toVersion} failed. Your data is still compatible with ${atVersion}`);
      }
    }

    return atVersion;
  }

  /**
   * comparisonTrinary: 0 => EXACT match for version
   * comparisonTrinary: -1 => EXACT or latest OLDER version
   * comparisonTrinary: 1 => EXACT or earliest NEWER version
   */
  static getMunger(version:string, comparison: comparisonTrinary = -1) {
    let munger:PenciltestVersionMunger;
    const step = comparison === -1 ? -1 : 1;
    const left = 0;
    const right = PenciltestVersions.mungers.length - 1;
    const start = step > 0 ? left : right;
    const end = step > 0 ? right : left;
    let i:number;
    for (i = start; end > start ? i <= end : i >= end; i += step) {
      const munger = PenciltestVersions.mungers[i];
      const mungerComparison = PenciltestVersions.compareVersions(version, munger.version);
      if (mungerComparison === 0 || mungerComparison === comparison) { // exact, or in comparison direction
        return munger;
      }
    }
  }

  static async packScene(scene:PenciltestScene): Promise<PenciltestScene> {
    return new Promise((resolve, reject) => {
      const munger = PenciltestVersions.getMunger(scene.instrument.version);
      if (typeof munger?.packScene === 'function') {
        try {
          const packedScene = munger.packScene.apply(munger, [Utils.clone(scene)]);
          if (packedScene.current?.frames) {
            delete packedScene.current.frames;
          }
          if (packedScene.current?.singleFrameDuration) {
            packedScene.current.singleFrameDuration = Utils.getDecimal(packedScene.current.singleFrameDuration, 3);
          }
          if (packedScene.current?.duration) {
            packedScene.current.duration = Utils.getDecimal(packedScene.current.duration, 3);
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

  static async unpackScene(packedScene:PenciltestSceneData): Promise<PenciltestScene> {
    return new Promise((resolve, reject) => {
      const munger = PenciltestVersions.getMunger(packedScene.instrument.version);
      if (typeof munger?.unpackScene === 'function') {
        try {
          resolve(munger.unpackScene.apply(munger, [packedScene]));
          return;
        } catch(e) {
          console.error(e);
        }
      }
      resolve(new PenciltestScene(packedScene));
    });
  }

}
