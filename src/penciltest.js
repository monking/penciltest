
/*
global: document, window
 */
var PencilTest;

PencilTest = (function() {
  function PencilTest(options) {
    var key, value, _i, _len, _ref;
    this.options = options;
    _ref = {
      container: document.body,
      containerSelector: 'body'
    };
    for (value = _i = 0, _len = _ref.length; _i < _len; value = ++_i) {
      key = _ref[value];
      if (typeof this.options[key] === 'undefined') {
        this.options[key] = value;
      }
    }
    this.container = this.options.container || document.querySelector(this.options.containerSelector);
    this.container.className = 'penciltest-app';
    this.strokes = [];
    this.lift();
    this.buildContainer();
    window.penciltest = this;
  }

  PencilTest.prototype.buildContainer = function() {
    var markup, mouseDownHandler, mouseMoveHandler, mouseUpHandler, self;
    self = this;
    markup = '<div class="field"></div>';
    this.container.innerHTML = markup;
    this.fieldElement = this.container.querySelector('.field');
    this.field = new Raphael(this.fieldElement);
    mouseDownHandler = function(event) {
      self.fieldElement.addEventListener('mousemove', mouseMoveHandler);
      return self.fieldElement.addEventListener('touchmove', mouseMoveHandler);
    };
    mouseMoveHandler = function(event) {
      var x, y;
      if (event.type === 'touchmove') {
        x = event.touches[0].pageX - self.fieldElement.offsetLeft;
        y = event.touches[0].pageY - self.fieldElement.offsetTop;
      } else {
        self.mark(event.offsetX, event.offsetY);
      }
      self.mark(x, y);
      event.preventDefault();
      return false;
    };
    mouseUpHandler = function(event) {
      self.fieldElement.removeEventListener('mousemove', mouseMoveHandler);
      self.fieldElement.removeEventListener('touchmove', mouseMoveHandler);
      return self.lift();
    };
    this.fieldElement.addEventListener('mousedown', mouseDownHandler);
    this.fieldElement.addEventListener('touchstart', mouseDownHandler);
    this.fieldElement.addEventListener('mouseup', mouseUpHandler);
    return this.fieldElement.addEventListener('touchend', mouseUpHandler);
  };

  PencilTest.prototype.getCurrentStroke = function() {
    return this.currentStrokeIndex !== null && this.strokes[this.currentStrokeIndex];
  };

  PencilTest.prototype.mark = function(x, y) {
    if (this.currentStrokeIndex === null) {
      this.currentStrokeIndex = this.strokes.length;
      this.strokes.push("M" + x + " " + y);
    } else {
      this.strokes[this.currentStrokeIndex] += "L" + x + " " + y;
    }
    return this.display();
  };

  PencilTest.prototype.display = function() {
    var stroke, _i, _len, _ref, _results;
    this.field.clear();
    _ref = this.strokes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      stroke = _ref[_i];
      _results.push(this.field.path(stroke));
    }
    return _results;
  };

  PencilTest.prototype.lift = function() {
    return this.currentStrokeIndex = null;
  };

  return PencilTest;

})();
