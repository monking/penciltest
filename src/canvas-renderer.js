
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
  }

  return CanvasRenderer;

})(RendererInterface);
