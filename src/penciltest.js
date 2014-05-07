
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
      if ((_ref1 = this.optionListeners[optionName]) != null) {
        if ((_ref2 = _ref1.action) != null) {
          _ref2.call(this);
        }
      }
    }
    this.newFilm();
    window.penciltest = this;
  }

  PencilTest.prototype.optionListeners = {
    undo: {
      label: "Undo",
      action: function() {
        return this.undo();
      }
    },
    hideCursor: {
      label: "Hide Cursor",
      listener: function() {
        return this.options.hideCursor = !this.options.hideCursor;
      },
      action: function() {
        return Utils.toggleClass(this.container, 'hide-cursor', this.options.hideCursor);
      }
    },
    onionSkin: {
      label: "Onion Skin",
      listener: function() {
        this.options.onionSkin = !this.options.onionSkin;
        return this.drawCurrentFrame();
      }
    },
    frameRate: {
      label: "Frame Rate",
      listener: function() {
        return null;
      }
    },
    loop: {
      label: "Loop",
      listener: function() {
        return this.options.loop = !this.options.loop;
      }
    },
    saveFilm: {
      label: "Save",
      listener: function() {
        return this.saveFilm();
      }
    },
    loadFilm: {
      label: "Load",
      listener: function() {
        return this.loadFilm();
      }
    },
    newFilm: {
      label: "New",
      listener: function() {
        if (Utils.confirm("This will BURN your current animation.")) {
          return this.newFilm();
        }
      }
    }
  };

  PencilTest.prototype.menuOptions = ['undo', 'hideCursor', 'onionSkin', 'frameRate', 'loop', 'saveFilm', 'loadFilm', 'newFilm'];

  PencilTest.prototype.buildContainer = function() {
    var key, markup, _i, _len, _ref;
    markup = '<div class="field"></div>' + '<ul class="menu">';
    _ref = this.menuOptions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      markup += "<li rel=\"" + key + "\">" + this.optionListeners[key].label + "</li>";
    }
    markup += '</ul>';
    this.container.innerHTML = markup;
    this.fieldElement = this.container.querySelector('.field');
    return this.field = new Raphael(this.fieldElement);
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
      return self.showMenu(getEventPageXY(event));
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

  PencilTest.prototype.addMenuListeners = function() {
    var menuOptionListener, option, self, _i, _len, _ref, _results;
    self = this;
    this.menuElement = this.container.querySelector('.menu');
    this.menuItems = this.menuElement.getElementsByTagName('li');
    menuOptionListener = function(event) {
      var optionName, _ref, _ref1;
      optionName = this.attributes.rel.value;
      if ((_ref = self.optionListeners[optionName].listener) != null) {
        _ref.call(self);
      }
      if ((_ref1 = self.optionListeners[optionName].action) != null) {
        _ref1.call(self);
      }
      self.updateMenuOption(this);
      return self.hideMenu();
    };
    _ref = this.menuItems;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('mouseup', menuOptionListener);
      option.addEventListener('touchend', menuOptionListener);
      _results.push(this.updateMenuOption(option));
    }
    return _results;
  };

  PencilTest.prototype.addKeyboardListeners = function() {
    var keyboardHandlers, keyboardListener, self;
    self = this;
    keyboardHandlers = {
      keydown: {
        32: function() {
          return this.togglePlay();
        },
        37: function() {
          return this.prevFrame('stop');
        },
        38: function() {
          return this.lastFrame('stop');
        },
        39: function() {
          return this.nextFrame('stop');
        },
        40: function() {
          return this.firstFrame('stop');
        }
      },
      keyup: {
        8: function() {
          return this.dropFrame();
        },
        48: function() {},
        49: function() {},
        50: function() {},
        51: function() {},
        52: function() {},
        53: function() {},
        54: function() {},
        55: function() {},
        56: function() {},
        57: function() {},
        189: function() {
          return this.getCurrentFrame().hold++;
        },
        187: function() {
          return this.getCurrentFrame().hold--;
        }
      }
    };
    keyboardListener = function(event) {
      if ((keyboardHandlers[event.type] != null) && (keyboardHandlers[event.type][event.keyCode] != null)) {
        event.preventDefault();
        return keyboardHandlers[event.type][event.keyCode].apply(self, [event]);
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
    }
  };

  PencilTest.prototype.showMenu = function(coords) {
    if (coords == null) {
      coords = {
        x: 10,
        y: 10
      };
    }
    Utils.toggleClass(this.container, 'menu-visible', true);
    coords.x = Math.min(document.body.offsetWidth - this.menuElement.offsetWidth, coords.x);
    coords.y = Math.min(document.body.offsetHeight - this.menuElement.offsetHeight, coords.y);
    this.menuElement.style.left = "" + coords.x + "px";
    return this.menuElement.style.top = "" + coords.y + "px";
  };

  PencilTest.prototype.hideMenu = function() {
    return Utils.toggleClass(this.container, 'menu-visible', false);
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
        this.drawFrame(this.currentFrameIndex - 1, "rgba(0,0,255," + this.options.onionSkinOpacity + ")");
      }
      if (this.currentFrameIndex < this.frames.length - 1) {
        this.drawFrame(this.currentFrameIndex + 1, "rgba(255,0,0," + (this.options.onionSkinOpacity / 2) + ")");
      }
    }
    return this.drawFrame(this.currentFrameIndex);
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
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex--;
    }
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.undo = function() {
    this.getCurrentFrame().strokes.pop();
    return this.drawCurrentFrame();
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
    if ((films[name] == null) || Utils.confirm("Overwrite existing film \"" + name + "\"?")) {
      films[name] = this.frames;
      return window.localStorage.setItem('films', JSON.stringify(films));
    }
  };

  PencilTest.prototype.loadFilm = function() {
    var film, filmNames, films, loadFilmName, name;
    films = this.getSavedFilms();
    filmNames = [];
    for (name in films) {
      film = films[name];
      filmNames.push(name);
    }
    if (filmNames.length) {
      loadFilmName = window.prompt("Choose a film to load:\n\n" + (filmNames.join('\n')));
      if (films[loadFilmName]) {
        this.frames = films[loadFilmName];
        return this.goToFrame(0);
      }
    } else {
      return Utils.alert("You don't have any saved films yet.");
    }
  };

  return PencilTest;

})();
