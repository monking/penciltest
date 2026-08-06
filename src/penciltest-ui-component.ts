class PenciltestUIComponent {
  components: PenciltestUIComponentDict;
  options: PenciltestUIComponentOptions;
  key: string;
  el: { container?: HTMLElement; };
  parent: PenciltestUIComponent;
  parentElement: HTMLElement;
  children: Array<PenciltestUIComponent>;
  //refreshHandlers: Array<Function>;
  isAttached: boolean;

  static restore(options:PenciltestUIComponentOptions, components:PenciltestUIComponentDict): PenciltestUIComponent {
    if (options.key && options.key in components) {
      const component = components[options.key];
      component.setContent(options);
      return component;
    }
    return new PenciltestUIComponent(options, components);
  }

  constructor(options:PenciltestUIComponentOptions, components:PenciltestUIComponentDict = {}) {
    this.options = {
      tagName: 'div',
      ...options
    };

    this.components = components;

    this.children = [];
    this.el = {};
    //this.refreshHandlers = [];

    const element = this.setElement(document.createElement(this.options.tagName || 'div'));

    if (this.options.on) {
      for (let eventName in this.options.on) {
        this.getElement().addEventListener(eventName, this.options.on[eventName].bind(this.getElement()));
      }
    }

    if (this.options.children) {
      this.options.children.forEach(
        (childConfig:PenciltestUIComponentOptions) => PenciltestUIComponent.restore({...childConfig, parent: this}, this.components)
      );
    }

    this.setContent(this.options, true);

    this.attach();

    if (this.options.key) {
      this.key = this.options.key;
      this.components[this.options.key] = this;
    }
  }

  attach(): boolean {
    if (this.isAttached) { return true; }

    if (!this.parentElement && this.options.parentElement) {
      this.parentElement = this.options.parentElement;
    }

    if (this.parentElement) {
      this.parentElement.appendChild(this.getElement());
      this.isAttached = true;
    } else {
      if (!this.parent) {
        if (typeof this.options.parent === 'string') {
          if (this.options.parent in this.components) {
            this.parent = this.components[this.options.parent];
          }
        } else if (this.options.parent) {
          this.parent = this.options.parent as PenciltestUIComponent;
        }
      }

      if (this.parent) {
        this.parent.attachChild(this);
        this.parentElement = this.parent.getElement();
        this.isAttached = true;
      }
    }

    return this.isAttached;
  }

  detach(): boolean {
    if (!this.isAttached) { return true; }

    if (this.parentElement) {
      this.parentElement.removeChild(this.getElement());
      this.isAttached = false;
    }
  }

  destroy() {
    this.detach()
    if (this.components && this.key in this.components) {
      delete this.components[this.key];
    }
  }

  setContent(inputConfig:PenciltestUIComponentOptions, force:boolean = false): boolean {
    // NOTE: The 'key' property is necessary for children components to also have their content updated.

    // Shallow clone to enable deleting members without affecting input object.
    const config:PenciltestUIComponentOptions = {...inputConfig};

    let changed = false;

    // Content precedence is (exclusively): children, html, text
    if (this.children.length === 0) {
      if (config.html) {
        changed = config.html !== this.options.html
        if (force || changed) {
          this.getElement().innerHTML = this.options.html = config.html;
        }
      } else if (config.text) {
        changed = config.text !== this.options.text
        if (force || changed) {
          this.getElement().innerText = this.options.text = config.text;
        }
      }
    } else if (config.children) {
      config.children.forEach((childConfig) => {
        if (!childConfig.key) { return; } // Avoiding assumptions of persistent child node order.
        const childComponent = PenciltestUIComponent.restore(childConfig, this.components);
        if (typeof childComponent.setContent !== 'function') { return; }
        childComponent.setContent(childConfig);
      });
    }

    if (config.className) {
      const classChanged = config.className !== this.options.className;
      if (force || classChanged) {
        this.getElement().className = config.className;
      }
      changed = changed || classChanged;
    }

    if (config.style) {
      Object.assign(this.getElement().style, config.style);
    }

    if (config.attr) {
      for (let key in config.attr) {
        const attrChanged = config.attr[key] !== this.options.attr[key];
        if (force || attrChanged) {
          this.getElement().setAttribute(key, config.attr[key]);
        }
        changed = changed || attrChanged;
      }

      if (this.options.attr) {
        // Assigning nested object separately.
        Object.assign(this.options.attr, config.attr);
        delete config.attr;
      }
    }
    Object.assign(this.options, config);

    return changed;
  }

  attachChild(child:PenciltestUIComponent) {
    this.getElement().appendChild(child.getElement());
    this.children.push(child)
  }

  getElement() { return this.el.container; }

  setElement(element:HTMLElement) { return this.el.container = element; }

}
