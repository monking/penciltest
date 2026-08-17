class PenciltestUIComponent {
  components: PenciltestUIComponentDict;
  controller: Penciltest;
  options: PenciltestUIComponentOptions;
  key: string;
  el: { container?: HTMLElement; };
  parent: PenciltestUIComponent;
  parentElement: HTMLElement;
  children: Array<PenciltestUIComponent>;
  protected isAttached: boolean;
  isPtComponent: boolean;

  static restore(options:PenciltestUIComponentOptions, components:PenciltestUIComponentDict, forceReattach:boolean = false): PenciltestUIComponent {
    const component = options.is
      ? options.is
      : (options.key && options.key in components)
        ? components[options.key]
        : null;
    if (component !== null) {
      component.setContent(options);
      component.attach(options, forceReattach);
      return component;
    }
    return new PenciltestUIComponent(options, components);
  }

  static getElement(component: PenciltestUIComponent | any): HTMLElement | null {
    if (component && component.isPtComponent) {
      return component.getElement();
    }
    return null;
  }

  static find(element:HTMLElement, components:PenciltestUIComponentDict): PenciltestUIComponent | null {
    const key = element.getAttribute('x-key');
    if (key) {
      return PenciltestUIComponent.restore({key}, components);
    }
    return null;
  }

  constructor(options:PenciltestUIComponentOptions, components:PenciltestUIComponentDict = {}) {
    this.isPtComponent = true;

    this.options = {
      tagName: 'div',
      ...options
    };

    this.controller = this.options.controller;
    this.components = components;
    this.children = [];
    this.el = {};

    const element = this.setElement(options.el || document.createElement(this.options.tagName || 'div'));

    if (this.options.key) {
      element.setAttribute('x-key', this.options.key);
    }

    if (this.options.on) {
      for (let eventName in this.options.on) {
        const boundListener = this.options.on[eventName].bind(this.getElement())
        this.getElement().addEventListener(eventName, (event) => {
          boundListener(event, this.components);
        });
      }
    }

    this.setContent(this.options, true);

    this.attach();

    if (this.options.key) {
      this.key = this.options.key;
      this.components[this.options.key] = this;
    }
  }

  attach(newOptions:PenciltestUIComponentOptions = {}, force:boolean = false): boolean {
    const options = {
      ...this.options,
      ...newOptions,
    };
    if (this.isAttached && !force) { return true; }

    if (!this.parentElement) {
      if (options.parentElement) {
        this.parentElement = options.parentElement;
      } else if (options.el?.parentElement) {
        this.parentElement = options.el.parentElement;
      }
    }

    if (this.parentElement) {
      this.parentElement.appendChild(this.getElement());
      this.isAttached = true;
    } else {
      if (!this.parent) {
        if (typeof options.parent === 'string') {
          if (options.parent in this.components) {
            this.parent = this.components[options.parent];
          }
        } else if (options.parent) {
          this.parent = options.parent as PenciltestUIComponent;
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

  removeElement(): void {
    const el = this.getElement();
    if (el) { el.remove(); }
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
    }
    if (config.children) {
      config.children.forEach((childConfig) => {
        const childConfigWithThisAsParent = {
          ...childConfig,
          parent: this,
        };
        //if (!force && !childConfigWithThisAsParent.key) { return; } // Avoiding assumptions of persistent child node order.
        const childComponent = PenciltestUIComponent.restore(childConfigWithThisAsParent, this.components);
        //if (typeof childComponent.setContent !== 'function') { return; }
        //childComponent.setContent(childConfigWithThisAsParent); //restore already calls setContent
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

  static makeInputLabel(inputConfig: PenciltestUIComponentOptions, options:any = {}): Array<PenciltestUIComponentOptions> {
    const {
      prefix: labelPrefix,
      suffix: labelSuffix,
      labelFirst,
      text: initialText,
      live: isLive,
    }= {
      live: false,
      text: '',
      prefix: '',
      suffix: '',
      labelFirst: true,
      ...options,
    }
    const inputKey = `${inputConfig.key || Utils.uid()}`;
    const inputId = `${inputConfig.attr?.id || inputKey}`;
    const labelKey = `${inputKey || Utils.uid()}_label`;

    if (isLive) {
      const previousOnInputListener = inputConfig.on?.input;
      Object.assign(inputConfig, {
        key: inputKey,
        attr: {
          ...inputConfig.attr,
          id: inputId,
        },
        on: {
          'input': (e, components) => {
            const label = components[labelKey].getElement();
            const input = e.target as HTMLInputElement;
            if (label && input) {
              label.innerText = `${labelPrefix}${input.value}${labelSuffix}`;
            }
            if (typeof previousOnInputListener === 'function') {
              previousOnInputListener(e, components);
            }
          },
        },
      });
    }

    const initialLabelValue = isLive
      ? String(inputConfig.attr?.value) || ''
      : initialText;
    const labelConfig = {
      tagName: 'label',
      key: labelKey,
      text: `${labelPrefix}${initialLabelValue}${labelSuffix}`,
      attr: {
        for: inputId,
      },
    };

    const configs = [labelConfig, inputConfig];

    return labelFirst ? configs : configs.reverse();
  }

  getElement() { return this.el?.container; }

  setElement(element:HTMLElement) { return this.el.container = element; }

}
