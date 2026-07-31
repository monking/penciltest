interface PenciltestUIComponentOptions {
  tagName?: string;
  className?: string | null;
  text?: string | null;
  id?: string | null;
  parent: HTMLElement;
};

class PenciltestUIComponent {
  options: PenciltestUIComponentOptions;
  el: { container?: HTMLElement; };
  static defaultOptions: PenciltestUIComponentOptions = {
    tagName: 'div',
    parent: document.body
  };
  
  constructor(options: any) {
    this.options = {
      ...PenciltestUIComponent.defaultOptions,
      ...options
    };
    this.createElement();
  }

  createElement() {
    this.el = {};

    this.el.container = document.createElement(this.options.tagName || 'div');
    if (this.options.className) { this.el.container.className = this.options.className; }
    if (this.options.id) { this.el.container.id = this.options.id; }
    if (this.options.text) { this.el.container.innerText = this.options.text; }

    return this.appendTo(this.options.parent);
  }

  appendTo(parent) {
    if (typeof parent.appendComponent === 'function') {
      return parent.appendComponent(this);
    } else {
      return parent.appendChild(this.el.container);
    }
  }

  appendComponent(component: { el: { container: any; }; }) {
    return this.el.container.appendChild(component.el.container);
  }

  getElement() { return this.el.container; }

  setHTML(markup: any) {
    return this.el.container.innerHTML = markup;
  }
}
