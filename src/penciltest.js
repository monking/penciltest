
/*
global: document, window
 */
var PencilTest;

PencilTest = (function() {
  PencilTest.prototype.optionListeners = {
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
        return this.options.onionSkin = !this.options.onionSkin;
      },
      action: function() {
        return Utils.log("onionSkin--" + this.options.onionSkin);
      }
    },
    frameRate: {
      label: "Frame Rate",
      listener: function() {
        return null;
      },
      action: function() {
        return Utils.log("frameRate--" + this.options.frameRate);
      }
    }
  };

  PencilTest.prototype.menuOptions = ['hideCursor', 'onionSkin', 'frameRate'];

  function PencilTest(options) {
    var key, optionName, value, _ref, _ref1;
    this.options = options;
    _ref = {
      container: document.body,
      containerSelector: 'body',
      hideCursor: false,
      frameRate: 12,
      onionSkin: false,
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
    this.frames = [];
    this.lift();
    this.buildContainer();
    this.addInputListeners();
    this.addMenuListeners();
    this.addKeyboardListeners();
    for (optionName in this.options) {
      if ((_ref1 = this.optionListeners[optionName]) != null) {
        _ref1.action.call(this);
      }
    }
    this.newFrame();
    window.penciltest = this;
  }

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
    var contextMenuListener, markFromEvent, mouseDownListener, mouseMoveListener, mouseUpListener, self;
    self = this;
    markFromEvent = function(event) {
      var eventLocation;
      if (/^touch/.test(event.type)) {
        if (event.touches.length > 1) {
          return true;
        }
        eventLocation = event.touches[0];
      } else {
        eventLocation = event;
      }
      return self.mark(eventLocation.pageX - self.fieldElement.offsetLeft, eventLocation.pageY - self.fieldElement.offsetTop);
    };
    mouseDownListener = function(event) {
      event.preventDefault();
      if (event.type === 'touchstart' && event.touches.length > 1) {
        mouseUpListener();
        if (event.touches.length === 3) {
          return self.toggleMenu();
        }
      } else {
        if (event.button === 2) {
          return true;
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
      return self.toggleMenu();
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
      var optionName;
      optionName = this.attributes.rel.value;
      self.optionListeners[optionName].listener.call(self);
      self.optionListeners[optionName].action.call(self);
      return self.updateMenuOption(this);
    };
    _ref = this.menuItems;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      option.addEventListener('click', menuOptionListener);
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
          return this.goToFrame(this.currentFrameIndex - 1);
        },
        38: function() {
          return this.goToFrame(this.frames.length - 1);
        },
        39: function() {
          return this.goToFrame(this.currentFrameIndex + 1);
        },
        40: function() {
          return this.goToFrame(0);
        }
      },
      keyup: {
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
        keyboardHandlers[event.type][event.keyCode].apply(self, [event]);
      }
      if (event.keyCode !== 0) {
        return Utils.log("" + event.type + "-" + event.keyCode);
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
      hold: 3,
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

  PencilTest.prototype.toggleMenu = function() {
    return Utils.toggleClass(this.container, 'menu-visible');
  };

  PencilTest.prototype.updateCurrentFrame = function(segment) {
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.goToFrame = function(newIndex, noNewFrame) {
    if (noNewFrame == null) {
      noNewFrame = false;
    }
    if (newIndex < 0) {
      if (noNewFrame === false) {
        this.newFrame('prepend');
      }
    } else if (newIndex >= this.frames.length) {
      if (noNewFrame === false) {
        this.newFrame();
      }
    } else {
      this.currentFrameIndex = newIndex;
    }
    return this.drawCurrentFrame();
  };

  PencilTest.prototype.play = function() {
    var self, stepListener;
    self = this;
    this.framesHeld = 0;
    stepListener = function() {
      var currentFrame;
      self.framesHeld++;
      currentFrame = self.getCurrentFrame();
      if (self.framesHeld >= currentFrame.hold) {
        self.framesHeld = 0;
        return self.goToFrame(self.currentFrameIndex + 1, 'no new frames');
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
    var stroke, _i, _len, _ref, _results;
    this.field.clear();
    _ref = this.getCurrentFrame().strokes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      _results.push(this.field.path(stroke.join('')));
    }
    return _results;
  };

  PencilTest.prototype.lift = function() {
    return this.currentStrokeIndex = null;
  };

  return PencilTest;

})();
