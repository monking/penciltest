const PenciltestLegacy = {

  index: [
    '0.0.3',
    '0.0.4',
    '0.0.5'
  ],

  workers: {
    '0.0.3': null,
    '0.0.4'() {
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
    },
    '0.0.5'() {
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

  update(pt: any, from: any, to: any) {
    let at  = from;
    const fromIndex = this.index.indexOf(from);
    if ((fromIndex !== -1) && (fromIndex < (this.index.length - 1))) {
      const confirmMessage = `You last used v${from}. Currently v${to}. Update your saved films to the new format now?`;
      if (Utils.confirm(confirmMessage)) {
        let version: string | number;
        try {
          for (let start = fromIndex + 1, i = start, end = this.index.length, asc = start <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            version = this.index[i];
            if (this.workers[version] != null) {
              this.workers[version].call(pt);
            }
            at = version;
          }
        } catch (error) {
          Utils.log(error);
          Utils.alert(`The conversion from ${at} to ${version} failed. Your data is still compatible with ${at}`);
        }
      }
    }

    return at;
  }
};
