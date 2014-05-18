
/*
global: document, window
 */
var PencilTest;

PencilTest = (function() {
  function PencilTest(options) {
    var key, optionName, savedOptions, value, _ref, _ref1, _ref2;
    this.options = options;
    savedOptions = this.getStoredData('app', 'options');
    _ref = {
      container: 'body',
      hideCursor: false,
      loop: true,
      showStatus: true,
      frameRate: 12,
      onionSkin: true,
      onionSkinRange: 4,
      onionSkinOpacity: 0.5
    };
    for (key in _ref) {
      value = _ref[key];
      if (savedOptions && typeof savedOptions[key] !== 'undefined') {
        this.options[key] = savedOptions[key];
      }
      if (typeof this.options[key] === 'undefined') {
        this.options[key] = value;
      }
    }
    this.container = document.querySelector(this.options.container);
    this.container.className = 'penciltest-app';
    this.buildContainer();
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    this.addOtherListeners();
    for (optionName in this.options) {
      if ((_ref1 = this.appActions[optionName]) != null) {
        if ((_ref2 = _ref1.action) != null) {
          _ref2.call(this);
        }
      }
    }
    this.newFilm();
    window.penciltest = this;
  }

  PencilTest.prototype.appActions = {
    playPause: {
      label: "Play/Pause",
      hotkey: ['Space'],
      action: function() {
        return this.togglePlay();
      }
    },
    nextFrame: {
      label: "Next Frame",
      hotkey: ['Right', '.'],
      action: function() {
        this.goToFrame(this.currentFrameIndex + 1);
        return this.stop();
      }
    },
    prevFrame: {
      label: "Previous Frame",
      hotkey: ['Left', ','],
      action: function() {
        this.goToFrame(this.currentFrameIndex - 1);
        return this.stop();
      }
    },
    firstFrame: {
      label: "First Frame",
      hotkey: ['Down'],
      action: function() {
        this.goToFrame(0);
        return this.stop();
      }
    },
    lastFrame: {
      label: "Last Frame",
      hotkey: ['Up'],
      action: function() {
        this.goToFrame(this.film.frames.length - 1);
        return this.stop();
      }
    },
    insertFrame: {
      label: "Insert Frame",
      hotkey: ['I'],
      action: function() {
        var newIndex;
        newIndex = this.currentFrameIndex + 1;
        this.newFrame(newIndex);
        return this.goToFrame(newIndex);
      }
    },
    undo: {
      label: "Undo",
      title: "Remove the last line drawn",
      hotkey: ['U', 'Ctrl+Z'],
      repeat: true,
      action: function() {
        return this.undo();
      }
    },
    redo: {
      label: "Redo",
      title: "Put back a line removed by 'Undo'",
      hotkey: ['R', 'Ctrl+Shift+Z', 'Ctrl+Y'],
      repeat: true,
      action: function() {
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
      hotkey: ['Backspace'],
      listener: function() {
        return this.dropFrame();
      }
    },
    lessHold: {
      label: "Shorter Frame Hold",
      hotkey: ['-'],
      listener: function() {
        return this.setCurrentFrameHold(this.getCurrentFrame().hold - 1);
      }
    },
    omreHold: {
      label: "Longer Frame Hold",
      hotkey: ['+', '='],
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
      hotkey: ['Ctrl+S'],
      repeat: true,
      listener: function() {
        return this.saveFilm();
      }
    },
    loadFilm: {
      label: "Load",
      hotkey: ['Ctrl+O'],
      repeat: true,
      listener: function() {
        return this.loadFilm();
      }
    },
    newFilm: {
      label: "New",
      hotkey: ['Ctrl+N'],
      repeat: true,
      listener: function() {
        if (Utils.confirm("This will BURN your current animation.")) {
          return this.newFilm();
        }
      }
    },
    deleteFilm: {
      label: "Delete Film",
      hotkey: ['Ctrl+Backspace'],
      listener: function() {
        return this.deleteFilm();
      }
    },
    showHelp: {
      label: "Help",
      title: "Show Keyboard Shortcuts",
      hotkey: ['?'],
      listener: function() {
        return this.showHelp();
      }
    }
  };

  PencilTest.prototype.menuOptions = ['hideCursor', 'onionSkin', 'loop', 'saveFilm', 'loadFilm', 'newFilm', 'showHelp'];

  PencilTest.prototype.buildContainer = function() {
    var key, label, markup, title, _i, _len, _ref;
    markup = '<div class="field">' + '<div class="status"></div>' + '</div>' + '<ul class="menu">';
    _ref = this.menuOptions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      label = this.appActions[key].label;
      title = this.appActions[key].title;
      markup += "<li rel=\"" + key + "\" title=\"" + title + "\">" + label + "</li>";
    }
    markup += '</ul>';
    this.container.innerHTML = markup;
    this.fieldElement = this.container.querySelector('.field');
    this.field = new Raphael(this.fieldElement);
    return this.statusElement = this.container.querySelector('.status');
  };

  PencilTest.prototype.addInputListeners = function() {
    var contextMenuListener, getEventPageXY, markFromEvent, mouseDownListener, mouseMoveListener, mouseUpListener, self;
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
    markFromEvent = function(event) {
      var coords;
      coords = getEventPageXY(event);
      return self.mark(coords.x - self.fieldElement.offsetLeft, coords.y - self.fieldElement.offsetTop);
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
        markFromEvent(event);
        document.body.addEventListener('mousemove', mouseMoveListener);
        document.body.addEventListener('touchmove', mouseMoveListener);
        document.body.addEventListener('mouseup', mouseUpListener);
        return document.body.addEventListener('touchend', mouseUpListener);
      }
    };
    mouseMoveListener = function(event) {
      event.preventDefault();
      if (!self.isPlaying) {
        return markFromEvent(event);
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
    var menuOptionListener, option, self, _i, _len, _ref, _results;
    self = this;
    this.menuElement = this.container.querySelector('.menu');
    this.menuItems = this.menuElement.getElementsByTagName('li');
    menuOptionListener = function(event) {
      var optionName;
      event.preventDefault();
      optionName = this.attributes.rel.value;
      self.doAppAction(optionName);
      return self.hideMenu();
    };
    _ref = this.menuItems;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('mouseup', menuOptionListener);
      option.addEventListener('touchend', menuOptionListener);
      _results.push(option.addEventListener('contextmenu', menuOptionListener));
    }
    return _results;
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
          } else {
            this.keyBindings.keyup[hotkey] = name;
          }
        }
      }
    }
    keyboardListener = function(event) {
      var actionName, combo;
      combo = Utils.describeKeyCombo(event);
      actionName = self.keyBindings[event.type][combo];
      if (actionName) {
        event.preventDefault();
        self.doAppAction(actionName);
      }
      if (event.keyCode !== 0) {
        return Utils.log("" + event.type + "-" + combo + " (" + event.keyCode + ")");
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
      if (self.unsavedChanges) {
        return event.returnValue = "You have unsaved changes. Ctrl+S to save.";
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
    return this.film.frames.splice(index, 0, frame);
  };

  PencilTest.prototype.getCurrentFrame = function() {
    return this.film.frames[this.currentFrameIndex];
  };

  PencilTest.prototype.getCurrentStroke = function() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex || 0];
  };

  PencilTest.prototype.mark = function(x, y) {
    if (this.currentStrokeIndex != null) {
      if (this.drawSegmentEnd) {
        this.drawSegmentStart = this.drawSegmentEnd.replace(/^L/, 'M');
      }
      this.drawSegmentEnd = "L" + x + " " + y;
      this.getCurrentStroke().push(this.drawSegmentEnd);
      this.field.path("" + this.drawSegmentStart + this.drawSegmentEnd);
    } else {
      this.currentStrokeIndex = this.getCurrentFrame().strokes.length;
      this.drawSegmentStart = "M" + x + " " + y;
      this.drawSegmentEnd = null;
      this.getCurrentFrame().strokes.push([this.drawSegmentStart]);
    }
    this.clearRedo();
    return this.unsavedChanges = true;
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
        _results.push(this.updateMenuOption(option));
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

  PencilTest.prototype.goToFrame = function(newIndex, stop) {
    if (stop == null) {
      stop = false;
    }
    if (newIndex < 0 || newIndex >= this.film.frames.length) {
      newIndex = Math.max(0, Math.min(this.film.frames.length, newIndex));
      this.newFrame(newIndex);
      this.lift();
    }
    this.currentFrameIndex = newIndex;
    this.drawCurrentFrame();
    if (stop !== false) {
      return this.stop();
    }
  };

  PencilTest.prototype.play = function() {
    var self, stepListener;
    self = this;
    if (this.currentFrameIndex < this.film.frames.length - 1) {
      this.framesHeld = 0;
    } else {
      this.framesHeld = -1;
      this.goToFrame(0);
    }
    stepListener = function() {
      var currentFrame;
      self.framesHeld++;
      currentFrame = self.getCurrentFrame();
      if (self.framesHeld >= currentFrame.hold) {
        self.framesHeld = 0;
        if (self.currentFrameIndex >= self.film.frames.length - 1) {
          if (self.options.loop) {
            return self.goToFrame(0);
          } else {
            return self.stop();
          }
        } else {
          return self.goToFrame(self.currentFrameIndex + 1);
        }
      }
    };
    this.stop();
    this.playInterval = setInterval(stepListener, 1000 / this.options.frameRate);
    this.lift();
    return this.isPlaying = true;
  };

  PencilTest.prototype.stop = function() {
    clearInterval(this.playInterval);
    return this.isPlaying = false;
  };

  PencilTest.prototype.togglePlay = function() {
    if (this.isPlaying) {
      return this.stop();
    } else {
      return this.play();
    }
  };

  PencilTest.prototype.drawCurrentFrame = function() {
    var i, _i, _ref;
    this.field.clear();
    if (this.options.onionSkin) {
      for (i = _i = 0, _ref = this.options.onionSkinRange; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        if (this.currentFrameIndex > i - 1) {
          this.drawFrame(this.currentFrameIndex - i, "rgba(255,0,0," + (Math.pow(this.options.onionSkinOpacity, i)) + ")");
        }
        if (this.currentFrameIndex < this.film.frames.length - i) {
          this.drawFrame(this.currentFrameIndex + i, "rgba(0,0,255," + (Math.pow(this.options.onionSkinOpacity, i)) + ")");
        }
      }
    }
    this.drawFrame(this.currentFrameIndex);
    return this.updateStatus();
  };

  PencilTest.prototype.drawFrame = function(frameIndex, color) {
    var path, stroke, _i, _len, _ref, _results;
    if (color == null) {
      color = null;
    }
    _ref = this.film.frames[frameIndex].strokes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      path = this.field.path(stroke.join(''));
      if (color) {
        _results.push(path[0].style.stroke = color);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  PencilTest.prototype.lift = function() {
    return this.currentStrokeIndex = null;
  };

  PencilTest.prototype.dropFrame = function() {
    this.film.frames.splice(this.currentFrameIndex, 1);
    if (this.currentFrameIndex >= this.film.frames.length && this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
    }
    if (this.film.frames.length === 0) {
      this.newFrame();
    }
    return this.drawCurrentFrame();
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
    return this.updateStatus();
  };

  PencilTest.prototype.updateStatus = function() {
    var markup;
    if (this.options.showStatus) {
      markup = "" + this.options.frameRate + " FPS";
      markup += " | (hold " + (this.getCurrentFrame().hold) + ")";
      markup += " | " + (this.currentFrameIndex + 1) + "/" + this.film.frames.length;
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
      if (selectedFilmName && filmNames.indexOf(selectedFilmName === -1)) {
        return selectedFilmName;
      } else {
        Utils.alert("No film by that name.");
      }
    } else {
      Utils.alert("You don't have any saved films yet.");
    }
    return false;
  };

  PencilTest.prototype.loadFilm = function() {
    var name;
    if (name = this.selectFilmName('Choose a film to load')) {
      this.film = this.getStoredData('film', name);
      this.goToFrame(0);
      this.updateStatus();
      return this.unsavedChanges = false;
    }
  };

  PencilTest.prototype.deleteFilm = function() {
    var filmName;
    if (filmName = this.selectFilmName('Choose a film to DELETE...FOREVER')) {
      return window.localStorage.removeItem(this.encodeStorageReference('film', filmName));
    }
  };

  PencilTest.prototype.showHelp = function() {
    var action, helpDoc, name, _ref;
    helpDoc = 'Keyboard Shortcuts:\n';
    _ref = this.appActions;
    for (name in _ref) {
      action = _ref[name];
      helpDoc += action.label || name;
      if (action.hotkey) {
        helpDoc += " [" + (action.hotkey.join(' or ')) + "]";
      }
      if (action.title) {
        helpDoc += " - " + action.title;
      }
      helpDoc += '\n';
    }
    return alert(helpDoc);
  };

  return PencilTest;

})();
