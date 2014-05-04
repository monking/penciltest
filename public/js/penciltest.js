
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
    this.buildContainer();
  }

  PencilTest.prototype.buildContainer = function() {
    var markup;
    markup = '<svg class="field"></svg>';
    this.container.innerHTML = markup;
    return this.field = this.container.querySelector('.field');
  };

  return PencilTest;

})();
