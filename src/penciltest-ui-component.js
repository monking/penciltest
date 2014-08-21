var PenciltestUIComponent;

PenciltestUIComponent = (function() {
  PenciltestUIComponent.prototype.options = {
    tagName: 'div',
    className: null,
    id: null,
    parent: document.body
  };

  function PenciltestUIComponent(options) {
    this.options = Utils.inherit({}, options, PenciltestUIComponent.prototype.options);
    this.createElement();
  }

  PenciltestUIComponent.prototype.createElement = function() {
    this.el = {};
    this.el.container = document.createElement(this.options.tagName);
    if (this.options.className) {
      this.el.container.className = this.options.className;
    }
    if (this.options.id) {
      this.el.container.id = this.options.id;
    }
    return this.appendTo(this.options.parent);
  };

  PenciltestUIComponent.prototype.appendTo = function(parent) {
    if (typeof parent.appendComponent === 'function') {
      return parent.appendComponent(this);
    } else {
      return parent.appendChild(this.el.container);
    }
  };

  PenciltestUIComponent.prototype.appendComponent = function(component) {
    return this.el.container.appendChild(component.el.container);
  };

  PenciltestUIComponent.prototype.getElement = function() {
    return this.el.container;
  };

  PenciltestUIComponent.prototype.setHTML = function(markup) {
    return this.el.container.innerHTML = markup;
  };

  return PenciltestUIComponent;

})();
