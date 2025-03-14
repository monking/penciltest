var PenciltestUI,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

PenciltestUI = (function(_super) {
  __extends(PenciltestUI, _super);

  function PenciltestUI(controller) {
    this.controller = controller;
    PenciltestUI.__super__.constructor.call(this, {
      className: 'penciltest-ui',
      parent: this.controller.container
    });
    this.markupDOMElements();
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    this.addOtherListeners();
  }

  PenciltestUI.prototype.markupDOMElements = function() {
    var componentInfo, name, options;
    this.components = {};
    componentInfo = {
      toolbar: {
        className: 'toolbar',
        parent: this
      },
      statusBar: {
        className: 'status',
        parent: 'toolbar'
      },
      statusLeft: {
        className: 'status-left',
        parent: 'statusBar'
      },
      statusRight: {
        className: 'status-right',
        parent: 'statusBar'
      },
      appStatus: {
        className: 'app-status',
        parent: 'statusLeft'
      },
      filmStatus: {
        className: 'film-status',
        parent: 'statusRight'
      },
      toggleTool: {
        tagName: 'button',
        className: 'toggle-tool fa fa-pencil',
        parent: 'statusRight'
      },
      toggleMenu: {
        tagName: 'button',
        className: 'toggle-menu fa fa-cog',
        parent: 'statusRight'
      },
      toggleHelp: {
        tagName: 'button',
        className: 'toggle-help fa fa-question-circle',
        parent: 'statusRight'
      },
      menu: {
        tagName: 'ul',
        className: 'menu',
        parent: this
      },
      help: {
        tagName: 'div',
        className: 'help',
        parent: 'toolbar'
      }
    };
    for (name in componentInfo) {
      options = componentInfo[name];
      if (typeof options.parent === 'string') {
        options.parent = this.components[options.parent];
      }
      this.components[name] = new PenciltestUIComponent(options);
    }
    return this.components.menu.setHTML(this.menuWalker(this.menuOptions));
  };

  PenciltestUI.prototype.appActions = {
    showMenu: {
      label: "Show Menu",
      hotkey: ['Tab'],
      gesture: /4 still/,
      listener: function() {
        return this.ui.toggleMenu(this.ui.pointer.coords || {
          x: 10,
          y: 10
        });
      }
    },
    renderer: {
      label: "Set Renderer",
      listener: function() {
        var name, renderer, rendererNames, self, _ref;
        self = this;
        rendererNames = [];
        _ref = this.availableRenderers;
        for (name in _ref) {
          renderer = _ref[name];
          rendererNames.push(name);
        }
        return Utils.select('Set renderer', rendererNames, this.options.renderer, function(selected) {
          return self.setOptions({
            renderer: selected
          });
        });
      },
      action: function() {
        var _ref;
        if (this.fieldElement) {
          if ((_ref = this.renderer) != null) {
            _ref.destroy();
          }
          return this.renderer = new this.availableRenderers[this.options.renderer]({
            container: this.fieldElement,
            width: this.forceDimensions ? this.forceDimensions.width : this.width,
            height: this.forceDimensions ? this.forceDimensions.height : this.height
          });
        }
      }
    },
    pageFlip: {
      label: "Page Flip",
      gesture: /2 (left|right) from .* (bottom|middle)/,
      triggerOnMove: true,
      listener: function() {
        return this.goToFrame(Math.floor(Utils.currentGesture.startFrameNumber + this.film.frames.length * Utils.currentGesture.deltaNormalized.x * 2));
      }
    },
    playPause: {
      label: "Play/Pause",
      hotkey: ['Space'],
      gesture: /2 still from center (bottom|middle)/,
      cancelComplementKeyEvent: true,
      listener: function() {
        this.playDirection = 1;
        return this.togglePlay();
      }
    },
    playReverse: {
      label: "Play in Reverse",
      hotkey: ['Shift+Space'],
      cancelComplementKeyEvent: true,
      listener: function() {
        this.playDirection = -1;
        return this.togglePlay();
      }
    },
    nextFrame: {
      label: "Next Frame",
      hotkey: ['D', 'J', 'Right', '.'],
      gesture: /2 still from right bottom/,
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
      hotkey: ['S', 'K', 'Left', ','],
      gesture: /2 still from left bottom/,
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
      hotkey: ['1', '0', 'Home', 'PgUp'],
      gesture: /2 left from .* (bottom|middle)/,
      cancelComplementKeyEvent: true,
      listener: function() {
        this.goToFrame(0);
        return this.stop();
      }
    },
    lastFrame: {
      label: "Last Frame",
      hotkey: ['$', 'End', 'PgDn'],
      gesture: /2 right from .* (bottom|middle)/,
      cancelComplementKeyEvent: true,
      listener: function() {
        this.goToFrame(this.film.frames.length - 1);
        return this.stop();
      }
    },
    copyFrame: {
      label: "Copy Frame/Strokes",
      hotkey: ['C'],
      listener: function() {
        return this.copyFrame();
      }
    },
    pasteFrame: {
      label: "Paste Frame",
      hotkey: ['V'],
      listener: function() {
        return this.pasteFrame();
      }
    },
    pasteStrokes: {
      label: "Paste Strokes",
      hotkey: ['Shift+V'],
      listener: function() {
        return this.pasteStrokes();
      }
    },
    insertFrameBefore: {
      label: "Insert Frame Before",
      hotkey: ['Shift+A', 'Shift+I'],
      gesture: /2 still from left top/,
      listener: function() {
        var newIndex;
        newIndex = this.current.frameNumber;
        this.newFrame(newIndex);
        return this.goToFrame(newIndex);
      }
    },
    insertFrameAfter: {
      label: "Insert Frame After",
      hotkey: ['Shift+D', 'I'],
      gesture: /2 still from right top/,
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
        var self;
        self = this;
        return Utils.prompt('# of seconds to insert: ', 1, function(seconds) {
          var first, last, newIndex, _i;
          first = self.current.frameNumber + 1;
          last = self.current.frameNumber + Math.floor(self.options.frameRate * Number(seconds));
          for (newIndex = _i = first; first <= last ? _i <= last : _i >= last; newIndex = first <= last ? ++_i : --_i) {
            self.newFrame(newIndex);
          }
          return self.goToFrame(newIndex);
        });
      }
    },
    undo: {
      label: "Undo",
      title: "Remove the last line drawn",
      hotkey: ['Z'],
      gesture: /3 still from left/,
      repeat: true,
      listener: function() {
        return this.undo();
      }
    },
    redo: {
      label: "Redo",
      title: "Put back a line removed by 'Undo'",
      hotkey: ['Shift+Z'],
      gesture: /3 still from right/,
      repeat: true,
      listener: function() {
        return this.redo();
      }
    },
    frameRate: {
      label: "Frame Rate",
      listener: function() {
        var self;
        self = this;
        return Utils.prompt('frames per second: ', this.options.frameRate, function(rate) {
          if (rate) {
            return self.setOptions({
              frameRate: Number(rate)
            });
          }
        });
      },
      action: function() {
        return this.singleFrameDuration = 1 / this.options.frameRate;
      }
    },
    frameHold: {
      label: "Default Frame Hold",
      listener: function() {
        var self;
        self = this;
        return Utils.prompt('default exposures per drawing: ', self.options.frameHold, function(hold) {
          var oldHold;
          if (hold) {
            oldHold = self.options.frameHold;
            self.setOptions({
              frameHold: Number(hold)
            });
            return Utils.confirm('update hold for existing frames in proportion to new setting??: ', function() {
              var frame, magnitudeDelta, _i, _len, _ref;
              magnitudeDelta = self.options.frameHold / oldHold;
              _ref = self.film.frames;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                frame = _ref[_i];
                frame.hold = Math.round(frame.hold * magnitudeDelta);
              }
              return self.drawCurrentFrame();
            });
          }
        });
      }
    },
    hideCursor: {
      label: "Hide Cursor",
      hotkey: ['H'],
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
      hotkey: ['F', 'O'],
      gesture: /2 down from center (bottom|middle)/,
      title: "show previous and next frames in red and blue",
      listener: function() {
        this.setOptions({
          onionSkin: !this.options.onionSkin
        });
        return this.resize();
      }
    },
    dropFrame: {
      label: "Drop Frame",
      hotkey: ['Shift+X'],
      gesture: /4 down from center top/,
      cancelComplementKeyEvent: true,
      listener: function() {
        return this.dropFrame();
      }
    },
    cutFrame: {
      label: "Cut Frame",
      hotkey: ['X'],
      gesture: /3 down from center top/,
      cancelComplementKeyEvent: true,
      listener: function() {
        return this.cutFrame();
      }
    },
    smoothing: {
      label: "Smoothing...",
      title: "How much your lines will be smoothed as you draw",
      hotkey: ['Shift+S'],
      listener: function() {
        var self;
        self = this;
        return Utils.prompt('Smoothing', this.options.smoothing, function(smoothing) {
          return self.setOptions({
            smoothing: Number(smoothing)
          });
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
      gesture: /2 still from left middle/,
      repeat: true,
      listener: function() {
        return this.setCurrentFrameHold(this.getCurrentFrame().hold - 1);
      }
    },
    moreHold: {
      label: "Longer Frame Hold",
      hotkey: ['Up', '+', '='],
      gesture: /2 still from right middle/,
      repeat: true,
      listener: function() {
        return this.setCurrentFrameHold(this.getCurrentFrame().hold + 1);
      }
    },
    toggleDebug: {
      label: "Toggle Debug",
      title: "Verbose logs for debugging",
      listener: function() {
        return this.setOptions({
          debug: !this.options.debug
        });
      }
    },
    showStatus: {
      label: "Show Status",
      title: "hide the film status bar",
      listener: function() {
        return this.setOptions({
          showStatus: !this.options.showStatus
        });
      },
      action: function() {
        return Utils.toggleClass(this.ui.components.statusBar.getElement(), 'hidden', !this.options.showStatus);
      }
    },
    loop: {
      label: "Loop",
      hotkey: ['L'],
      gesture: /2 up from center (bottom|middle)/,
      listener: function() {
        this.setOptions({
          loop: !this.options.loop
        });
        return this.resize();
      }
    },
    saveFilm: {
      label: "Save",
      hotkey: ['Alt+S'],
      gesture: /3 still from center (bottom|middle)/,
      listener: function() {
        return this.saveFilm();
      }
    },
    loadFilm: {
      label: "Load",
      hotkey: ['Alt+O'],
      gesture: /3 up from center (bottom|middle)/,
      listener: function() {
        return this.loadFilm();
      }
    },
    newFilm: {
      label: "New",
      hotkey: ['N'],
      listener: function() {
        var self;
        self = this;
        if (this.unsavedChanges) {
          return Utils.confirm("Unsaved changes will be lost.", function() {
            return self.newFilm();
          });
        } else {
          return this.newFilm();
        }
      }
    },
    renderGif: {
      label: "Render GIF",
      hotkey: ['G'],
      listener: function() {
        return this.renderGif();
      }
    },
    resizeFilm: {
      label: "Resize Film",
      hotkey: ['Alt+R'],
      listener: function() {
        var self;
        self = this;
        return Utils.prompt('Film width & aspect', "" + this.film.width + " " + this.film.aspect, function(dimensionsResponse) {
          var dimensions;
          dimensions = dimensionsResponse.split(' ');
          self.film.width = Number(dimensions[0]);
          self.film.aspect = dimensions[1];
          return self.resize();
        });
      }
    },
    panFilm: {
      label: "Pan Film",
      hotkey: ['P'],
      listener: function() {
        var deltaPoint, dragEnd, dragStart, dragStep, endPoint, frameScale, oldMode, self, startPoint;
        self = this;
        oldMode = this.state.mode;
        this.state.mode = Penciltest.prototype.modes.BUSY;
        startPoint = endPoint = deltaPoint = [0, 0];
        frameScale = this.width / this.film.width;
        dragStart = function(event) {
          startPoint = endPoint = [event.clientX, event.clientY];
          deltaPoint = [0, 0];
          self.fieldElement.addEventListener('mousemove', dragStep);
          return self.fieldElement.addEventListener('mouseup', dragEnd);
        };
        dragStep = function(event) {
          var immediateDeltaPoint;
          deltaPoint = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]];
          immediateDeltaPoint = [event.clientX - endPoint[0], event.clientY - endPoint[1]];
          endPoint = [event.clientX, event.clientY];
          self.pan([immediateDeltaPoint[0] / frameScale, immediateDeltaPoint[1] / frameScale]);
          return self.drawCurrentFrame();
        };
        dragEnd = function(event) {
          self.fieldElement.removeEventListener('mouseup', dragEnd);
          self.fieldElement.removeEventListener('mousedown', dragStart);
          self.fieldElement.removeEventListener('mousemove', dragStep);
          return self.state.mode = oldMode;
        };
        this.fieldElement.addEventListener('mousedown', dragStart);
        return this.resize();
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
      hotkey: ['Ctrl+S', 'Alt+E'],
      cancelComplementKeyEvent: true,
      listener: function() {
        var blob, fileName, url;
        blob = new Blob([JSON.stringify(this.film)], {
          type: 'application/json'
        });
        url = window.URL.createObjectURL(blob);
        fileName = (this.film.name || 'untitled') + '.penciltest.json';
        return Utils.downloadFromUrl(url, fileName);
      }
    },
    importFilm: {
      label: "Import",
      hotkey: ['Ctrl+O'],
      cancelComplementKeyEvent: true,
      listener: function() {
        var self;
        self = this;
        return Utils.promptForFile('Load a film JSON file', function(filmJSON) {
          return self.setFilm(JSON.parse(filmJSON));
        }, '.json,application/json');
      }
    },
    linkAudio: {
      label: "Link Audio",
      hotkey: ['Alt+A'],
      listener: function() {
        var self;
        self = this;
        return Utils.prompt('Audio file URL: ', (this.film.audio ? this.film.audio.url : ''), function(audioURL) {
          if (audioURL != null) {
            return self.loadAudio(audioURL);
          }
        });
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
    toggleInterfaceHelp: {
      label: "Help",
      hotkey: ['?'],
      listener: function() {
        return this.ui.toggleInterfaceHelp();
      }
    },
    reset: {
      label: "Reset",
      title: "Clear settings; helpful if the app has stopped working.",
      action: function() {
        this.state = Utils.inherit({}, Penciltest.prototype.state);
        return this.setOptions(Utils.inherit({}, Penciltest.prototype.options));
      }
    },
    eraser: {
      label: "Eraser",
      hotkey: ['E'],
      listener: function() {
        this.useTool(this.state.toolStack[0] === 'eraser' ? this.state.toolStack[1] : 'eraser');
        return this.ui.updateStatus();
      }
    }
  };

  PenciltestUI.prototype.menuOptions = [
    {
      _icons: ['firstFrame', 'prevFrame', 'playPause', 'nextFrame', 'lastFrame'],
      Edit: ['undo', 'redo', 'moreHold', 'lessHold', 'copyFrame', 'cutFrame', 'pasteFrame', 'pasteStrokes', 'insertFrameAfter', 'insertFrameBefore', 'insertSeconds', 'dropFrame'],
      Playback: ['loop'],
      Tools: ['hideCursor', 'onionSkin', 'smoothing', 'smoothFrame', 'smoothFilm', 'linkAudio'],
      Film: ['frameRate', 'resizeFilm', 'panFilm', 'renderGif', 'saveFilm', 'loadFilm', 'newFilm', 'importFilm', 'exportFilm'],
      Settings: ['frameHold', 'renderer', 'toggleInterfaceHelp', 'reset', 'toggleDebug']
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
    var contextMenuListener, getEventPageXY, mouseDownListener, mouseMoveListener, mouseUpListener, self, toggleToolListener, trackFromEvent;
    self = this;
    this.previousEvent = null;
    this.pointer = {};
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
    trackFromEvent = function(pageCoords) {
      return self.pointer.coords = pageCoords;
    };
    mouseDownListener = function(event) {
      var pageCoords;
      this.previousEvent = event;
      if (this.controller.state.mode !== Penciltest.prototype.modes.DRAWING) {
        return;
      }
      event.preventDefault();
      if (event.type === 'touchstart' && event.touches.length > 1) {
        this.controller.cancelStroke();
        this.fieldBounds = {
          x: 0,
          y: 0,
          width: this.controller.width,
          height: this.controller.height
        };
        if (!Utils.currentGesture) {
          this.doAppAction('undo');
        }
        Utils.clearGesture();
        Utils.recordGesture(event, this.fieldBounds);
        return Utils.currentGesture.startFrameNumber = this.controller.current.frameNumber;
      } else {
        if (event.button === 2) {
          return true;
        } else {
          this.hideMenu();
        }
        if (event.button === 1) {
          this.controller.useTool('eraser');
        }
        pageCoords = getEventPageXY(event);
        self.controller.track(pageCoords.x - self.controller.fieldContainer.offsetLeft, pageCoords.y - self.controller.fieldContainer.offsetTop);
        this.uiListeners.move = mouseMoveListener.bind(this);
        this.uiListeners.up = mouseUpListener.bind(this);
        document.body.addEventListener('mousemove', this.uiListeners.move);
        document.body.addEventListener('touchmove', this.uiListeners.move);
        document.body.addEventListener('mouseup', this.uiListeners.up);
        return document.body.addEventListener('touchend', this.uiListeners.up);
      }
    };
    mouseMoveListener = function(event) {
      var pageCoords;
      event.preventDefault();
      if (event.type === 'touchmove' && event.touches.length > 1) {
        Utils.recordGesture(event, this.fieldBounds);
        return this.progressGesture(Utils.describeGesture(this.fieldBounds));
      } else {
        pageCoords = getEventPageXY(event);
        this.pointer.coords = pageCoords;
        console.log("updating coords");
        if (this.controller.state.mode === Penciltest.prototype.modes.DRAWING) {
          return self.controller.track(pageCoords.x - self.controller.fieldContainer.offsetLeft, pageCoords.y - self.controller.fieldContainer.offsetTop);
        }
      }
    };
    mouseUpListener = function(event) {
      this.previousEvent = event;
      if (event.type === 'mouseup' && event.button === 2) {
        return true;
      } else {
        if (event.type === 'touchend' && Utils.currentGesture) {
          this.doGesture(Utils.describeGesture(this.fieldBounds, 'final'));
          Utils.clearGesture(event);
        }
        if (event.button === 1) {
          this.controller.useTool('pencil');
        }
        document.body.removeEventListener('mousemove', this.uiListeners.move);
        document.body.removeEventListener('touchmove', this.uiListeners.move);
        document.body.removeEventListener('mouseup', this.uiListeners.up);
        document.body.removeEventListener('touchend', this.uiListeners.up);
        return this.controller.lift();
      }
    };
    toggleToolListener = function(event) {
      event.preventDefault();
      return this.appActions.eraser.listener.call(this.controller);
    };
    contextMenuListener = function(event) {
      event.preventDefault();
      if (!this.previousEvent || !this.previousEvent.type.match(/^touch/)) {
        return this.toggleMenu(getEventPageXY(event));
      }
    };
    this.uiListeners = {
      fieldDown: mouseDownListener.bind(this),
      context: contextMenuListener.bind(this),
      tool: toggleToolListener.bind(this),
      help: function() {
        return self.doAppAction('toggleInterfaceHelp');
      }
    };
    this.controller.fieldElement.addEventListener('mousedown', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('touchstart', this.uiListeners.fieldDown);
    this.controller.fieldElement.addEventListener('contextmenu', this.uiListeners.context);
    this.components.toggleTool.getElement().addEventListener('click', this.uiListeners.tool);
    this.components.toggleMenu.getElement().addEventListener('click', this.uiListeners.context);
    return this.components.toggleHelp.getElement().addEventListener('click', this.uiListeners.help);
  };

  PenciltestUI.prototype.doGesture = function(gestureDescription) {
    var action, name, _ref;
    _ref = this.appActions;
    for (name in _ref) {
      action = _ref[name];
      if (!action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        this.controller.options.debug && console.debug("action '%s' triggered by gesture '%s'", name, gestureDescription);
        return this.doAppAction(name);
      }
    }
  };

  PenciltestUI.prototype.progressGesture = function(gestureDescription) {
    var action, name, _ref;
    _ref = this.appActions;
    for (name in _ref) {
      action = _ref[name];
      if (action.triggerOnMove && action.gesture && action.gesture.test(gestureDescription)) {
        return this.doAppAction(name);
      }
    }
  };

  PenciltestUI.prototype.updateMenuOption = function(optionElement) {
    var optionName;
    optionName = optionElement.attributes.rel.value;
    if (typeof this.controller.options[optionName] === 'boolean') {
      return Utils.toggleClass(optionElement, 'enabled', this.controller.options[optionName]);
    }
  };

  PenciltestUI.prototype.addMenuListeners = function() {
    var menuOptionListener, option, self, _i, _len, _ref, _results;
    self = this;
    this.menuItems = this.components.menu.getElement().querySelectorAll('LI');
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
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('mouseup', menuOptionListener);
      _results.push(option.addEventListener('contextmenu', menuOptionListener));
    }
    return _results;
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
            if (action.cancelComplementKeyEvent) {
              this.keyBindings.keyup[hotkey] = null;
            }
          } else {
            this.keyBindings.keyup[hotkey] = name;
            if (action.cancelComplementKeyEvent) {
              this.keyBindings.keydown[hotkey] = null;
            }
          }
        }
      }
    }
    keyboardListener = function(event) {
      var actionName, combo;
      if (!window.pauseKeyboardListeners) {
        combo = Utils.describeKeyCombo(event);
        actionName = self.keyBindings[event.type][combo];
        if (actionName || actionName === null) {
          event.preventDefault();
          if (actionName) {
            return self.doAppAction(actionName);
          }
        }
      }
    };
    document.body.addEventListener('keydown', function(event) {
      return keyboardListener(event);
    });
    return document.body.addEventListener('keyup', function(event) {
      return keyboardListener(event);
    });
  };

  PenciltestUI.prototype.addOtherListeners = function() {
    var self;
    self = this;
    document.body.addEventListener('wheel', function(event) {
      if (event.deltaY > 0) {
        return self.doAppAction('nextFrame');
      } else {
        return self.doAppAction('prevFrame');
      }
    });
    return window.addEventListener('beforeunload', function() {
      self.controller.putStoredData('app', 'options', self.controller.options);
      self.controller.putStoredData('app', 'state', self.controller.state);
      if (self.controller.unsavedChanges) {
        return event.returnValue = "You have unsaved changes. Alt+S to save.";
      }
    });
  };

  PenciltestUI.prototype.toggleInterfaceHelp = function() {
    var action, child, fingerCount, gestureTerms, gesturesMap, helpDoc, helpTextNode, keyboardDoc, name, open, unicodeDotCounters, _i, _len, _ref, _ref1;
    gesturesMap = [];
    open = Utils.toggleClass(this.components.help.getElement(), 'active');
    _ref = this.components.help.getElement().children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      this.components.help.getElement().removeChild(child);
    }
    if (open) {
      keyboardDoc = 'Keyboard Shortcuts:\n';
      _ref1 = this.appActions;
      for (name in _ref1) {
        action = _ref1[name];
        if (action.hotkey) {
          keyboardDoc += action.label || name;
          if (action.hotkey) {
            keyboardDoc += " [" + (action.hotkey.join(' or ')) + "]";
          }
          if (action.title) {
            keyboardDoc += " - " + action.title;
          }
          keyboardDoc += '\n';
        }
        if (action.gesture) {
          gestureTerms = String(action.gesture).match(/([0-9]+)(.*)\/$/);
          fingerCount = Number(gestureTerms[1]);
          unicodeDotCounters = ['', '\u2024', '\u2025', '\u2056', '\u2058', '\u2059'];
          gesturesMap.push("" + name + ": " + unicodeDotCounters[fingerCount] + " " + gestureTerms[2]);
        }
      }
      helpDoc = "Gestures:\n" + gesturesMap.join("\n");
      helpDoc += "\n\n" + keyboardDoc;
      helpTextNode = document.createTextNode(helpDoc);
      return this.components.help.getElement().appendChild(helpTextNode);
    }
  };

  PenciltestUI.prototype.updateStatus = function() {
    var appStatusMarkup, filmStatusMarkup, _ref;
    if (this.controller.options.showStatus) {
      appStatusMarkup = "v" + Penciltest.prototype.state.version;
      appStatusMarkup += " Smoothing: " + this.controller.options.smoothing;
      this.components.appStatus.setHTML(appStatusMarkup);
      filmStatusMarkup = "<div class=\"frame\">";
      filmStatusMarkup += "" + this.controller.options.frameRate + " FPS";
      filmStatusMarkup += " | (hold " + (this.controller.getCurrentFrame().hold) + ")";
      filmStatusMarkup += " | " + (this.controller.current.frameNumber + 1) + "/" + this.controller.film.frames.length;
      filmStatusMarkup += " | " + (Utils.getDecimal(this.controller.current.frameIndex[this.controller.current.frameNumber].time, 1, String));
      if ((_ref = this.controller.film.audio) != null ? _ref.offset : void 0) {
        filmStatusMarkup += " " + (this.controller.film.audio.offset >= 0 ? '+' : '') + this.controller.film.audio.offset;
      }
      filmStatusMarkup += "</div>";
      this.components.filmStatus.setHTML(filmStatusMarkup);
      return this.components.toggleTool.getElement().className = "toggle-tool fa fa-" + this.controller.state.toolStack[0];
    }
  };

  PenciltestUI.prototype.showMenu = function(coords) {
    var maxBottom, maxRight, menuElement, option, _i, _len, _ref, _results;
    if (!this.menuIsVisible) {
      if (!coords) {
        coords = this.pointer.coords || {
          x: 10,
          y: 10
        };
      }
      this.menuIsVisible = true;
      menuElement = this.components.menu.getElement();
      Utils.toggleClass(menuElement, 'active', true);
      maxRight = this.components.menu.getElement().offsetWidth;
      maxBottom = 0;
      if (coords.x > document.body.offsetWidth - maxRight - menuElement.offsetWidth) {
        menuElement.style.right = "" + maxRight + "px";
        menuElement.style.left = "auto";
      } else {
        menuElement.style.left = "" + (coords.x + 1) + "px";
        menuElement.style.right = "auto";
      }
      if (coords.y > document.body.offsetHeight - maxBottom - menuElement.offsetHeight) {
        menuElement.style.top = "auto";
        menuElement.style.bottom = maxBottom;
      } else {
        menuElement.style.top = "" + coords.y + "px";
        menuElement.style.bottom = "auto";
      }
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

  PenciltestUI.prototype.hideMenu = function() {
    if (this.menuIsVisible) {
      this.menuIsVisible = false;
      return Utils.toggleClass(this.components.menu.getElement(), 'active', false);
    }
  };

  PenciltestUI.prototype.toggleMenu = function(coords) {
    if (this.menuIsVisible) {
      return this.hideMenu();
    } else {
      return this.showMenu(coords);
    }
  };

  PenciltestUI.prototype.showFeedback = function(message, duration) {
    var hideFeedback, self;
    if (duration == null) {
      duration = 2000;
    }
    self = this;
    if (!this.feedbackElement) {
      this.feedbackElement = new PenciltestUIComponent({
        id: 'pt-feedback',
        parent: this
      });
    }
    this.feedbackElement.setHTML(message);
    this.feedbackElement.getElement().style.opacity = 1;
    clearTimeout(this.feedbackTimeout);
    hideFeedback = function() {
      return self.feedbackElement.getElement().style.opacity = 0;
    };
    return this.feedbackTimeout = setTimeout(hideFeedback, duration);
  };

  return PenciltestUI;

})(PenciltestUIComponent);
