type comparisonTrinary = -1 | 0 | 1;

interface PenciltestVersionMunger {
  version:string;
  upgrade?:Function;
  packScene?:Function;
  unpackScene?:Function;
  sep?:{stroke:string, point:string, coord:string};
};

class PenciltestVersions {

  static mungers:Array<PenciltestVersionMunger> = [
    {
      version:'0.0.4',
      upgrade(this:Penciltest) {
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
    },
    {
      version:'0.0.5',
      upgrade(this:Penciltest) {
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
    },
    // TODO rename 'film' localStorage namespace to 'scene'. Which version did that happen in?  2026-07-31 uuid:ee574c36-476a-4a59-86ca-7c9a203b52f8
    {
      version:'0.3.0',
      upgrade(this:Penciltest) {
        const scene = (this?.scene) as any;
        if (typeof scene?.aspect === 'string' && typeof scene?.aspectRatio !== 'string') {
          scene.aspectRatio = scene.aspect;
          delete scene.aspect;
        }
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
      },
      sep: {
        stroke: "|",
        point: ',',
        coord: ' '
      },
      packScene(scene:PenciltestScene):PenciltestScene {
        const packStroke = (stroke:Stroke):string => {
          const packedStrokeObject = { ...stroke };
          delete packedStrokeObject.path
          let packedStrokeString = stroke.path
            .map((point) => {
              return Utils.getDecimal(point.x, 2) + this.sep.coord + Utils.getDecimal(point.x, 2) 
            })
            .join(this.sep.point)
          if (Object.keys(packedStrokeObject).length > 0) {
            packedStrokeString += JSON.stringify(packedStrokeObject);
          }
          return packedStrokeString;
        };

        const packFrame = (frame:PenciltestFrame):PenciltestFrame => {
          const packedFrame:PenciltestFrame = {
            ...frame,
            packedStrokes: frame.strokes
              .map(packStroke)
              .join(this.sep.stroke)
          };
          delete packedFrame.strokes;
          return packedFrame;
        };

				const packedScene = {
          ...scene,
          frames: scene.frames.map(packFrame)
        };
        delete packedScene.current;
        debugger;
        return packedScene;
      },
      unpackScene(packedScene:PenciltestScene):PenciltestScene {
        const unpackStroke = (packedStroke:string):Stroke => {
          const jsonIndex = packedStroke.indexOf('{');
          const stroke:Stroke = JSON.parse(packedStroke.slice(jsonIndex)) as Stroke;
          stroke.path = packedStroke.substr(0, jsonIndex)
            .split(this.sep.point)
            .map((packedPoint) => {
              const coords = packedPoint.split(this.sep.coord).map(Number);
              return {x:coords[0], y:coords[1]};
            });
          return stroke;
        };
        const unpackFrame = (packedFrame:PenciltestFrame):PenciltestFrame => {
          const frame:PenciltestFrame = {
            ...packedFrame,
            strokes: packedFrame.packedStrokes
              .split(this.sep.stroke)
              .map(unpackStroke)
          };
          delete frame.packedStrokes;
          return frame;
        };
        return {
          ...packedScene,
          frames: packedScene.frames.map(unpackFrame)
        };
      }
    },
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

  static async upgrade(controller: Penciltest, fromVersion: string, toVersion: string) {
    let atVersion = fromVersion;
    const confirmMessage = `Upgrade scene data from v${fromVersion} to v${toVersion}?`;
    if (await Utils.confirm(confirmMessage)) {
      try {
        const result = PenciltestVersions.mungers.reduce((acc, munger) => {
          const fromVersionComparison = PenciltestVersions.compareVersions(fromVersion, munger.version)
          const isUpgradeGreaterThanFromVersion = fromVersionComparison === -1
          if (!isUpgradeGreaterThanFromVersion || typeof munger.upgrade !== 'function') {
            return acc;
          }
          munger.upgrade.apply(controller);
          atVersion = munger.version;
        });
      } catch (error) {
        Utils.log(error);
        Utils.alert(`The conversion from ${fromVersion} to ${toVersion} failed. Your data is still compatible with ${atVersion}`);
      }
    }

    return atVersion;
  }

  static getMunger(version:string, comparison: comparisonTrinary = 0) {
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
      if (mungerComparison === comparison) {
        return munger;
      }
    }
  }

  static async packScene(scene:PenciltestScene): Promise<PenciltestScene> {
    return new Promise((resolve, reject) => {
      const munger = PenciltestVersions.getMunger(scene.instrument.version);
      if (typeof munger?.packScene === 'function') {
        try {
          resolve(munger.packScene.apply(munger, [scene]));
          return;
        } catch(e) {
          console.error(e);
        }
      }
      resolve(scene);
    });
  }

  static async unpackScene(packedScene:PenciltestScene): Promise<PenciltestScene> {
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
      resolve(packedScene);
    });
  }

}
