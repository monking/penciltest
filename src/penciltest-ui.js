var PenciltestUI;

PenciltestUI = (function() {
  function PenciltestUI(controller) {
    this.controller = controller;
    this.container = document.createElement('div');
    this.container.innerHTML = '<textarea></textarea>' + '<ul class="menu">' + this.menuWalker(this.menuOptions) + '</ul>';
    this.controller.container.appendChild(this.container);
    this.textElement = this.controller.container.querySelector('textarea');
    this.statusElement = this.controller.container.querySelector('.status');
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    this.addOtherListeners();
  }

  PenciltestUI.prototype.appActions = {
    renderer: {
      label: "Set Renderer",
      listener: function() {
        var name;
        name = Utils.prompt('renderer (svg, canvas): ', this.options.renderer);
        if (name in this.availableRenderers) {
          return this.setOptions({
            renderer: name
          });
        }
      },
      action: function() {
        var _ref;
        if (this.fieldElement) {
          if ((_ref = this.renderer) != null) {
            _ref.destroy();
          }
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
        return this.setOptions({
          hideCursor: !this.options.hideCursor
        });
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
        this.setOptions({
          onionSkin: !this.options.onionSkin
        });
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
        return this.setOptions({
          smoothing: Number(Utils.prompt('Smoothing', this.options.smoothing))
        });
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
        return this.setOptions({
          showStatus: !this.options.showStatus
        });
      },
      action: function() {
        return Utils.toggleClass(this.ui.statusElement, 'hidden', !this.options.showStatus);
      }
    },
    loop: {
      label: "Loop",
      hotkey: ['L'],
      listener: function() {
        return this.setOptions({
          loop: !this.options.loop
        });
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
        open = Utils.toggleClass(this.ui.textElement, 'active');
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
        open = Utils.toggleClass(this.ui.textElement, 'active');
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
        return this.ui.updateStatus();
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
        return this.ui.updateStatus();
      }
    },
    describeKeyboardShortcuts: {
      label: "Keyboard Shortcuts",
      hotkey: ['?'],
      listener: function() {
        return this.ui.describeKeyboardShortcuts();
      }
    },
    reset: {
      label: "Reset",
      title: "Clear settings; helpful if the app has stopped working.",
      action: function() {
        this.state = Utils.inherit({}, Penciltest.prototype.state);
        return this.setOptions(Utils.inherit({}, Penciltest.prototype.options));
      }
    }
  };

  PenciltestUI.prototype.menuOptions = [
    {
      _icons: ['firstFrame', 'prevFrame', 'playPause', 'nextFrame', 'lastFrame'],
      Edit: ['undo', 'redo', 'insertFrameAfter', 'insertFrameBefore', 'insertSeconds', 'dropFrame', 'moreHold', 'lessHold'],
      Playback: ['loop'],
      Tools: ['hideCursor', 'onionSkin', 'showStatus', 'smoothing', 'smoothFrame', 'smoothFilm', 'importAudio'],
      Film: ['saveFilm', 'loadFilm', 'newFilm', 'importFilm', 'exportFilm'],
      Settings: ['renderer', 'describeKeyboardShortcuts', 'reset']
    }
  ];

  PenciltestUI.prototype.doAppAction = function(optionName) {
    var _ref;
    return (_ref = this.appActions[optionName].listener) != null ? _ref.call(this.controller) : void 0;
  };

  PenciltestUI.prototype.menuWalker = function(level) {
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

  PenciltestUI.prototype.addInputListeners = function() {
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
      return self.controller.track(pageCoords.x - self.controller.fieldContainer.offsetLeft, pageCoords.y - self.controller.fieldContainer.offsetTop);
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
      if (self.controller.state.mode === Penciltest.prototype.modes.DRAWING) {
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
        return self.controller.lift();
      }
    };
    contextMenuListener = function(event) {
      event.preventDefault();
      return self.toggleMenu(getEventPageXY(event));
    };
    this.controller.fieldElement.addEventListener('mousedown', mouseDownListener);
    this.controller.fieldElement.addEventListener('touchstart', mouseDownListener);
    return this.controller.fieldElement.addEventListener('contextmenu', contextMenuListener);
  };

  PenciltestUI.prototype.updateMenuOption = function(optionElement) {
    var optionName;
    optionName = optionElement.attributes.rel.value;
    if (typeof this.controller.options[optionName] === 'boolean') {
      return Utils.toggleClass(optionElement, 'enabled', this.controller.options[optionName]);
    }
  };

  PenciltestUI.prototype.addMenuListeners = function() {
    var menuOptionListener, option, self, _i, _len, _ref;
    self = this;
    this.menuElement = this.controller.container.querySelector('.menu');
    this.menuItems = this.menuElement.querySelectorAll('LI');
    menuOptionListener = function(event) {
      var optionName;
      if (/\bgroup\b/.test(this.className)) {
        return Utils.toggleClass(this, 'collapsed');
      } else if (this.attributes.rel) {
        event.preventDefault();
        optionName = this.attributes.rel.value;
        self.doAppAction(optionName);
        return self.controller.hideMenu();
      }
    };
    _ref = this.menuItems;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('mouseup', menuOptionListener);
      option.addEventListener('touchend', menuOptionListener);
      option.addEventListener('contextmenu', menuOptionListener);
    }
    return this.textElement = this.controller.container.querySelector('textarea');
  };

  PenciltestUI.prototype.addKeyboardListeners = function() {
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

  PenciltestUI.prototype.addOtherListeners = function() {
    var self;
    self = this;
    return window.addEventListener('beforeunload', function() {
      self.controller.putStoredData('app', 'options', self.controller.options);
      self.controller.putStoredData('app', 'state', self.controller.state);
      if (self.controller.unsavedChanges) {
        return event.returnValue = "You have unsaved changes. Alt+S to save.";
      }
    });
  };

  PenciltestUI.prototype.describeKeyboardShortcuts = function() {
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

  PenciltestUI.prototype.updateStatus = function() {
    var markup, _ref;
    if (this.controller.options.showStatus) {
      markup = "<div class=\"settings\">";
      markup += "v" + Penciltest.prototype.state.version;
      markup += " Smoothing: " + this.controller.options.smoothing;
      markup += "</div>";
      markup += "<div class=\"frame\">";
      markup += "" + this.controller.options.frameRate + " FPS";
      markup += " | (hold " + (this.controller.getCurrentFrame().hold) + ")";
      markup += " | " + (this.controller.current.frameNumber + 1) + "/" + this.controller.film.frames.length;
      markup += " | " + (Utils.getDecimal(this.controller.current.frameIndex[this.controller.current.frameNumber].time, 1, String));
      if ((_ref = this.controller.film.audio) != null ? _ref.offset : void 0) {
        markup += " " + (this.controller.film.audio.offset >= 0 ? '+' : '') + this.controller.film.audio.offset;
      }
      markup += "</div>";
      return this.statusElement.innerHTML = markup;
    }
  };

  PenciltestUI.prototype.showMenu = function(coords) {
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
          _results.push(this.ui.updateMenuOption(option));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  PenciltestUI.prototype.hideMenu = function() {
    if (this.menuIsVisible) {
      this.menuIsVisible = false;
      return Utils.toggleClass(this.container, 'menu-visible', false);
    }
  };

  PenciltestUI.prototype.toggleMenu = function(coords) {
    if (this.menuIsVisible) {
      return this.hideMenu();
    } else {
      return this.showMenu(coords);
    }
  };

  return PenciltestUI;

})();
