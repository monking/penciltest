
/*
global: document, window
 */
var PencilTest,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

PencilTest = (function() {
  PencilTest.prototype.modes = {
    DRAWING: 'drawing',
    BUSY: 'working',
    PLAYING: 'playing'
  };

  PencilTest.prototype.availableRenderers = {
    canvas: CanvasRenderer,
    svg: SVGRenderer
  };

  PencilTest.prototype.options = {
    container: 'body',
    hideCursor: false,
    loop: true,
    showStatus: true,
    frameRate: 12,
    onionSkin: true,
    smoothing: 3,
    onionSkinRange: 4,
    renderer: 'svg',
    onionSkinOpacity: 0.5
  };

  PencilTest.prototype.state = {
    version: '0.0.4',
    mode: PencilTest.prototype.modes.DRAWING
  };

  PencilTest.prototype.current = {
    frameIndex: [],
    exposureIndex: [],
    exposures: 0,
    exposureNumber: 0,
    frameNumber: 0
  };

  function PencilTest(options) {
    var optionName, _ref, _ref1;
    this.state = Utils.inherit(this.getStoredData('app', 'state'), PencilTest.prototype.state);
    this.setOptions(Utils.inherit(this.getStoredData('app', 'options'), options, PencilTest.prototype.options));
    this.container = document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';
    this.buildContainer();
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    this.addOtherListeners();
    for (optionName in this.options) {
      if ((_ref = this.appActions[optionName]) != null) {
        if ((_ref1 = _ref.action) != null) {
          _ref1.call(this);
        }
      }
    }
    this.newFilm();
    if (this.state.version !== PencilTest.prototype.state.version) {
      this.state.version = PencilTestLegacy.update(this, this.state.version, PencilTest.prototype.state.version);
    }
    window.pt = this;
  }

  PencilTest.prototype.setOptions = function(options) {
    var key, value, _results;
    this.options = Utils.inherit(options, this.options || {}, PencilTest.prototype.state);
    _results = [];
    for (key in options) {
      value = options[key];
      if (__indexOf.call(this.appActions, key) >= 0 && this.appActions[key].action) {
        _results.push(this.appActions[key].action());
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  PencilTest.prototype.appActions = {
    renderer: {
      label: "Set Renderer",
      listener: function() {
        var name;
        name = Utils.prompt('renderer (svg, canvas): ', this.options.renderer);
        if (__indexOf.call(this.availableRenderers, name) >= 0) {
          return this.options.renderer = name;
        }
      },
      action: function() {
        if (this.fieldElement) {
          return this.renderer = new this.availableRenderers[this.options.renderer]({
            container: this.fieldElement
          });
        }
      }
    },
    playPause: {
      label: "Play/Pause",
      hotkey: ['Space'],
      cancelComplement: true,
      listener: function() {
        this.playDirection = 1;
        return this.togglePlay();
      }
    },
    playReverse: {
      label: "Play in Reverse",
      hotkey: ['Shift+Space'],
      cancelComplement: true,
      listener: function() {
        this.playDirection = -1;
        return this.togglePlay();
      }
    },
    nextFrame: {
      label: "Next Frame",
      hotkey: ['Right', '.'],
      repeat: true,
      listener: function() {
        this.goToFrame(this.current.frameNumber + 1);
        this.stop();
        if (this.audioElement) {
          return this.scrubAudio();
        }
      }
    },
    prevFrame: {
      label: "Previous Frame",
      hotkey: ['Left', ','],
      repeat: true,
      listener: function() {
        this.goToFrame(this.current.frameNumber - 1);
        this.stop();
        if (this.audioElement) {
          return this.scrubAudio();
        }
      }
    },
    firstFrame: {
      label: "First Frame",
      hotkey: ['0', 'Home', 'PgUp'],
      cancelComplement: true,
      listener: function() {
        this.goToFrame(0);
        return this.stop();
      }
    },
    lastFrame: {
      label: "Last Frame",
      hotkey: ['$', 'End', 'PgDn'],
      cancelComplement: true,
      listener: function() {
        this.goToFrame(this.film.frames.length - 1);
        return this.stop();
      }
    },
    insertFrameBefore: {
      label: "Insert Frame Before",
      hotkey: ['Shift+I'],
      listener: function() {
        var newIndex;
        newIndex = this.current.frameNumber;
        this.newFrame(newIndex);
        return this.goToFrame(newIndex);
      }
    },
    insertFrameAfter: {
      label: "Insert Frame After",
      hotkey: ['I'],
      listener: function() {
        var newIndex;
        newIndex = this.current.frameNumber + 1;
        this.newFrame(newIndex);
        return this.goToFrame(newIndex);
      }
    },
    insertSeconds: {
      label: "Insert Seconds",
      hotkey: ['Alt+Shift+I'],
      listener: function() {
        var first, last, newIndex, seconds, _i;
        seconds = Number(Utils.prompt('# of seconds to insert: ', 1));
        first = this.current.frameNumber + 1;
        last = this.current.frameNumber + Math.floor(this.options.frameRate * seconds);
        for (newIndex = _i = first; first <= last ? _i <= last : _i >= last; newIndex = first <= last ? ++_i : --_i) {
          this.newFrame(newIndex);
        }
        return this.goToFrame(newIndex);
      }
    },
    undo: {
      label: "Undo",
      title: "Remove the last line drawn",
      hotkey: ['U', 'Alt+Z'],
      repeat: true,
      listener: function() {
        return this.undo();
      }
    },
    frameRate: {
      label: "Frame Rate",
      action: function() {
        return this.singleFrameDuration = 1 / this.options.frameRate;
      }
    },
    redo: {
      label: "Redo",
      title: "Put back a line removed by 'Undo'",
      hotkey: ['R', 'Alt+Shift+Z'],
      repeat: true,
      listener: function() {
        return this.redo();
      }
    },
    hideCursor: {
      label: "Hide Cursor",
      hotkey: ['C'],
      listener: function() {
        return this.options.hideCursor = !this.options.hideCursor;
      },
      action: function() {
        return Utils.toggleClass(this.container, 'hide-cursor', this.options.hideCursor);
      }
    },
    onionSkin: {
      label: "Onion Skin",
      hotkey: ['O'],
      title: "show previous and next frames in red and blue",
      listener: function() {
        this.options.onionSkin = !this.options.onionSkin;
        return this.drawCurrentFrame();
      }
    },
    dropFrame: {
      label: "Drop Frame",
      hotkey: ['X', 'Backspace'],
      cancelComplement: true,
      listener: function() {
        return this.dropFrame();
      }
    },
    smoothing: {
      label: "Smoothing...",
      title: "How much your lines will be smoothed as you draw",
      hotkey: ['Shift+S'],
      listener: function() {
        return this.options.smoothing = Number(Utils.prompt('Smoothing', this.options.smoothing));
      },
      action: function() {
        return this.state.smoothDrawInterval = Math.sqrt(this.options.smoothing);
      }
    },
    smoothFrame: {
      label: "Smooth Frame",
      title: "Draw the frame again, with current smoothing settings",
      hotkey: ['Shift+M'],
      listener: function() {
        return this.smoothFrame(this.current.frameNumber);
      }
    },
    smoothFilm: {
      label: "Smooth All Frames",
      title: "Redraw all frames in the film with the current smoothing setting",
      hotkey: ['Alt+Shift+M'],
      listener: function() {
        return this.smoothFilm();
      }
    },
    lessHold: {
      label: "Shorter Frame Hold",
      hotkey: ['Down', '-'],
      repeat: true,
      listener: function() {
        return this.setCurrentFrameHold(this.getCurrentFrame().hold - 1);
      }
    },
    moreHold: {
      label: "Longer Frame Hold",
      hotkey: ['Up', '+', '='],
      repeat: true,
      listener: function() {
        return this.setCurrentFrameHold(this.getCurrentFrame().hold + 1);
      }
    },
    showStatus: {
      label: "Show Status",
      title: "hide the film status bar",
      hotkey: ['S'],
      listener: function() {
        return this.options.showStatus = !this.options.showStatus;
      },
      action: function() {
        return Utils.toggleClass(this.statusElement, 'hidden', !this.options.showStatus);
      }
    },
    loop: {
      label: "Loop",
      hotkey: ['L'],
      listener: function() {
        return this.options.loop = !this.options.loop;
      }
    },
    saveFilm: {
      label: "Save",
      hotkey: ['Alt+S'],
      repeat: true,
      listener: function() {
        return this.saveFilm();
      }
    },
    loadFilm: {
      label: "Load",
      hotkey: ['Alt+O'],
      repeat: true,
      listener: function() {
        return this.loadFilm();
      }
    },
    newFilm: {
      label: "New",
      hotkey: ['Alt+N'],
      repeat: true,
      listener: function() {
        if (Utils.confirm("This will BURN your current animation.")) {
          return this.newFilm();
        }
      }
    },
    deleteFilm: {
      label: "Delete Film",
      hotkey: ['Alt+Backspace'],
      listener: function() {
        return this.deleteFilm();
      }
    },
    exportFilm: {
      label: "Export",
      hotkey: ['Alt+E'],
      cancelComplement: true,
      listener: function() {
        var open;
        open = Utils.toggleClass(this.textElement, 'active');
        if (open) {
          return this.textElement.value = JSON.stringify(this.film);
        } else {
          return this.textElement.value = '';
        }
      }
    },
    importFilm: {
      label: "Import",
      hotkey: ['Alt+I'],
      cancelComplement: true,
      listener: function() {
        var importJSON, open;
        open = Utils.toggleClass(this.textElement, 'active');
        if (open) {
          return this.textElement.value = '';
        } else {
          importJSON = this.textElement.value;
          try {
            this.setFilm(JSON.parse(importJSON));
          } catch (_error) {}
          return this.textElement.value = '';
        }
      }
    },
    importAudio: {
      label: "Import Audio",
      hotkey: ['Alt+A'],
      listener: function() {
        var audioURL, _base;
        audioURL = Utils.prompt('Audio file URL: ', this.state.audioURL);
        if (audioURL != null) {
          if ((_base = this.film).audio == null) {
            _base.audio = {};
          }
          this.film.audio.url = audioURL;
          this.unsavedChanges = true;
          return this.loadAudio(audioURL);
        }
      }
    },
    unloadAudio: {
      label: "Unload Audio",
      listener: function() {
        return this.destroyAudio;
      }
    },
    shiftAudioEarlier: {
      label: "Shift Audio Earlier",
      hotkey: ['['],
      listener: function() {
        Utils.log("Shift Audio Earlier");
        if (this.film.audio) {
          this.film.audio.offset--;
        }
        return this.updateStatus();
      }
    },
    shiftAudioLater: {
      label: "Shift Audio Later",
      hotkey: [']'],
      listener: function() {
        Utils.log("Shift Audio Later");
        if (this.film.audio) {
          this.film.audio.offset++;
        }
        return this.updateStatus();
      }
    },
    keyboardShortcuts: {
      label: "Keyboard Shortcuts",
      hotkey: ['?'],
      listener: function() {
        return this.keyboardShortcuts();
      }
    },
    reset: {
      label: "Reset",
      title: "Clear settings; helpful if the app has stopped working.",
      action: function() {
        this.state = Utils.inherit({}, PencilTest.prototype.state);
        return this.setOptions(Utils.inherit({}, PencilTest.prototype.options));
      }
    }
  };

  PencilTest.prototype.menuOptions = [
    {
      _icons: ['firstFrame', 'prevFrame', 'playPause', 'nextFrame', 'lastFrame'],
      Edit: ['undo', 'redo', 'insertFrameAfter', 'insertFrameBefore', 'insertSeconds', 'dropFrame', 'moreHold', 'lessHold'],
      Playback: ['loop'],
      Tools: ['hideCursor', 'onionSkin', 'showStatus', 'smoothing', 'smoothFrame', 'smoothFilm', 'importAudio'],
      Film: ['saveFilm', 'loadFilm', 'newFilm', 'importFilm', 'exportFilm'],
      Help: ['keyboardShortcuts', 'reset']
    }
  ];

  PencilTest.prototype.buildContainer = function() {
    var markup;
    markup = '<div class="field-container">' + '<div class="field"></div>' + '<div class="status"></div>' + '</div>' + '<textarea></textarea>' + '<ul class="menu">' + this.menuWalker(this.menuOptions) + '</ul>';
    this.container.innerHTML = markup;
    this.fieldContainer = this.container.querySelector('.field-container');
    this.fieldElement = this.container.querySelector('.field');
    this.statusElement = this.container.querySelector('.status');
    return this.appActions.renderer.action();
  };

  PencilTest.prototype.menuWalker = function(level) {
    var group, groupName, key, label, markup, title, _i, _len;
    markup = '';
    for (_i = 0, _len = level.length; _i < _len; _i++) {
      key = level[_i];
      if (typeof key === 'string') {
        label = this.appActions[key].label;
        title = this.appActions[key].title;
        markup += "<li rel=\"" + key + "\" title=\"" + title + "\"><label>" + label + "</label></li>";
      } else {
        for (groupName in key) {
          group = key[groupName];
          if (groupName === '_icons') {
            markup += "<li class=\"icons\"><ul>";
          } else {
            markup += "<li class=\"group collapsed\"><label>" + groupName + "</label><ul>";
          }
          markup += this.menuWalker(group);
          markup += '</ul></li>';
        }
      }
    }
    return markup;
  };

  PencilTest.prototype.addInputListeners = function() {
    var contextMenuListener, getEventPageXY, mouseDownListener, mouseMoveListener, mouseUpListener, self, trackFromEvent;
    self = this;
    getEventPageXY = function(event) {
      var eventLocation;
      if (/^touch/.test(event.type)) {
        eventLocation = event.touches[0];
      } else {
        eventLocation = event;
      }
      return {
        x: eventLocation.pageX,
        y: eventLocation.pageY
      };
    };
    trackFromEvent = function(event) {
      var pageCoords;
      pageCoords = getEventPageXY(event);
      return self.track(pageCoords.x - self.fieldContainer.offsetLeft, pageCoords.y - self.fieldContainer.offsetTop);
    };
    mouseDownListener = function(event) {
      event.preventDefault();
      if (event.type === 'touchstart' && event.touches.length > 1) {
        mouseUpListener();
        if (event.touches.length === 3) {
          return self.showMenu();
        } else {
          return self.hideMenu();
        }
      } else {
        if (event.button === 2) {
          return true;
        } else {
          self.hideMenu();
        }
        trackFromEvent(event);
        document.body.addEventListener('mousemove', mouseMoveListener);
        document.body.addEventListener('touchmove', mouseMoveListener);
        document.body.addEventListener('mouseup', mouseUpListener);
        return document.body.addEventListener('touchend', mouseUpListener);
      }
    };
    mouseMoveListener = function(event) {
      event.preventDefault();
      if (self.state.mode === PencilTest.prototype.modes.DRAWING) {
        return trackFromEvent(event);
      }
    };
    mouseUpListener = function(event) {
      if (event.button === 2) {
        return true;
      } else {
        document.body.removeEventListener('mousemove', mouseMoveListener);
        document.body.removeEventListener('touchmove', mouseMoveListener);
        document.body.removeEventListener('mouseup', mouseUpListener);
        document.body.removeEventListener('touchend', mouseUpListener);
        return self.lift();
      }
    };
    contextMenuListener = function(event) {
      event.preventDefault();
      return self.toggleMenu(getEventPageXY(event));
    };
    this.fieldElement.addEventListener('mousedown', mouseDownListener);
    this.fieldElement.addEventListener('touchstart', mouseDownListener);
    return this.fieldElement.addEventListener('contextmenu', contextMenuListener);
  };

  PencilTest.prototype.updateMenuOption = function(optionElement) {
    var optionName;
    optionName = optionElement.attributes.rel.value;
    if (typeof this.options[optionName] === 'boolean') {
      return Utils.toggleClass(optionElement, 'enabled', this.options[optionName]);
    }
  };

  PencilTest.prototype.doAppAction = function(optionName) {
    var _ref, _ref1;
    if ((_ref = this.appActions[optionName].listener) != null) {
      _ref.call(this);
    }
    return (_ref1 = this.appActions[optionName].action) != null ? _ref1.call(this) : void 0;
  };

  PencilTest.prototype.addMenuListeners = function() {
    var menuOptionListener, option, self, _i, _len, _ref;
    self = this;
    this.menuElement = this.container.querySelector('.menu');
    this.menuItems = this.menuElement.querySelectorAll('LI');
    menuOptionListener = function(event) {
      var optionName;
      if (/\bgroup\b/.test(this.className)) {
        return Utils.toggleClass(this, 'collapsed');
      } else if (this.attributes.rel) {
        event.preventDefault();
        optionName = this.attributes.rel.value;
        self.doAppAction(optionName);
        return self.hideMenu();
      }
    };
    _ref = this.menuItems;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('mouseup', menuOptionListener);
      option.addEventListener('touchend', menuOptionListener);
      option.addEventListener('contextmenu', menuOptionListener);
    }
    return this.textElement = this.container.querySelector('textarea');
  };

  PencilTest.prototype.addKeyboardListeners = function() {
    var action, hotkey, keyboardListener, name, self, _i, _len, _ref, _ref1;
    self = this;
    this.keyBindings = {
      keydown: {},
      keyup: {}
    };
    _ref = this.appActions;
    for (name in _ref) {
      action = _ref[name];
      if (action.hotkey) {
        _ref1 = action.hotkey;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          hotkey = _ref1[_i];
          if (action.repeat) {
            this.keyBindings.keydown[hotkey] = name;
            if (action.cancelComplement) {
              this.keyBindings.keyup[hotkey] = null;
            }
          } else {
            this.keyBindings.keyup[hotkey] = name;
            if (action.cancelComplement) {
              this.keyBindings.keydown[hotkey] = null;
            }
          }
        }
      }
    }
    keyboardListener = function(event) {
      var actionName, combo;
      combo = Utils.describeKeyCombo(event);
      actionName = self.keyBindings[event.type][combo];
      if (actionName || actionName === null) {
        event.preventDefault();
        if (actionName) {
          return self.doAppAction(actionName);
        }
      }
    };
    document.body.addEventListener('keydown', keyboardListener);
    return document.body.addEventListener('keyup', keyboardListener);
  };

  PencilTest.prototype.addOtherListeners = function() {
    var self;
    self = this;
    return window.addEventListener('beforeunload', function() {
      self.putStoredData('app', 'options', self.options);
      self.putStoredData('app', 'state', self.state);
      if (self.unsavedChanges) {
        return event.returnValue = "You have unsaved changes. Alt+S to save.";
      }
    });
  };

  PencilTest.prototype.newFrame = function(index) {
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

  PencilTest.prototype.getCurrentFrame = function() {
    return this.film.frames[this.current.frameNumber];
  };

  PencilTest.prototype.getCurrentStroke = function() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex || 0];
  };

  PencilTest.prototype.mark = function(x, y) {
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
    this.getCurrentStroke().push([x, y]);
    if (this.state.mode === PencilTest.prototype.modes.DRAWING) {
      this.renderer.render();
    }
    this.clearRedo();
    return this.unsavedChanges = true;
  };

  PencilTest.prototype.track = function(x, y) {
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

  PencilTest.prototype.showMenu = function(coords) {
    var option, _i, _len, _ref, _results;
    if (coords == null) {
      coords = {
        x: 10,
        y: 10
      };
    }
    if (!this.menuIsVisible) {
      this.menuIsVisible = true;
      Utils.toggleClass(this.container, 'menu-visible', true);
      coords.x = Math.min(document.body.offsetWidth - this.menuElement.offsetWidth, coords.x);
      coords.y = Math.min(document.body.offsetHeight - this.menuElement.offsetHeight, coords.y);
      this.menuElement.style.left = "" + (coords.x + 1) + "px";
      this.menuElement.style.top = "" + coords.y + "px";
      _ref = this.menuItems;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (option.attributes.rel) {
          _results.push(this.updateMenuOption(option));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  PencilTest.prototype.hideMenu = function() {
    if (this.menuIsVisible) {
      this.menuIsVisible = false;
      return Utils.toggleClass(this.container, 'menu-visible', false);
    }
  };

  PencilTest.prototype.toggleMenu = function(coords) {
    if (this.menuIsVisible) {
      return this.hideMenu();
    } else {
      return this.showMenu(coords);
    }
  };

  PencilTest.prototype.updateCurrentFrame = function(segment) {
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.goToFrame = function(newIndex) {
    newIndex = Math.max(0, Math.min(this.film.frames.length - 1, newIndex));
    this.current.frameNumber = newIndex;
    this.current.frame = this.film.frames[this.current.frameNumber];
    if (this.state.mode !== PencilTest.prototype.modes.PLAYING) {
      this.seekToAudioAtExposure(newIndex);
    }
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.seekToAudioAtExposure = function(frameNumber) {
    var seekTime;
    if (this.film.audio) {
      seekTime = (this.current.frameIndex[frameNumber].time - this.film.audio.offset) * this.singleFrameDuration;
      return this.seekAudio;
    }
  };

  PencilTest.prototype.play = function() {
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
    this.state.mode = PencilTest.prototype.modes.PLAYING;
    return this.playAudio();
  };

  PencilTest.prototype.stop = function() {
    if (this.audioElement) {
      this.pauseAudio();
    }
    clearInterval(this.playInterval);
    if (this.state.mode === PencilTest.prototype.modes.PLAYING) {
      return this.state.mode = PencilTest.prototype.modes.DRAWING;
    }
  };

  PencilTest.prototype.togglePlay = function() {
    if (this.state.mode !== PencilTest.prototype.modes.BUSY) {
      if (this.state.mode === PencilTest.prototype.modes.PLAYING) {
        return this.stop();
      } else {
        return this.play();
      }
    }
  };

  PencilTest.prototype.drawCurrentFrame = function() {
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
    return this.updateStatus();
  };

  PencilTest.prototype.drawFrame = function(frameIndex, lineOptions) {
    var stroke, _i, _len, _ref;
    if (lineOptions) {
      this.renderer.setLineOverrides(lineOptions);
    }
    _ref = this.film.frames[frameIndex].strokes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      this.renderer.path(stroke);
    }
    return this.renderer.clearLineOverrides();
  };

  PencilTest.prototype.lift = function() {
    var last;
    if (this.markBuffer && this.markBuffer.length) {
      last = this.markBuffer.pop();
      this.mark(last.x, last.y);
      this.markBuffer = [];
    }
    return this.currentStrokeIndex = null;
  };

  PencilTest.prototype.dropFrame = function() {
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

  PencilTest.prototype.smoothFrame = function(index, amount) {
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

  PencilTest.prototype.smoothFilm = function(amount) {
    var frame, lastIndex, _i;
    if (this.state.mode === PencilTest.prototype.modes.DRAWING) {
      if (Utils.confirm('Would you like to smooth every frame of this film?')) {
        if (!amount) {
          amount = Number(Utils.prompt('How much to smooth? 1-5', 2));
        }
        this.state.mode = PencilTest.prototype.modes.BUSY;
        lastIndex = this.film.frames.length - 1;
        for (frame = _i = 0; 0 <= lastIndex ? _i <= lastIndex : _i >= lastIndex; frame = 0 <= lastIndex ? ++_i : --_i) {
          this.smoothFrame(frame, amount);
        }
        return this.state.mode = PencilTest.prototype.modes.DRAWING;
      }
    } else {
      return Utils.log('Unable to alter film while playing');
    }
  };

  PencilTest.prototype.undo = function() {
    if (this.getCurrentFrame().strokes && this.getCurrentFrame().strokes.length) {
      if (this.redoQueue == null) {
        this.redoQueue = [];
      }
      this.redoQueue.push(this.getCurrentFrame().strokes.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  };

  PencilTest.prototype.redo = function() {
    if (this.redoQueue && this.redoQueue.length) {
      this.getCurrentFrame().strokes.push(this.redoQueue.pop());
      this.unsavedChanges = true;
      return this.drawCurrentFrame();
    }
  };

  PencilTest.prototype.clearRedo = function() {
    return this.redoQueue = [];
  };

  PencilTest.prototype.setCurrentFrameHold = function(newHold) {
    this.getCurrentFrame().hold = Math.max(1, newHold);
    this.buildFilmMeta();
    return this.updateStatus();
  };

  PencilTest.prototype.updateStatus = function() {
    var markup, _ref;
    if (this.options.showStatus) {
      markup = "<div class=\"settings\">";
      markup += "v" + PencilTest.prototype.state.version;
      markup += " Smoothing: " + this.options.smoothing;
      markup += "</div>";
      markup += "<div class=\"frame\">";
      markup += "" + this.options.frameRate + " FPS";
      markup += " | (hold " + (this.getCurrentFrame().hold) + ")";
      markup += " | " + (this.current.frameNumber + 1) + "/" + this.film.frames.length;
      markup += " | " + (Utils.getDecimal(this.current.frameIndex[this.current.frameNumber].time, 1, String));
      if ((_ref = this.film.audio) != null ? _ref.offset : void 0) {
        markup += " " + (this.film.audio.offset >= 0 ? '+' : '') + this.film.audio.offset;
      }
      markup += "</div>";
      return this.statusElement.innerHTML = markup;
    }
  };

  PencilTest.prototype.newFilm = function() {
    this.film = {
      name: '',
      frames: []
    };
    this.newFrame();
    return this.goToFrame(0);
  };

  PencilTest.prototype.getFilmNames = function() {
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

  PencilTest.prototype.encodeStorageReference = function(namespace, name) {
    return "" + namespace + ":" + name;
  };

  PencilTest.prototype.decodeStorageReference = function(encoded) {
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

  PencilTest.prototype.getStoredData = function(namespace, name) {
    var storageName;
    storageName = this.encodeStorageReference(namespace, name);
    return JSON.parse(window.localStorage.getItem(storageName));
  };

  PencilTest.prototype.putStoredData = function(namespace, name, data) {
    var storageName;
    storageName = this.encodeStorageReference(namespace, name);
    return window.localStorage.setItem(storageName, JSON.stringify(data));
  };

  PencilTest.prototype.saveFilm = function() {
    var name;
    name = window.prompt("what will you name your film?", this.film.name);
    if (name) {
      this.film.name = name;
      this.putStoredData('film', name, this.film);
      return this.unsavedChanges = false;
    }
  };

  PencilTest.prototype.selectFilmName = function(message) {
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

  PencilTest.prototype.setFilm = function(film) {
    this.film = film;
    this.buildFilmMeta();
    if (this.film.audio && this.film.audio.url) {
      this.loadAudio(this.film.audio.url);
    } else {
      this.destroyAudio();
    }
    this.goToFrame(0);
    this.updateStatus();
    return this.unsavedChanges = false;
  };

  PencilTest.prototype.loadFilm = function() {
    var name;
    if (name = this.selectFilmName('Choose a film to load')) {
      return this.setFilm(this.getStoredData('film', name));
    }
  };

  PencilTest.prototype.deleteFilm = function() {
    var filmName;
    if (filmName = this.selectFilmName('Choose a film to DELETE...FOREVER')) {
      return window.localStorage.removeItem(this.encodeStorageReference('film', filmName));
    }
  };

  PencilTest.prototype.buildFilmMeta = function() {
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

  PencilTest.prototype.getFrameDuration = function(frameNumber) {
    var frame;
    if (frameNumber == null) {
      frameNumber = this.current.frameNumber;
    }
    frame = this.film.frames[frameNumber];
    return frame.hold / this.options.frameRate;
  };

  PencilTest.prototype.loadAudio = function(audioURL) {
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

  PencilTest.prototype.destroyAudio = function() {
    if (this.audioElement) {
      this.pauseAudio();
      this.audioElement.remove();
      return this.audioElement = null;
    }
  };

  PencilTest.prototype.pauseAudio = function() {
    if (this.audioElement && !this.audioElement.paused) {
      return this.audioElement.pause();
    }
  };

  PencilTest.prototype.playAudio = function() {
    if (this.audioElement && this.audioElement.paused) {
      return this.audioElement.play();
    }
  };

  PencilTest.prototype.seekAudio = function(time) {
    if (this.audioElement) {
      return this.audioElement.currentTime = time;
    }
  };

  PencilTest.prototype.scrubAudio = function() {
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

  PencilTest.prototype.keyboardShortcuts = function() {
    var action, helpDoc, name, open, _ref;
    open = Utils.toggleClass(this.textElement, 'active');
    if (open) {
      helpDoc = 'Keyboard Shortcuts:\n';
      _ref = this.appActions;
      for (name in _ref) {
        action = _ref[name];
        if (!action.hotkey) {
          continue;
        }
        helpDoc += action.label || name;
        if (action.hotkey) {
          helpDoc += " [" + (action.hotkey.join(' or ')) + "]";
        }
        if (action.title) {
          helpDoc += " - " + action.title;
        }
        helpDoc += '\n';
      }
      return this.textElement.value = helpDoc;
    } else {
      return this.textElement.value = '';
    }
  };

  return PencilTest;

})();
