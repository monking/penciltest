
/*
global: document, window
 */
var Penciltest;

Penciltest = (function() {
  Penciltest.prototype.modes = {
    DRAWING: 'drawing',
    BUSY: 'working',
    PLAYING: 'playing'
  };

  Penciltest.prototype.availableRenderers = {
    canvas: CanvasRenderer,
    svg: SVGRenderer
  };

  Penciltest.prototype.options = {
    container: 'body',
    hideCursor: false,
    loop: true,
    showStatus: true,
    frameRate: 12,
    onionSkin: true,
    smoothing: 3,
    onionSkinRange: 4,
    renderer: 'canvas',
    onionSkinOpacity: 0.5
  };

  Penciltest.prototype.state = {
    version: '0.0.5',
    mode: Penciltest.prototype.modes.DRAWING
  };

  Penciltest.prototype.current = {
    frameIndex: [],
    exposureIndex: [],
    exposures: 0,
    exposureNumber: 0,
    frameNumber: 0
  };

  function Penciltest(options) {
    this.state = Utils.inherit(this.getStoredData('app', 'state'), Penciltest.prototype.state);
    this.options = Utils.inherit(this.getStoredData('app', 'options'), options, Penciltest.prototype.options);
    this.container = document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';
    this.buildContainer();
    this.ui = new PenciltestUI(this);
    this.setOptions(this.options);
    this.newFilm();
    if (this.state.version !== Penciltest.prototype.state.version) {
      this.state.version = PenciltestLegacy.update(this, this.state.version, Penciltest.prototype.state.version);
    }
    this.resize();
    window.pt = this;
  }

  Penciltest.prototype.setOptions = function(options) {
    var key, value, _results;
    this.options = Utils.inherit(options, this.options || {}, Penciltest.prototype.state);
    _results = [];
    for (key in options) {
      value = options[key];
      if (key in this.ui.appActions && this.ui.appActions[key].action) {
        _results.push(this.ui.appActions[key].action.call(this));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Penciltest.prototype.buildContainer = function() {
    var markup;
    markup = '<div class="field-container">' + '<div class="field"></div>' + '</div>';
    this.container.innerHTML = markup;
    this.fieldContainer = this.container.querySelector('.field-container');
    return this.fieldElement = this.container.querySelector('.field');
  };

  Penciltest.prototype.newFrame = function(index) {
    var frame;
    if (index == null) {
      index = null;
    }
    frame = {
      hold: 1,
      strokes: []
    };
    if (index === null) {
      index = this.film.frames.length;
    }
    this.lift();
    this.film.frames.splice(index, 0, frame);
    return this.buildFilmMeta();
  };

  Penciltest.prototype.getCurrentFrame = function() {
    return this.film.frames[this.current.frameNumber];
  };

  Penciltest.prototype.getCurrentStroke = function() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex || 0];
  };

  Penciltest.prototype.mark = function(x, y) {
    var frameScale, _base;
    x = Utils.getDecimal(x, 1);
    y = Utils.getDecimal(y, 1);
    if (!this.currentStrokeIndex) {
      if ((_base = this.getCurrentFrame()).strokes == null) {
        _base.strokes = [];
      }
      this.currentStrokeIndex = this.getCurrentFrame().strokes.length;
      this.getCurrentFrame().strokes.push([]);
      this.renderer.moveTo(x, y);
    } else {
      this.renderer.lineTo(x, y);
    }
    frameScale = this.film.width / this.width;
    this.getCurrentStroke().push(this.scaleCoordinates([x, y], frameScale));
    if (this.state.mode === Penciltest.prototype.modes.DRAWING) {
      this.renderer.render();
    }
    this.clearRedo();
    return this.unsavedChanges = true;
  };

  Penciltest.prototype.track = function(x, y) {
    var coords, makeMark;
    coords = {
      x: x,
      y: y
    };
    makeMark = false;
    if (this.currentStrokeIndex == null) {
      this.markPoint = coords;
      this.markBuffer = [];
      makeMark = true;
    }
    this.markBuffer.push(coords);
    this.markPoint.x = (this.markPoint.x * this.options.smoothing + x) / (this.options.smoothing + 1);
    this.markPoint.y = (this.markPoint.y * this.options.smoothing + y) / (this.options.smoothing + 1);
    if (this.markBuffer.length > this.state.smoothDrawInterval) {
      this.markBuffer = [];
      makeMark = true;
    }
    if (makeMark) {
      return this.mark(this.markPoint.x, this.markPoint.y);
    }
  };

  Penciltest.prototype.updateCurrentFrame = function(segment) {
    return this.drawCurrentFrame();
  };

  Penciltest.prototype.goToFrame = function(newIndex) {
    newIndex = Math.max(0, Math.min(this.film.frames.length - 1, newIndex));
    this.current.frameNumber = newIndex;
    this.current.frame = this.film.frames[this.current.frameNumber];
    if (this.state.mode !== Penciltest.prototype.modes.PLAYING) {
      this.seekToAudioAtExposure(newIndex);
    }
    return this.drawCurrentFrame();
  };

  Penciltest.prototype.seekToAudioAtExposure = function(frameNumber) {
    var seekTime;
    if (this.film.audio) {
      seekTime = (this.current.frameIndex[frameNumber].time - this.film.audio.offset) * this.singleFrameDuration;
      return this.seekAudio;
    }
  };

  Penciltest.prototype.play = function() {
    var self, stepListener;
    self = this;
    if (this.playDirection == null) {
      this.playDirection = 1;
    }
    if (this.current.frameNumber < this.film.frames.length - 1) {
      this.framesHeld = 0;
    } else {
      this.framesHeld = -1;
      this.goToFrame(0);
    }
    stepListener = function() {
      var currentFrame, newIndex;
      self.framesHeld++;
      currentFrame = self.getCurrentFrame();
      if (self.framesHeld >= currentFrame.hold) {
        self.framesHeld = 0;
        newIndex = self.current.frameNumber + self.playDirection;
        if (newIndex >= self.film.frames.length || newIndex < 0) {
          if (self.options.loop) {
            newIndex = (newIndex + self.film.frames.length) % self.film.frames.length;
            return self.goToFrame(newIndex);
          } else {
            return self.stop();
          }
        } else {
          return self.goToFrame(newIndex);
        }
      }
    };
    this.stop();
    stepListener();
    this.playInterval = setInterval(stepListener, 1000 / this.options.frameRate);
    this.lift();
    this.state.mode = Penciltest.prototype.modes.PLAYING;
    return this.playAudio();
  };

  Penciltest.prototype.stop = function() {
    if (this.audioElement) {
      this.pauseAudio();
    }
    clearInterval(this.playInterval);
    if (this.state.mode === Penciltest.prototype.modes.PLAYING) {
      return this.state.mode = Penciltest.prototype.modes.DRAWING;
    }
  };

  Penciltest.prototype.togglePlay = function() {
    if (this.state.mode !== Penciltest.prototype.modes.BUSY) {
      if (this.state.mode === Penciltest.prototype.modes.PLAYING) {
        return this.stop();
      } else {
        return this.play();
      }
    }
  };

  Penciltest.prototype.drawCurrentFrame = function() {
    var i, _i, _ref;
    this.renderer.clear();
    if (this.options.onionSkin) {
      for (i = _i = 1, _ref = this.options.onionSkinRange; 1 <= _ref ? _i <= _ref : _i >= _ref; i = 1 <= _ref ? ++_i : --_i) {
        if (this.current.frameNumber >= i) {
          this.drawFrame(this.current.frameNumber - i, {
            color: [255, 0, 0],
            opacity: Math.pow(this.options.onionSkinOpacity, i)
          });
        }
        if (this.current.frameNumber < this.film.frames.length - i) {
          this.drawFrame(this.current.frameNumber + i, {
            color: [0, 0, 255],
            opacity: Math.pow(this.options.onionSkinOpacity, i)
          });
        }
      }
    }
    this.drawFrame(this.current.frameNumber);
    return this.ui.updateStatus();
  };

  Penciltest.prototype.drawFrame = function(frameIndex, overrides) {
    var frameScale, stroke, _i, _len, _ref;
    if (overrides) {
      this.renderer.setLineOverrides(overrides);
    }
    frameScale = this.width / this.film.width;
    _ref = this.film.frames[frameIndex].strokes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      this.renderer.path(this.scaleStroke(stroke, frameScale));
    }
    this.renderer.clearLineOverrides();
    return this.renderer.options.lineWeight = frameScale;
  };

  Penciltest.prototype.scaleStroke = function(stroke, factor) {
    var coords, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = stroke.length; _i < _len; _i++) {
      coords = stroke[_i];
      _results.push(this.scaleCoordinates(coords, factor));
    }
    return _results;
  };

  Penciltest.prototype.scaleCoordinates = function(coords, factor) {
    var newCoords;
    newCoords = [coords[0] * factor, coords[1] * factor];
    newCoords.push(coords.slice(2));
    return newCoords;
  };

  Penciltest.prototype.cancelStroke = function() {
    this.markBuffer = [];
    return this.currentStrokeIndex = null;
  };

  Penciltest.prototype.lift = function() {
    var last;
    if (this.markBuffer && this.markBuffer.length) {
      last = this.markBuffer.pop();
      this.mark(last.x, last.y);
      this.markBuffer = [];
    }
    return this.currentStrokeIndex = null;
  };

  Penciltest.prototype.dropFrame = function() {
    this.film.frames.splice(this.current.frameNumber, 1);
    if (this.current.frameNumber >= this.film.frames.length && this.current.frameNumber > 0) {
      this.current.frameNumber--;
    }
    if (this.film.frames.length === 0) {
      this.newFrame();
    }
    this.buildFilmMeta();
    return this.drawCurrentFrame();
  };

  Penciltest.prototype.smoothFrame = function(index, amount) {
    var frame, oldStrokes, segment, smoothingBackup, stroke, _i, _j, _len, _len1;
    if (!amount) {
      amount = Number(Utils.prompt('How much to smooth? 1-5', 2));
    }
    smoothingBackup = this.options.smoothing;
    this.options.smoothing = amount;
    frame = this.film.frames[index];
    oldStrokes = JSON.parse(JSON.stringify(frame.strokes));
    this.lift();
    frame.strokes = [];
    this.current.frameNumber = index;
    this.renderer.clear();
    for (_i = 0, _len = oldStrokes.length; _i < _len; _i++) {
      stroke = oldStrokes[_i];
      for (_j = 0, _len1 = stroke.length; _j < _len1; _j++) {
        segment = stroke[_j];
        this.track.apply(this, segment);
      }
      this.lift();
    }
    return this.options.smoothing = smoothingBackup;
  };

  Penciltest.prototype.smoothFilm = function(amount) {
    var frame, lastIndex, _i;
    if (this.state.mode === Penciltest.prototype.modes.DRAWING) {
      if (Utils.confirm('Would you like to smooth every frame of this film?')) {
        if (!amount) {
          amount = Number(Utils.prompt('How much to smooth? 1-5', 2));
        }
        this.state.mode = Penciltest.prototype.modes.BUSY;
        lastIndex = this.film.frames.length - 1;
        for (frame = _i = 0; 0 <= lastIndex ? _i <= lastIndex : _i >= lastIndex; frame = 0 <= lastIndex ? ++_i : --_i) {
          this.smoothFrame(frame, amount);
        }
        return this.state.mode = Penciltest.prototype.modes.DRAWING;
      }
    } else {
      return Utils.log('Unable to alter film while playing');
    }
  };

  Penciltest.prototype.undo = function() {
    if (this.getCurrentFrame().strokes && this.getCurrentFrame().strokes.length) {
      if (this.redoQueue == null) {
        this.redoQueue = [];
      }
      this.redoQueue.push(this.getCurrentFrame().strokes.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  };

  Penciltest.prototype.redo = function() {
    if (this.redoQueue && this.redoQueue.length) {
      this.getCurrentFrame().strokes.push(this.redoQueue.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  };

  Penciltest.prototype.clearRedo = function() {
    return this.redoQueue = [];
  };

  Penciltest.prototype.setCurrentFrameHold = function(newHold) {
    this.getCurrentFrame().hold = Math.max(1, newHold);
    this.buildFilmMeta();
    return this.ui.updateStatus();
  };

  Penciltest.prototype.newFilm = function() {
    this.film = {
      name: '',
      version: Penciltest.prototype.state.version,
      aspect: '16:9',
      width: 960,
      frames: []
    };
    this.newFrame();
    return this.goToFrame(0);
  };

  Penciltest.prototype.getFilmNames = function() {
    var filmNamePattern, filmNames, reference, storageName;
    filmNamePattern = /^film:/;
    filmNames = [];
    for (storageName in window.localStorage) {
      reference = this.decodeStorageReference(storageName);
      if (reference && reference.namespace === 'film') {
        filmNames.push(reference.name);
      }
    }
    return filmNames;
  };

  Penciltest.prototype.encodeStorageReference = function(namespace, name) {
    return "" + namespace + ":" + name;
  };

  Penciltest.prototype.decodeStorageReference = function(encoded) {
    var match;
    if (match = encoded.match(/^(app|film):(.*)/)) {
      return {
        namespace: match[1],
        name: match[2]
      };
    } else {
      return false;
    }
  };

  Penciltest.prototype.getStoredData = function(namespace, name) {
    var storageName;
    storageName = this.encodeStorageReference(namespace, name);
    return JSON.parse(window.localStorage.getItem(storageName));
  };

  Penciltest.prototype.putStoredData = function(namespace, name, data) {
    var storageName;
    storageName = this.encodeStorageReference(namespace, name);
    return window.localStorage.setItem(storageName, JSON.stringify(data));
  };

  Penciltest.prototype.saveFilm = function() {
    var name;
    name = window.prompt("what will you name your film?", this.film.name);
    if (name) {
      this.film.name = name;
      this.putStoredData('film', name, this.film);
      return this.unsavedChanges = false;
    }
  };

  Penciltest.prototype.selectFilmName = function(message) {
    var filmName, filmNames, selectedFilmName, _i, _len;
    filmNames = this.getFilmNames();
    if (filmNames.length) {
      if (message == null) {
        message = 'Choose a film';
      }
      selectedFilmName = window.prompt("" + message + ":\n\n" + (filmNames.join('\n')));
      if (selectedFilmName && filmNames.indexOf(selectedFilmName === -1)) {
        for (_i = 0, _len = filmNames.length; _i < _len; _i++) {
          filmName = filmNames[_i];
          if (RegExp(selectedFilmName).test(filmName)) {
            selectedFilmName = filmName;
          }
        }
      }
      if (selectedFilmName && filmNames.indexOf(selectedFilmName) !== -1) {
        return selectedFilmName;
      } else {
        Utils.alert("No film by that name.");
      }
    } else {
      Utils.alert("You don't have any saved films yet.");
    }
    return false;
  };

  Penciltest.prototype.setFilm = function(film) {
    this.film = film;
    this.buildFilmMeta();
    if (this.film.audio && this.film.audio.url) {
      this.loadAudio(this.film.audio.url);
    } else {
      this.destroyAudio();
    }
    this.goToFrame(0);
    this.ui.updateStatus();
    this.unsavedChanges = false;
    return this.resize();
  };

  Penciltest.prototype.loadFilm = function() {
    var name;
    if (name = this.selectFilmName('Choose a film to load')) {
      return this.setFilm(this.getStoredData('film', name));
    }
  };

  Penciltest.prototype.deleteFilm = function() {
    var filmName;
    if (filmName = this.selectFilmName('Choose a film to DELETE...FOREVER')) {
      return window.localStorage.removeItem(this.encodeStorageReference('film', filmName));
    }
  };

  Penciltest.prototype.buildFilmMeta = function() {
    var frame, frameMeta, i, _i, _j, _ref, _ref1;
    this.current.frameIndex = [];
    this.current.exposureIndex = [];
    this.current.exposures = 0;
    for (i = _i = 0, _ref = this.film.frames.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      frame = this.film.frames[i];
      frameMeta = {
        id: i,
        exposure: this.current.exposures,
        duration: frame.hold * this.singleFrameDuration,
        time: this.current.exposures * this.singleFrameDuration
      };
      this.current.frameIndex.push(frameMeta);
      for (_j = 1, _ref1 = frame.hold; 1 <= _ref1 ? _j < _ref1 : _j > _ref1; 1 <= _ref1 ? _j++ : _j--) {
        this.current.exposureIndex.push(frameMeta);
      }
      this.current.exposures += this.film.frames[i].hold;
    }
    return this.current.duration = this.current.exposures * this.singleFrameDuration;
  };

  Penciltest.prototype.getFrameDuration = function(frameNumber) {
    var frame;
    if (frameNumber == null) {
      frameNumber = this.current.frameNumber;
    }
    frame = this.film.frames[frameNumber];
    return frame.hold / this.options.frameRate;
  };

  Penciltest.prototype.loadAudio = function(audioURL) {
    this.state.audioURL = audioURL;
    if (!this.audioElement) {
      this.audioElement = document.createElement('audio');
      this.fieldElement.insertBefore(this.audioElement);
      this.audioElement.preload = true;
    } else {
      this.pauseAudio();
    }
    return this.audioElement.src = this.state.audioURL;
  };

  Penciltest.prototype.destroyAudio = function() {
    if (this.audioElement) {
      this.pauseAudio();
      this.audioElement.remove();
      return this.audioElement = null;
    }
  };

  Penciltest.prototype.pauseAudio = function() {
    if (this.audioElement && !this.audioElement.paused) {
      return this.audioElement.pause();
    }
  };

  Penciltest.prototype.playAudio = function() {
    if (this.audioElement && this.audioElement.paused) {
      return this.audioElement.play();
    }
  };

  Penciltest.prototype.seekAudio = function(time) {
    if (this.audioElement) {
      return this.audioElement.currentTime = time;
    }
  };

  Penciltest.prototype.scrubAudio = function() {
    var self;
    Utils.log('scrubAudio');
    self = this;
    this.seekToAudioAtExposure(this.current.frameNumber);
    clearTimeout(this.scrubAudioTimeout);
    this.playAudio();
    return this.scrubAudioTimeout = setTimeout(function() {
      return self.pauseAudio();
    }, Math.max(this.getFrameDuration(this.current.frameNumber) * 1000, 100));
  };

  Penciltest.prototype.resize = function() {
    var aspect, aspectNumber, aspectParts, containerAspect, containerHeight, containerWidth;
    containerWidth = this.container.offsetWidth;
    containerHeight = this.container.offsetHeight;
    if (this.options.showStatus) {
      containerHeight -= 36;
    }
    aspect = this.film.aspect || '16:9';
    aspectParts = aspect.split(':');
    aspectNumber = aspectParts[0] / aspectParts[1];
    containerAspect = containerWidth / containerHeight;
    if (containerAspect > aspectNumber) {
      this.width = Math.floor(containerHeight * aspectNumber);
      this.height = containerHeight;
    } else {
      this.width = containerWidth;
      this.height = Math.floor(containerWidth / aspectNumber);
    }
    this.fieldContainer.style.width = "" + this.width + "px";
    this.fieldContainer.style.height = "" + this.height + "px";
    this.renderer.resize(this.width, this.height);
    return this.drawCurrentFrame();
  };

  return Penciltest;

})();
