var PencilTestLegacy;

PencilTestLegacy = {
  index: ['0.0.3', '0.0.4'],
  workers: {
    '0.0.3': null,
    '0.0.4': function() {
      var film, filmNamePattern, frame, frameIndex, i, newSegment, segment, segmentIndex, storageName, stroke, strokeIndex, _i, _j, _k, _l, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
      filmNamePattern = /^film:/;
      _results = [];
      for (storageName in window.localStorage) {
        if (filmNamePattern.test(storageName)) {
          film = JSON.parse(window.localStorage.getItem(storageName));
          if (!film || !film.frames || !film.frames.length) {
            continue;
          }
          _ref = film.frames;
          for (frameIndex = _i = 0, _len = _ref.length; _i < _len; frameIndex = ++_i) {
            frame = _ref[frameIndex];
            _ref1 = frame.strokes;
            for (strokeIndex = _j = 0, _len1 = _ref1.length; _j < _len1; strokeIndex = ++_j) {
              stroke = _ref1[strokeIndex];
              for (segmentIndex = _k = 0, _len2 = stroke.length; _k < _len2; segmentIndex = ++_k) {
                segment = stroke[segmentIndex];
                if (typeof segment === 'string') {
                  newSegment = segment.replace(/[ML]/g, '').split(' ');
                  if (newSegment.length !== 2) {
                    throw new Error("bad stroke segment '" + segment + "': " + storageName + ":f" + frameIndex + ":p" + strokeIndex + ":s" + segmentIndex);
                  }
                  if (isNaN(newSegment[0] || isNaN(newSegment[1]))) {
                    throw new Error("NaN stroke segment '" + segment + "':  " + storageName + ":f" + frameIndex + ":p" + strokeIndex + ":s" + segmentIndex);
                  }
                  for (i = _l = 0, _ref2 = newSegment.length; 0 <= _ref2 ? _l < _ref2 : _l > _ref2; i = 0 <= _ref2 ? ++_l : --_l) {
                    newSegment[i] = Number(newSegment[i]);
                  }
                  film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment;
                }
              }
            }
          }
          film.version = '0.0.4';
          _results.push(window.localStorage.setItem(storageName, JSON.stringify(film)));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  },
  update: function(pt, from, to) {
    var at, confirmMessage, error, fromIndex, i, version, _i, _ref, _ref1, _ref2;
    at = from;
    fromIndex = this.index.indexOf(from);
    if (fromIndex !== -1 && fromIndex < this.index.length - 1) {
      confirmMessage = "You last used v" + from + ". Currently v" + to + ". Update your saved films to the new format now?";
      if (Utils.confirm(confirmMessage)) {
        try {
          for (i = _i = _ref = fromIndex + 1, _ref1 = this.index.length; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
            version = this.index[i];
            if ((_ref2 = this.workers[version]) != null) {
              _ref2.call(pt);
            }
            at = version;
          }
        } catch (_error) {
          error = _error;
          Utils.log(error);
          Utils.alert("The conversion from " + at + " to " + version + " failed. Your data is still compatible with " + at);
        }
      }
    }
    return at;
  }
};
