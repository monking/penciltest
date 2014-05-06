
/*
global: document, window
 */
var PencilTest;

PencilTest = (function() {
  function PencilTest(options) {
    var key, value, _ref;
    this.options = options;
    _ref = {
      container: document.body,
      containerSelector: 'body',
      frameRate: 12
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
    this.addInputHandlers();
    this.addMenuHandlers();
    this.addKeyboardHandlers();
    this.newFrame();
    window.penciltest = this;
  }

  PencilTest.prototype.buildContainer = function() {
    var markup;
    markup = '<div class="field"></div>' + '<ul class="menu">' + '<li rel="tablet-mode">Tablet Mode</li>' + '</ul>';
    this.container.innerHTML = markup;
    this.fieldElement = this.container.querySelector('.field');
    return this.field = new Raphael(this.fieldElement);
  };

  PencilTest.prototype.addInputHandlers = function() {
    var contextMenuHandler, markFromEvent, mouseDownHandler, mouseMoveHandler, mouseUpHandler, self;
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
    mouseDownHandler = function(event) {
      event.preventDefault();
      if (event.type === 'touchstart' && event.touches.length > 1) {
        mouseUpHandler();
        if (event.touches.length === 3) {
          return self.toggleMenu();
        }
      } else {
        if (event.button === 2) {
          return true;
        }
        markFromEvent(event);
        document.body.addEventListener('mousemove', mouseMoveHandler);
        document.body.addEventListener('touchmove', mouseMoveHandler);
        document.body.addEventListener('mouseup', mouseUpHandler);
        return document.body.addEventListener('touchend', mouseUpHandler);
      }
    };
    mouseMoveHandler = function(event) {
      event.preventDefault();
      return markFromEvent(event);
    };
    mouseUpHandler = function(event) {
      if (event.button === 2) {
        return true;
      } else {
        document.body.removeEventListener('mousemove', mouseMoveHandler);
        document.body.removeEventListener('touchmove', mouseMoveHandler);
        document.body.removeEventListener('mouseup', mouseUpHandler);
        document.body.removeEventListener('touchend', mouseUpHandler);
        return self.lift();
      }
    };
    contextMenuHandler = function(event) {
      event.preventDefault();
      return self.toggleMenu();
    };
    this.fieldElement.addEventListener('mousedown', mouseDownHandler);
    this.fieldElement.addEventListener('touchstart', mouseDownHandler);
    return this.fieldElement.addEventListener('contextmenu', contextMenuHandler);
  };

  PencilTest.prototype.addMenuHandlers = function() {
    this.menuElement = this.container.querySelector('.menu');
    return this.menuItems = this.menuElement.getElementsByTagName('li');
  };

  PencilTest.prototype.addKeyboardHandlers = function() {
    var self;
    self = this;
    return document.body.addEventListener('keydown', function(event) {
      var matchedKey;
      matchedKey = true;
      switch (event.keyCode) {
        case 37:
          self.goToFrame(self.currentFrameIndex - 1);
          break;
        case 39:
          self.goToFrame(self.currentFrameIndex + 1);
          break;
        case 38:
          self.goToFrame(self.frames.length - 1);
          break;
        case 40:
          self.goToFrame(0);
          break;
        case 32:
          self.togglePlay();
          break;
        default:
          matchedKey = false;
      }
      window.location.hash = event.keyCode;
      if (matchedKey) {
        return event.preventDefault();
      }
    });
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
    var self, stepHandler;
    self = this;
    stepHandler = function() {
      return self.goToFrame(self.currentFrameIndex + 1, 'no new frames');
    };
    this.stop();
    this.playInterval = setInterval(stepHandler, 1000 / this.options.frameRate);
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
