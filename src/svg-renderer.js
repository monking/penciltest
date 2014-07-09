
/*
global: document, window
 */
var SVGRenderer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SVGRenderer = (function(_super) {
  __extends(SVGRenderer, _super);

  function SVGRenderer(options) {
    SVGRenderer.__super__.constructor.call(this, options);
    this.field = new Raphael(this.container);
    this.init();
  }

  SVGRenderer.prototype.lineTo = function(x, y) {
    SVGRenderer.__super__.lineTo.call(this, x, y);
    return this.drawingPath += "L" + x + " " + y;
  };

  SVGRenderer.prototype.moveTo = function(x, y) {
    SVGRenderer.__super__.moveTo.call(this, x, y);
    if (this.drawingPath == null) {
      this.drawingPath = '';
    }
    return this.drawingPath = "M" + x + " " + y;
  };

  SVGRenderer.prototype.render = function() {
    var path, pathStyle;
    if (this.drawingPath) {
      path = this.field.path(this.drawingPath);
    }
    if (this.currentLineOptions.color.join(' ' !== '0 0 0' || this.currentLineOptions.opacity !== 1)) {
      pathStyle = 'rgba(' + this.currentLineOptions.color[0] + ',' + this.currentLineOptions.color[1] + ',' + this.currentLineOptions.color[2] + ',' + this.currentLineOptions.opacity + ')';
      path[0].style.stroke = pathStyle;
    }
    return SVGRenderer.__super__.render.call(this);
  };

  SVGRenderer.prototype.clear = function() {
    this.field.clear();
    return SVGRenderer.__super__.clear.call(this);
  };

  SVGRenderer.prototype.destroy = function() {
    this.field.remove();
    return SVGRenderer.__super__.destroy.call(this);
  };

  SVGRenderer.prototype.resize = function(width, height) {
    this.field.setSize(width, height);
    return SVGRenderer.__super__.resize.call(this, width, height);
  };

  return SVGRenderer;

})(RendererInterface);
