
/*
global: document, window
 */
var RendererInterface;

RendererInterface = (function() {
  RendererInterface.prototype.options = {
    container: 'body',
    lineColor: [0, 0, 0],
    lineWeight: 1,
    lineOpacity: 1
  };

  function RendererInterface(options) {
    this.options = Utils.inherit(options, this.options);
    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }
    this.clearLineOverrides();
  }

  RendererInterface.prototype.moveTo = function(x, y) {
    return null;
  };

  RendererInterface.prototype.lineTo = function(x, y) {
    return null;
  };

  RendererInterface.prototype.setLineOverrides = function(options) {
    this.overrides = options;
    return this.currentLineOptions = Utils.inherit(options, this.overrides, this.defaultLineOptions());
  };

  RendererInterface.prototype.defaultLineOptions = function() {
    return {
      color: this.options.lineColor,
      weight: this.options.lineWeight,
      opacity: this.options.lineOpacity
    };
  };

  RendererInterface.prototype.clearLineOverrides = function() {
    this.overrides = {};
    return this.currentLineOptions = this.defaultLineOptions();
  };

  RendererInterface.prototype.path = function(path) {
    var i, segment, _i, _len;
    for (i = _i = 0, _len = path.length; _i < _len; i = ++_i) {
      segment = path[i];
      if (i === 0) {
        this.moveTo(segment[0], segment[1]);
      } else {
        this.lineTo(segment[0], segment[1]);
      }
    }
    return this.render();
  };

  RendererInterface.prototype.render = function() {
    return null;
  };

  RendererInterface.prototype.clear = function() {
    return null;
  };

  RendererInterface.prototype.destroy = function() {
    return null;
  };

  return RendererInterface;

})();
