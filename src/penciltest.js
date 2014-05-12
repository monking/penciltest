
/*
global: document, window
 */
var PencilTest;

PencilTest = (function() {
  function PencilTest(options) {
    var key, optionName, value, _ref, _ref1, _ref2;
    this.options = options;
    _ref = {
      container: document.body,
      containerSelector: 'body',
      hideCursor: false,
      loop: true,
      showStatus: true,
      frameRate: 12,
      onionSkin: true,
      onionSkinOpacity: 0.5
    };
    for (key in _ref) {
      value = _ref[key];
      if (typeof this.options[key] === 'undefined') {
        this.options[key] = value;
      }
    }
    this.container = this.options.container || document.querySelector(this.options.containerSelector);
    this.container.className = 'penciltest-app';
    this.buildContainer();
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
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
        return this.nextFrame('stop');
      }
    },
    prevFrame: {
      label: "Previous Frame",
      hotkey: ['Left', ','],
      action: function() {
        return this.prevFrame('stop');
      }
    },
    firstFrame: {
      label: "First Frame",
      hotkey: ['Down'],
      action: function() {
        return this.firstFrame('stop');
      }
    },
    lastFrame: {
      label: "Last Frame",
      hotkey: ['Up'],
      action: function() {
        return this.lastFrame('stop');
      }
    },
    undo: {
      label: "Undo",
      title: "Remove the last line drawn",
      hotkey: ['Ctrl+Z', 'U'],
      action: function() {
        return this.undo();
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
      return markFromEvent(event);
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

  PencilTest.prototype.newFrame = function(prepend) {
    var newFrame;
    if (prepend == null) {
      prepend = false;
    }
    newFrame = {
      hold: 1,
      strokes: []
    };
    if (prepend !== false) {
      this.currentFrameIndex = 0;
      this.frames.unshift(newFrame);
    } else {
      this.currentFrameIndex = this.frames.length;
      this.frames.push(newFrame);
    }
    this.currentStrokeIndex = null;
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.getCurrentFrame = function() {
    return this.frames[this.currentFrameIndex];
  };

  PencilTest.prototype.getCurrentStroke = function() {
    return this.getCurrentFrame().strokes[this.currentStrokeIndex];
  };

  PencilTest.prototype.mark = function(x, y) {
    if (this.currentStrokeIndex === null) {
      this.currentStrokeIndex = this.getCurrentFrame().strokes.length;
      return this.getCurrentFrame().strokes.push(["M" + x + " " + y]);
    } else {
      this.getCurrentStroke().push("L" + x + " " + y);
      return this.drawCurrentFrame();

      /* FIXME: find a faster way to draw each segment of the line than to redraw the whole frame */
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
    if (newIndex < 0) {
      this.newFrame('prepend');
    } else if (newIndex >= this.frames.length) {
      this.newFrame();
    } else {
      this.currentFrameIndex = newIndex;
    }
    this.drawCurrentFrame();
    if (stop !== false) {
      return this.stop();
    }
  };

  PencilTest.prototype.play = function() {
    var self, stepListener;
    self = this;
    if (this.currentFrameIndex < this.frames.length - 1) {
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
        if (self.currentFrameIndex >= self.frames.length - 1) {
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
    this.field.clear();
    if (this.options.onionSkin) {
      if (this.currentFrameIndex > 0) {
        this.drawFrame(this.currentFrameIndex - 1, "rgba(255,0,0," + this.options.onionSkinOpacity + ")");
      }
      if (this.currentFrameIndex < this.frames.length - 1) {
        this.drawFrame(this.currentFrameIndex + 1, "rgba(0,0,255," + (this.options.onionSkinOpacity / 2) + ")");
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
    _ref = this.frames[frameIndex].strokes;
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

  PencilTest.prototype.nextFrame = function(stop) {
    if (stop == null) {
      stop = false;
    }
    this.goToFrame(this.currentFrameIndex + 1);
    if (stop) {
      return this.stop();
    }
  };

  PencilTest.prototype.prevFrame = function(stop) {
    if (stop == null) {
      stop = false;
    }
    this.goToFrame(this.currentFrameIndex - 1);
    if (stop) {
      return this.stop();
    }
  };

  PencilTest.prototype.firstFrame = function(stop) {
    if (stop == null) {
      stop = false;
    }
    this.goToFrame(0);
    if (stop) {
      return this.stop();
    }
  };

  PencilTest.prototype.lastFrame = function(stop) {
    if (stop == null) {
      stop = false;
    }
    this.goToFrame(this.frames.length - 1);
    if (stop) {
      return this.stop();
    }
  };

  PencilTest.prototype.dropFrame = function() {
    this.frames.splice(this.currentFrameIndex, 1);
    if (this.currentFrameIndex >= this.frames.length && this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
    }
    if (this.frames.length > 0) {
      return this.drawCurrentFrame();
    } else {
      return this.newFrame();
    }
  };

  PencilTest.prototype.undo = function() {
    this.getCurrentFrame().strokes.pop();
    return this.drawCurrentFrame();
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
      markup += " | " + (this.currentFrameIndex + 1) + "/" + this.frames.length;
      return this.statusElement.innerHTML = markup;
    }
  };

  PencilTest.prototype.getSavedFilms = function() {
    var error, filmData, films;
    films = {};
    filmData = window.localStorage.getItem('films');
    if (filmData) {
      try {
        films = JSON.parse(filmData);
      } catch (_error) {
        error = _error;
        Utils.log(error);
      }
    }
    return films;
  };

  PencilTest.prototype.newFilm = function() {
    this.frames = [];
    return this.newFrame();
  };

  PencilTest.prototype.saveFilm = function() {
    var films, name;
    films = this.getSavedFilms();
    name = window.prompt("what will you name your film?");
    if (name && ((films[name] == null) || Utils.confirm("Overwrite existing film \"" + name + "\"?"))) {
      films[name] = this.frames;
      return window.localStorage.setItem('films', JSON.stringify(films));
    }
  };

  PencilTest.prototype.loadFilm = function() {
    var film, filmName, filmNames, films, loadFilmName, name, _i, _len;
    films = this.getSavedFilms();
    filmNames = [];
    for (name in films) {
      film = films[name];
      filmNames.push(name);
    }
    if (filmNames.length) {
      loadFilmName = window.prompt("Choose a film to load:\n\n" + (filmNames.join('\n')));
      if (loadFilmName && !films[loadFilmName]) {
        for (_i = 0, _len = filmNames.length; _i < _len; _i++) {
          filmName = filmNames[_i];
          if (RegExp(loadFilmName).test(filmName)) {
            loadFilmName = filmName;
          }
        }
      }
      if (loadFilmName) {
        this.frames = films[loadFilmName];
        this.goToFrame(0);
        return this.updateStatus();
      } else {
        return Utils.alert("No film by that name.");
      }
    } else {
      return Utils.alert("You don't have any saved films yet.");
    }
  };

  PencilTest.prototype.deleteFilm = function() {
    var deleteFilmName, film, filmNames, films, name;
    films = this.getSavedFilms();
    filmNames = [];
    for (name in films) {
      film = films[name];
      filmNames.push(name);
    }
    if (filmNames.length) {
      deleteFilmName = window.prompt("Choose a film to DELETE...FOREVER:\n\n" + (filmNames.join('\n')));
      if (films[deleteFilmName]) {
        delete films[deleteFilmName];
        return window.localStorage.setItem('films', JSON.stringify(films));
      }
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
