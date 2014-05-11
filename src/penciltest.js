
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
      label: "Undo [u]",
      title: "Remove the last line drawn",
      action: function() {
        return this.undo();
      }
    },
    hideCursor: {
      label: "Hide Cursor [c]",
      listener: function() {
        return this.options.hideCursor = !this.options.hideCursor;
      },
      action: function() {
        return Utils.toggleClass(this.container, 'hide-cursor', this.options.hideCursor);
      }
    },
    onionSkin: {
      label: "Onion Skin [o]",
      title: "show previous and next frames in red and blue",
      listener: function() {
        this.options.onionSkin = !this.options.onionSkin;
        return this.drawCurrentFrame();
      }
    },
    showStatus: {
      label: "Show Status [s]",
      title: "hide the status to [slightly] improve performance",
      listener: function() {
        return this.options.showStatus = !this.options.showStatus;
      },
      action: function() {
        return Utils.toggleClass(this.statusElement, 'hidden', !this.options.showStatus);
      }
    },
    loop: {
      label: "Loop [l]",
      listener: function() {
        return this.options.loop = !this.options.loop;
      }
    },
    saveFilm: {
      label: "Save [ctrl+s]",
      listener: function() {
        return this.saveFilm();
      }
    },
    loadFilm: {
      label: "Load [ctrl+o]",
      listener: function() {
        return this.loadFilm();
      }
    },
    newFilm: {
      label: "New [ctrl+n]",
      listener: function() {
        if (Utils.confirm("This will BURN your current animation.")) {
          return this.newFilm();
        }
      }
    },
    help: {
      label: "Help [?]",
      listener: function() {
        return this.showHelp();
      }
    }
  };

  PencilTest.prototype.menuOptions = ['undo', 'hideCursor', 'onionSkin', 'loop', 'saveFilm', 'loadFilm', 'newFilm', 'help', 'showStatus'];

  PencilTest.prototype.buildContainer = function() {
    var key, label, markup, title, _i, _len, _ref;
    markup = '<div class="field">' + '<div class="status"></div>' + '</div>' + '<ul class="menu">';
    _ref = this.menuOptions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      label = this.optionListeners[key].label;
      title = this.optionListeners[key].title;
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

  PencilTest.prototype.selectMenuOption = function(optionName) {
    var _ref, _ref1;
    if ((_ref = this.optionListeners[optionName].listener) != null) {
      _ref.call(this);
    }
    return (_ref1 = this.optionListeners[optionName].action) != null ? _ref1.call(this) : void 0;
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
      self.selectMenuOption(optionName);
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
    var documentBindings, keyboardHandlers, keyboardListener, self;
    self = this;
    keyboardHandlers = {
      keydown: {
        32: function() {
          return this.togglePlay();
        },
        37: function() {
          return this.prevFrame('stop');
        },
        39: function() {
          return this.nextFrame('stop');
        },
        40: function() {
          return this.firstFrame('stop');
        },
        38: function() {
          return this.lastFrame('stop');
        },
        67: function() {
          return this.selectMenuOption('hideCursor');
        },
        76: function() {
          return this.selectMenuOption('loop');
        }
      },
      keyup: {
        79: function() {
          return this.selectMenuOption('onionSkin');
        },
        189: function() {
          return this.setCurrentFrameHold(this.getCurrentFrame().hold - 1);
        },
        187: function() {
          return this.setCurrentFrameHold(this.getCurrentFrame().hold + 1);
        },
        8: function() {
          return this.dropFrame();
        }
      },
      modifiers: {
        ctrl: {
          keydown: {
            83: function() {
              return this.saveFilm();
            },
            79: function() {
              return this.loadFilm();
            },
            78: function() {
              return this.newFilm();
            },
            8: function() {
              return this.deleteFilm();
            }
          }
        },
        shift: {
          keydown: {
            191: function() {
              return this.showHelp();
            }
          }
        }
      }
    };
    keyboardListener = function(event) {
      var keySet;
      if (event.ctrlKey) {
        keySet = keyboardHandlers.modifiers.ctrl;
      } else if (event.shiftKey) {
        keySet = keyboardHandlers.modifiers.shift;
      } else {
        keySet = keyboardHandlers;
      }
      if ((keySet[event.type] != null) && (keySet[event.type][event.keyCode] != null)) {
        event.preventDefault();
        keySet[event.type][event.keyCode].apply(self, [event]);
      }
      if (event.keyCode !== 0) {
        return Utils.log("" + event.type + "-" + event.keyCode);
      }
    };
    document.body.addEventListener('keydown', keyboardListener);
    document.body.addEventListener('keyup', keyboardListener);
    documentBindings = function(keySet, markup, combo) {
      var action, eventType, handlers, keyCode, lookupList, modifier, subset;
      if (markup == null) {
        markup = '';
      }
      if (combo == null) {
        combo = [];
      }
      for (eventType in keySet) {
        handlers = keySet[eventType];
        if (eventType === 'modifiers') {
          for (modifier in handlers) {
            subset = handlers[modifier];
            markup = documentBindings(subset, markup, combo.concat([modifier]));
          }
        } else {
          for (keyCode in handlers) {
            action = handlers[keyCode];
            if (combo.indexOf('shift') > -1) {
              lookupList = Utils.shiftKeyCodeNames;
            } else {
              lookupList = Utils.keyCodeNames;
            }
            markup += ("" + (combo.concat(lookupList[keyCode]).join(' + ')) + ":") + (" " + (action.toString().replace(/function \(\) {\n\s*return |\n\s*}/g, '')) + "\n");
          }
        }
      }
      return markup;
    };
    return this.keyBindingsDoc = documentBindings(keyboardHandlers);
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
        this.goToFrame(0);
        return this.updateStatus();
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
    return Utils.alert(this.keyBindingsDoc);
  };

  return PencilTest;

})();
