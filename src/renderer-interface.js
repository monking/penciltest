
/*
global: document
 */
var RendererInterface;

RendererInterface = (function() {
  RendererInterface.prototype.options = {
    container: 'body',
    lineColor: 'black',
    lineWeight: 1,
    lineOpacity: 1,
    lineCorner: 'round',
    width: 1920,
    height: 1080
  };

  function RendererInterface(options) {
    this.options = Utils.inherit(options, this.options);
    if (typeof this.options.container === 'string') {
      this.container = document.querySelector(this.options.container);
    } else {
      this.container = this.options.container;
    }
    this.composeOptions();
    this.resize(this.options.width, this.options.height);
  }

  RendererInterface.prototype.resize = function(width, height) {
    this.width = width;
    return this.height = height;
  };

  RendererInterface.prototype.moveTo = function(x, y) {
    return null;
  };

  RendererInterface.prototype.lineTo = function(x, y) {
    return null;
  };

  RendererInterface.prototype.rect = function(x, y, width, height, backgroundColor, strokeColor) {
    return null;
  };

  RendererInterface.prototype.composeOptions = function(overrides, persist) {
    var composedOptions;
    if (persist == null) {
      persist = null;
    }
    composedOptions = Object.assign({}, this.options);
    if (persist === true) {
      Object.assign(this.overrides, overrides);
    }
    if (persist !== false) {
      Object.assign(composedOptions, this.overrides);
    }
    if (persist !== true) {
      Object.assign(composedOptions, overrides);
    }
    return this.currentLineOptions = {
      color: composedOptions.lineColor,
      weight: composedOptions.lineWeight,
      corner: composedOptions.lineCorner,
      opacity: composedOptions.lineOpacity
    };
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
