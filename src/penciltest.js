
/*
global: document, window
 */
var Penciltest;

Penciltest = (function() {
  Penciltest.prototype.modes = {
    DRAWING: 'drawing',
    ERASING: 'erasing',
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
    frameRate: 24,
    frameHold: 2,
    onionSkin: true,
    smoothing: 3,
    onionSkinRange: 4,
    renderer: 'canvas',
    onionSkinOpacity: 0.5,
    background: 'white'
  };

  Penciltest.prototype.state = {
    version: '0.1.4',
    mode: Penciltest.prototype.modes.DRAWING,
    toolStack: ['pencil', 'eraser']
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
    this.options.background = Penciltest.prototype.options.background;
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
      hold: this.options.frameHold,
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
    var _base;
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
    this.getCurrentStroke().push(this.scaleCoordinates([x, y], 1 / this.zoomFactor));
    if (this.state.mode === Penciltest.prototype.modes.DRAWING) {
      this.renderer.render();
    }
    this.clearRedo();
    return this.unsavedChanges = true;
  };

  Penciltest.prototype.track = function(x, y) {
    var coords, currentFrame, done, makeMark, point, realEraseRadius, screenEraseRadius, screenPoint, segment, stroke, strokeIndex, _i, _j, _len, _len1, _ref;
    coords = {
      x: x,
      y: y
    };
    if (this.state.toolStack[0] === 'eraser') {
      screenPoint = [x, y];
      point = this.scaleCoordinates(screenPoint, 1 / this.zoomFactor);
      done = false;
      currentFrame = this.getCurrentFrame();
      screenEraseRadius = 10;
      this.drawCurrentFrame();
      _ref = currentFrame.strokes;
      for (strokeIndex = _i = 0, _len = _ref.length; _i < _len; strokeIndex = ++_i) {
        stroke = _ref[strokeIndex];
        for (_j = 0, _len1 = stroke.length; _j < _len1; _j++) {
          segment = stroke[_j];
          realEraseRadius = screenEraseRadius / this.zoomFactor;
          if (Math.abs(point[0] - segment[0]) < realEraseRadius && Math.abs(point[1] - segment[1]) < realEraseRadius) {
            currentFrame.strokes.splice(strokeIndex, 1);
            this.drawCurrentFrame();
            done = true;
          }
          if (done) {
            break;
          }
        }
        if (done) {
          break;
        }
      }
      return this.renderer.rect(screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red');
    } else {
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
      this.seekAudioToFrame(newIndex);
    }
    return this.drawCurrentFrame();
  };

  Penciltest.prototype.seekAudioToFrame = function(frameNumber) {
    var seekTime;
    if (this.film.audio) {
      Utils.log(this.current.frameIndex[frameNumber]);
      seekTime = this.current.frameIndex[frameNumber].time - this.film.audio.offset;
      return this.seekAudio(seekTime);
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
    if (!this.film.frames.length) {
      return;
    }
    this.renderer.clear();
    if (this.options.background) {
      this.renderer.rect(0, 0, this.width, this.height, this.options.background);
    }
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
    var stroke, _i, _len, _ref;
    if (!this.width || !this.height) {
      return;
    }
    if (overrides) {
      this.renderer.setLineOverrides(overrides);
    }
    _ref = this.film.frames[frameIndex].strokes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      this.renderer.path(this.scaleStroke(stroke, this.zoomFactor));
    }
    return this.renderer.clearLineOverrides();
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

  Penciltest.prototype.useTool = function(toolName) {
    var index;
    index = this.state.toolStack.indexOf(toolName);
    if (index > -1) {
      return this.state.toolStack.unshift(this.state.toolStack.splice(index, 1)[0]);
    }
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
    this.currentStrokeIndex = null;
    if (this.state.toolStack[0] === 'eraser') {
      return this.drawCurrentFrame();
    }
  };

  Penciltest.prototype.copyFrame = function(frame) {
    if (frame == null) {
      frame = this.getCurrentFrame();
    }
    if (frame.strokes.length) {
      return this.copyBuffer = Utils.clone(frame);
    }
  };

  Penciltest.prototype.pasteFrame = function() {
    var newFrameIndex;
    if (this.copyBuffer) {
      newFrameIndex = this.current.frameNumber + 1;
      this.film.frames.splice(newFrameIndex, 0, Utils.clone(this.copyBuffer));
      this.buildFilmMeta();
      return this.goToFrame(newFrameIndex);
    }
  };

  Penciltest.prototype.pasteStrokes = function() {
    if (this.copyBuffer) {
      this.film.frames[this.current.frameNumber].strokes = this.film.frames[this.current.frameNumber].strokes.concat(Utils.clone(this.copyBuffer.strokes));
      return this.drawCurrentFrame();
    }
  };

  Penciltest.prototype.cutFrame = function() {
    if (this.getCurrentFrame().strokes.length) {
      return this.copyFrame(this.dropFrame());
    }
  };

  Penciltest.prototype.dropFrame = function() {
    var droppedFrame;
    droppedFrame = this.getCurrentFrame();
    this.film.frames.splice(this.current.frameNumber, 1);
    if (this.current.frameNumber >= this.film.frames.length && this.current.frameNumber > 0) {
      this.current.frameNumber--;
    }
    if (this.film.frames.length === 0) {
      this.newFrame();
    }
    this.buildFilmMeta();
    this.drawCurrentFrame();
    return droppedFrame;
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
      width: 1920,
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
    name = Utils.prompt("what will you name your film?", this.film.name);
    if (name) {
      this.film.name = name;
      this.putStoredData('film', name, this.film);
      return this.unsavedChanges = false;
    }
  };

  Penciltest.prototype.renderGif = function() {
    var baseFrameDelay, binaryGif, containerCss, dataUrl, dimensions, frameIndex, gifCloseHandler, gifConfiguration, gifContainer, gifCss, gifElement, gifElementId, gifEncoder, gifInstructions, gifLineWidth, maxGifDimension, oldLineOverrides, oldRendererType, property, renderLineOverrides, value, _i, _ref;
    dimensions = this.getFilmDimensions();
    gifConfiguration = (Utils.prompt('GIF size & lineWidth', '512 2') || '512 2').split(' ');
    maxGifDimension = parseInt(gifConfiguration[0], 10);
    gifLineWidth = parseInt(gifConfiguration[1], 10);
    if (dimensions.width > maxGifDimension) {
      dimensions.width = maxGifDimension;
      dimensions.height = maxGifDimension / dimensions.aspect;
    } else if (dimensions.height > maxGifDimension) {
      dimensions.height = maxGifDimension;
      dimensions.width = maxGifDimension * dimensions.aspect;
    }
    this.forceDimensions = {
      width: dimensions.width,
      height: dimensions.height
    };
    this.ui.appActions.renderer.action();
    this.resize();
    oldRendererType = this.options.renderer;
    this.setOptions({
      renderer: 'canvas'
    });
    this.ui.appActions.renderer.action();
    oldLineOverrides = this.renderer.overrides;
    renderLineOverrides = {
      weight: gifLineWidth
    };
    baseFrameDelay = 1000 / this.options.frameRate;
    frameIndex = 0;
    gifEncoder = new GIFEncoder();
    gifEncoder.setRepeat(0);
    gifEncoder.setDelay(baseFrameDelay);
    gifEncoder.start();
    for (frameIndex = _i = 0, _ref = this.film.frames.length; 0 <= _ref ? _i < _ref : _i > _ref; frameIndex = 0 <= _ref ? ++_i : --_i) {
      this.renderer.setLineOverrides(renderLineOverrides);
      this.goToFrame(frameIndex);
      gifEncoder.setDelay(baseFrameDelay * this.getCurrentFrame().hold);
      gifEncoder.addFrame(this.renderer.context);
    }
    gifEncoder.finish();
    binaryGif = gifEncoder.stream().getData();
    dataUrl = 'data:image/gif;base64,' + encode64(binaryGif);
    gifElementId = 'rendered_gif';
    gifElement = document.getElementById(gifElementId);
    if (!gifElement) {
      gifElement = document.createElement('img');
      gifElement.id = gifElementId;
      gifCss = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translateX(-50%) translateY(-50%)',
        maxWidth: '80%',
        maxHeight: '80%'
      };
      for (property in gifCss) {
        value = gifCss[property];
        gifElement.style[property] = value;
      }
      gifContainer = document.createElement('div');
      containerCss = {
        position: 'absolute',
        top: '0px',
        left: '0px',
        bottom: '0px',
        right: '0px',
        backgroundColor: 'rgba(0,0,0,0.5)'
      };
      for (property in containerCss) {
        value = containerCss[property];
        gifContainer.style[property] = value;
      }
      gifInstructions = document.createElement('div');
      containerCss = {
        position: 'relative',
        color: 'white',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
      };
      for (property in containerCss) {
        value = containerCss[property];
        gifInstructions.style[property] = value;
      }
      gifInstructions.innerHTML = "Right click (or touch & hold on mobile) to save.<br>Click/touch outside GIF to close.";
      gifContainer.appendChild(gifElement);
      gifContainer.appendChild(gifInstructions);
      document.body.appendChild(gifContainer);
      gifCloseHandler = function(event) {
        if (event.target !== gifElement) {
          gifContainer.removeEventListener('click', gifCloseHandler);
          gifContainer.removeEventListener('touchend', gifCloseHandler);
          return gifContainer.remove();
        }
      };
      gifContainer.addEventListener('click', gifCloseHandler);
      gifContainer.addEventListener('touchend', gifCloseHandler);
    }
    gifElement.src = dataUrl;
    this.setOptions({
      renderer: oldRendererType
    });
    this.renderer.setLineOverrides(oldLineOverrides);
    this.forceDimensions = null;
    return this.resize();
  };

  Penciltest.prototype.selectFilmName = function(message) {
    var filmName, filmNames, selectedFilmName, _i, _len;
    filmNames = this.getFilmNames();
    if (filmNames.length) {
      if (message == null) {
        message = 'Choose a film';
      }
      selectedFilmName = Utils.select(message, filmNames);
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
    var _base;
    if ((_base = this.film).audio == null) {
      _base.audio = {};
    }
    this.film.audio.url = audioURL;
    this.film.audio.offset = 0;
    this.unsavedChanges = true;
    if (!this.audioElement) {
      this.audioElement = document.createElement('audio');
      this.audioElement.preload = true;
      this.fieldContainer.appendChild(this.audioElement);
    } else {
      this.pauseAudio();
    }
    return this.audioElement.src = audioURL;
  };

  Penciltest.prototype.destroyAudio = function() {
    if (this.film.audio) {
      delete this.film.audio;
    }
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
    self = this;
    Utils.log('scrubAudio', this.current.frameNumber);
    this.seekAudioToFrame(this.current.frameNumber);
    clearTimeout(this.scrubAudioTimeout);
    this.playAudio();
    return this.scrubAudioTimeout = setTimeout(function() {
      return self.pauseAudio();
    }, Math.max(this.getFrameDuration * 1000, 100));
  };

  Penciltest.prototype.pan = function(deltaPoint) {
    var frame, segment, stroke, _i, _len, _ref, _results;
    _ref = this.film.frames;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      frame = _ref[_i];
      _results.push((function() {
        var _j, _len1, _ref1, _results1;
        _ref1 = frame.strokes;
        _results1 = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          stroke = _ref1[_j];
          _results1.push((function() {
            var _k, _len2, _results2;
            _results2 = [];
            for (_k = 0, _len2 = stroke.length; _k < _len2; _k++) {
              segment = stroke[_k];
              segment[0] += deltaPoint[0];
              _results2.push(segment[1] += deltaPoint[1]);
            }
            return _results2;
          })());
        }
        return _results1;
      })());
    }
    return _results;
  };

  Penciltest.prototype.getFilmDimensions = function() {
    var aspect, aspectParts, dimensions;
    aspect = this.film.aspect || '1:1';
    aspectParts = aspect.split(':');
    dimensions = {
      width: this.film.width,
      aspect: aspectParts[0] / aspectParts[1]
    };
    dimensions.height = Math.ceil(dimensions.width / dimensions.aspect);
    return dimensions;
  };

  Penciltest.prototype.resize = function() {
    var containerAspect, containerHeight, containerWidth, filmDimensions;
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
    filmDimensions = this.getFilmDimensions();
    containerAspect = containerWidth / containerHeight;
    if (containerAspect > filmDimensions.aspect) {
      this.width = Math.floor(containerHeight * filmDimensions.aspect);
      this.height = containerHeight;
    } else {
      this.width = containerWidth;
      this.height = Math.floor(containerWidth / filmDimensions.aspect);
    }
    this.fieldContainer.style.width = "" + this.width + "px";
    this.fieldContainer.style.height = "" + this.height + "px";
    this.renderer.resize(this.width, this.height);
    this.zoomFactor = this.width / this.film.width;
    this.renderer.options.lineWeight = this.zoomFactor;
    return this.drawCurrentFrame();
  };

  return Penciltest;

})();
