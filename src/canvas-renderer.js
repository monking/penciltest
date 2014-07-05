
/*
global: document, window
 */
var CanvasRenderer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

CanvasRenderer = (function(_super) {
  __extends(CanvasRenderer, _super);

  function CanvasRenderer(options) {
    CanvasRenderer.__super__.constructor.call(this, options);
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.field = document.createElement('canvas');
    this.field.setAttribute('width', this.width);
    this.field.setAttribute('height', this.height);
    this.context = this.field.getContext('2d');
    this.updateStrokeStyle();
    this.container.appendChild(this.field);
  }

  CanvasRenderer.prototype.lineTo = function(x, y) {
    CanvasRenderer.__super__.lineTo.call(this, x, y);
    return this.context.lineTo(x, y);
  };

  CanvasRenderer.prototype.updateStrokeStyle = function() {
    if (this.context) {
      return this.context.strokeStyle = 'rgba(' + this.currentLineOptions.color[0] + ',' + this.currentLineOptions.color[1] + ',' + this.currentLineOptions.color[2] + ',' + this.currentLineOptions.opacity + ')';
    }
  };

  CanvasRenderer.prototype.setLineOverrides = function(options) {
    CanvasRenderer.__super__.setLineOverrides.call(this, options);
    return this.updateStrokeStyle();
  };

  CanvasRenderer.prototype.clearLineOverrides = function() {
    CanvasRenderer.__super__.clearLineOverrides.call(this);
    return this.updateStrokeStyle();
  };

  CanvasRenderer.prototype.moveTo = function(x, y) {
    CanvasRenderer.__super__.moveTo.call(this, x, y);
    this.context.moveTo(x, y);
    return this.drawingPath != null ? this.drawingPath : this.drawingPath = this.context.beginPath();
  };

  CanvasRenderer.prototype.render = function() {
    this.context.stroke();
    this.drawingPath = null;
    return CanvasRenderer.__super__.render.call(this);
  };

  CanvasRenderer.prototype.clear = function() {
    this.drawingPath = null;
    this.context.clearRect(0, 0, this.width, this.height);
    return CanvasRenderer.__super__.clear.call(this);
  };

  CanvasRenderer.prototype.destroy = function() {
    this.field.remove();
    return CanvasRenderer.__super__.destroy.call(this);
  };

  return CanvasRenderer;

})(RendererInterface);
