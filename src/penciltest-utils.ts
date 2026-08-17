interface PromptOptions {
  inputKeys?: Array<string>;
  onOpen?: Function;
  className?: string;
}
interface PromptSingleInputOptions extends PromptOptions {
  input?: HTMLInputElement | HTMLSelectElement | PenciltestUIComponent | PenciltestUIComponentOptions | string;
  inputAttrs?: { [key:string]: any; };
  inputLabel?: string;
  labelLogic?: (value:string) => string;
  submitOnChange?: boolean;
}

interface FilePromptOptions extends PromptSingleInputOptions {
  accept?: string;
  loadAs?: "text" | "uri" | "files";
}

interface ColorStringOptions {
  omitFullAlpha?: boolean;
}

enum GlobalPromiseGroup {
  MODAL = "modal",
};

var PtUtilsUID: number = 0;

class Utils {

  static clone(object: any) {
    return JSON.parse(JSON.stringify(object));
  };

  static toggleClass(element: HTMLElement, className: string, presence: boolean | null = null): boolean {
    let added=false;
    if (element.classList.contains(className)) {
      if (presence !== true) { element.classList.remove(className); }
    } else if (presence !== false) {
      element.classList.add(className);
      added = true;
    }
    return added;
  };

  static getColorString(color: Color | string | null, opacity:number = -1, options:ColorStringOptions = {}): string {
    // TODO: I suppose I'm permitting `null` values for `color` so that this
    // method can be called in a `.map()` without modification. Is that
    // necessary?
    if (!color) { return ''; }

    const channels = Array.isArray(color)
      ? color.slice(0)
      : Utils.getColorChannels(color);

    if (channels.length === 0 && typeof color === 'string') {
      if (opacity !== -1) {
        return `rgb(from ${color} r g b / ${Utils.toDecimal(opacity, 3)})`;
      }
      return color;
    }

    if (channels.length === 3) {
      channels.push(1);
    }
    channels[3] *= 255;
    if (opacity !== -1) {
      channels[3] *= opacity
    }
    if (options.omitFullAlpha && Math.round(channels[3]) === 255) {
      channels.pop();
    }
    return '#'+channels
      .map((n) => {
        const hex = Math.floor(n).toString(16)
        return (hex.length === 1 ? '0' : '')+hex;
      })
      .join('');
  };

  static getColorChannels(color:string): Array<number> {
    const channels = [];
    if (color[0] === '#') {
      for (let i = 1; i < color.length; i += 2) {
        const hex = color.substr(i, 2);
        channels.push(Number(`0x${hex}`));
      }
      if (channels[3]) {
        channels[3] /= 255;
      }
    } else if (color.substr(0,3) === 'rgb') {
      const pattern = /rgba?\( *([0-9]+) *, *([0-9]+) *, *([0-9]+)( *[,\/] *([0-9.]+))?/;
      const groups = color.match(pattern);
      if (groups) {
        channels.push(Number(groups[1]));
        channels.push(Number(groups[2]));
        channels.push(Number(groups[3]));
        if (groups[5]) {
          channels.push(Number(groups[5]));
        }
      }
    }
    return channels as Color;
  };

  static inherit(child: {} | Array<any>, ...ancestors: Array<{}>): any {
    if (child == null) { child = {}; }
    for (let ancestor of ancestors) {
      if (ancestor) {
        for (let key in ancestor) {
          const value = ancestor[key];
          if (typeof child[key] === 'undefined') { child[key] = ancestor[key]; }
        }
      }
    }
    return child;
  };

  static log(...args: Array<any>): void {
    // globalThis.location.hash = args[0].toString()
    console.log.apply(console, args);
  };

  static alert(...args): void {
    globalThis.alert.apply(globalThis, args);
  };

  static confirm(message: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(globalThis.confirm(message));
    });
  };

  static async promptForm(message:string, formComponentDefs: Array<PenciltestUIComponentOptions>, options: PromptOptions = {}): Promise<Dictionary> {
    const promptPromise:Promise<Dictionary> = new Promise((resolve, reject) => {
      const promptComponents:PenciltestUIComponentDict = {};

      const promptKeyListener = function(event: KeyboardEvent): any {
        const keysDescription = Utils.describeKeyCombo(event);
        if (keysDescription === 'Esc') {
          cancelPrompt();
        } else if (keysDescription === 'Enter') {
          submitPrompt();
        }
      };
      document.addEventListener('keydown', promptKeyListener);

      const closePromptModal = function() {
        const promptModal = promptComponents.modal.getElement();
        if (promptModal) {
          promptModal.remove();
        }
        document.removeEventListener('keydown', promptKeyListener);
      };

      const cancelPrompt = (): void => {
        closePromptModal();
        resolve(null);
      };

      const submitPrompt = (): void => {
        const result = {};
        if (Array.isArray(options.inputKeys) && options.inputKeys.length > 0) {
          options.inputKeys.forEach((key) => {
            const component = promptComponents[key];
            if (!component) { return; }
            const inputElement = promptComponents[key].getElement() as HTMLInputElement;
            if (!inputElement) { return; }
            result[key] = inputElement.value;
          });
        }
        closePromptModal();
        resolve(result);
      };

      const promptComponentDefinitions = [];

      const modalDef:PenciltestUIComponentOptions = {
        key: 'modal',
        style: {
          position: 'absolute',
          top: '0px',
          left: '0px',
          bottom: '0px',
          right: '0px',
          backgroundColor: 'rgba(0,0,0,0.5)'
        },
        parentElement: document.body
      };
      promptComponentDefinitions.push(modalDef);

      const formDef:PenciltestUIComponentOptions = {
        key: 'form',
        tagName: 'form',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          padding: '1em',
          transform: 'translateX(-50%) translateY(-50%)',
          backgroundColor: 'lightgray'
        },
        on: {
          'submit': function(event:Event) {
            event.preventDefault();
            submitPrompt();
          },
        },
        html: message,
        parent: 'modal'
      };
      if (options.className) {
        formDef.className = options.className;
      }
      promptComponentDefinitions.push(formDef);
      promptComponentDefinitions.push({
        key: 'formBody',
        parent: 'form',
        children: formComponentDefs
      });
      promptComponentDefinitions.push({
        key: 'cancel',
        tagName: 'button',
        attr: {
          type: 'button'
        },
        text: 'Cancel',
        on: {
          'click': (event: Event) => {
            event.preventDefault();
            closePromptModal();
            resolve(null);
          }
        },
        parent: 'form'
      });
      promptComponentDefinitions.push({
        key: 'submit',
        tagName: 'button',
        attr: {
          type: 'submit'
        },
        text: 'Accept',
        parent: 'form'
      });


      promptComponentDefinitions.forEach((def) => {
        new PenciltestUIComponent(def, promptComponents);
      });

      if (typeof options.onOpen === 'function') {
        options.onOpen();
      } else {
        promptComponents[options.inputKeys[0]].getElement().focus();
      }
    });

    Utils.registerGlobalPromise(promptPromise);

    return promptPromise;
  }

  static async prompt(message: string, defaultValue: any = null, options: PromptSingleInputOptions = {}): Promise<string | null> {
    const {
      input: givenPromptInput,
      submitOnChange: shouldSubmitOnChange,
      inputAttrs,
      inputLabel,
      labelLogic,
    } = options;

    const promptComponentDefinitions = [];

    const inputDef:PenciltestUIComponentOptions = {
      key: 'input',
      attr: { id: 'promptInputLabel', ...inputAttrs },
      parent: 'formBody',
    };
    if (typeof givenPromptInput === 'string' || !givenPromptInput) {
      inputDef.tagName = 'input';
      if (typeof givenPromptInput === 'string' && givenPromptInput) {
        inputDef.attr.type = givenPromptInput;
      }
    } else if (typeof givenPromptInput === 'object') {
      if ((givenPromptInput as PenciltestUIComponent).isPtComponent) {
        inputDef.is = givenPromptInput as PenciltestUIComponent;
      } else if ("nodeName" in givenPromptInput) {
        inputDef.el = givenPromptInput as HTMLInputElement;
      } else {
        const givenInputDef = givenPromptInput as PenciltestUIComponentOptions;
        Object.assign(inputDef, {
          ...givenInputDef,
          parent: inputDef.parent,
          on: { ...inputDef.on, ...givenInputDef.on },
          attr: { ...inputDef.attr, ...givenInputDef.attr }
        });
      }
    }
    if (defaultValue !== null) { inputDef.attr.value = defaultValue; }
    if (!inputDef.on) { inputDef.on = {}; }

    promptComponentDefinitions.push(inputDef);

    if (inputLabel || labelLogic) {
      const promptInputLabelDef:PenciltestUIComponentOptions = {
        key: 'promptInputLabel',
        tagName: 'label',
        attr: {
          for: inputDef.attr.id
        },
        style: {
          padding: '0.5em 1em',
          'vertical-align': 'top',
          'line-height': '1.6em'
        },
        parent: 'formBody'
      }
      if (labelLogic) {
        inputDef.on.input = (event, components) => { components.promptInputLabel.getElement().innerText = labelLogic((components.input.getElement() as HTMLInputElement).value); };
        promptInputLabelDef.text = labelLogic(defaultValue);
      } else if (inputLabel) {
        promptInputLabelDef.text = inputLabel;
      }
      promptComponentDefinitions.push(promptInputLabelDef);
    }

    if (shouldSubmitOnChange) {
      inputDef.on.change = (event, components) => {
        (components.form.getElement() as HTMLFormElement).requestSubmit();
      };
    }

    const promptFormOptions:PromptOptions = {
      ...options,
      inputKeys: ['input']
    };
    const result = await Utils.promptForm(message, promptComponentDefinitions, promptFormOptions);
    return result === null ? null : result.input;
  };

  static promptSelect(message: string, choices: Array<string>, defaultValue: string, options: PromptSingleInputOptions = {}): Promise<string | boolean> {
    const selectDef:PenciltestUIComponentOptions = {
      tagName: 'select',
      children: choices.map((choice, index) => {
        const optionDef:PenciltestUIComponentOptions = {
          tagName: 'option',
          attr: {
            value: choice
          },
          text: choice
        };
        if (choice === defaultValue) { optionDef.attr.selected = 'true'; }
        return optionDef;
      })
    };
    return Utils.prompt(message, null, { ...options,  input: selectDef });
  };

  static async promptForFile(message: string, options: FilePromptOptions = {}): Promise<Array<any> | null> {
    // FIXME include filePath in result
    const { accept, loadAs } = options;
    const fileInput = document.createElement('input') as HTMLInputElement;
    fileInput.setAttribute('type', 'file');
    if (accept) { fileInput.setAttribute('accept', accept); }
    const filePath = await Utils.prompt(
      message,
      null,
      {
        onOpen: () => fileInput.click(),
        ...options,
        input: fileInput
      }
    );
    if (filePath) {
      const files = Array.from(fileInput.files);
      if (loadAs === 'text') {
        return await Promise.all(files.map((file) => new Promise((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.addEventListener('load', (event: ProgressEvent<FileReader>) => resolve(event.target.result));
          fileReader.addEventListener('error', (event: ProgressEvent<FileReader>) => reject(event));
          fileReader.readAsText(file);
        })));
      } else if (loadAs === 'uri') {
        return files.map((file) => URL.createObjectURL(file));
      } else {
        return files;
      }
    } else {
      return null;
    }
  };

  static keyCodeNames = {
    8   : 'Backspace',
    9   : 'Tab',
    13  : 'Enter',
    16  : 'Shift',
    17  : 'Ctrl',
    18  : 'Alt',
    27  : 'Esc',
    32  : 'Space',
    33  : 'PgUp',
    34  : 'PgDn',
    35  : 'End',
    36  : 'Home',
    37  : 'Left',
    38  : 'Up',
    39  : 'Right',
    40  : 'Down',
    46  : 'Delete',
    91  : 'Super',
    188 : ',',
    190 : '.',
    186 : ';',
    187 : '=',
    189 : '-',
    191 : '/',
    219 : '[',
    221 : ']',
    222 : '\''
  };

  static shiftKeyCodeNames = {
    49  : '!',
    50  : '@',
    51  : '#',
    52  : '$',
    53  : '%',
    54  : '^',
    55  : '&',
    56  : '*',
    57  : '(',
    48  : ')',
    187 : '+',
    189 : '_',
    191 : '?'
  };

  static shiftKeyNameCodes = {
    '!': 49,
    '@': 50,
    '#': 51,
    '$': 52,
    '%': 53,
    '^': 54,
    '&': 55,
    '*': 56,
    '(': 57,
    ')': 48,
    '+': 187,
    '_': 189,
    '?': 191
  };

  static getKeyCodeName(keyCode: number, shiftKey: boolean = false, key: string = ''): string {
    let keyCodeName: any;
    if (shiftKey && Utils.shiftKeyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = Utils.shiftKeyCodeNames[keyCode];
    } else if (Utils.keyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = Utils.keyCodeNames[keyCode];
    } else {
      keyCodeName = `${key || String.fromCharCode(keyCode)}`;
    }

    return keyCodeName;
  };

  static describeKeyCombo(event: KeyboardEvent): string {
    const keyName = Utils.getKeyCodeName(event.keyCode, event.shiftKey);

    const combo = [];
    if (event.metaKey) { combo.push('Super'); }
    if (event.ctrlKey) { combo.push('Ctrl'); }
    if (event.altKey) { combo.push('Alt'); }
    if (event.shiftKey && !(keyName in this.shiftKeyNameCodes)) { combo.push('Shift'); }

    if (!/^Ctrl|Alt|Shift$/.test(keyName)) { combo.push(keyName); }

    //console.info(`combo: ${combo.join('+')} (#${event.keyCode})`);

    return combo.join('+');
  };

  static normalize(x:number, m:number = 1) { return x < m ? (x * x) / (m * m * 2) : 1 - (m / x / 2); }

  static lerp(a:number, b:number, weight:number = 0.5): number { return a + weight * (b - a); };

  static touchPoint(event: TouchEvent, touchLimit: number = 1, scope: AnyPointerScope = "client"): Point {
    const points = Array.from(event.touches)
      .slice(0, touchLimit)
      .map((touch) => {
        return {
          x: touch[`${scope}X`],
          y: touch[`${scope}Y`]
        };
      });
    if (touchLimit === 1) {
      return points[0];
    } else {
      return PtSpace.averagePoints(points);
    }
  };

  static eventPoint(event: AnyPointerEvent, scope: AnyPointerScope = "client", touchLimit: number = 1): Point {
    if (event.type.substr(5) === 'touch') {
      return Utils.touchPoint(event as TouchEvent, touchLimit, scope);
    }
    return {
      x: event[`${scope}X`],
      y: event[`${scope}Y`]
    };
  };

  static toDecimal(input:number, precision:number, options:{strict?:boolean, pad?:number, prefix?:boolean} = {strict: true, pad: 0, prefix: false}): string {
    const {
      strict,
      pad: leftPad,
      prefix: literalPositive
    } = options;
    const factor = Math.pow(10, precision);
    const value = Math.round(input * factor) / factor;

    if (!strict) {
      return String(value);
    }

    const parts = String(value).split('.');
    const prefix = literalPositive && value > 0 ? '+' : '';
    if (precision > 0) {
      if (parts.length === 1) {
        parts.push('0');
      }
      while (parts[1].length < precision) { parts[1] += '0'; }
    }
    while (parts[0].length < leftPad) { parts[0] = `0${parts[0]}`; }
    if (precision > 0) {
      return prefix + parts.join('.');
    } else {
      return prefix + parts[0];
    }
  };

  static toTimecode(milliseconds:number, precision:number = 2, minimumUnits:number = 2): string {
    const factors = [1000, 60, 60];
    let remainderMs = milliseconds;
    let cumulativeFactor = 1;
    return factors
      .map((factor, index) => {
        cumulativeFactor *= factor;
        let segment = (remainderMs / cumulativeFactor)
        if (index >= minimumUnits && segment < 1) { return null; }
        if (index < factors.length - 1) {
          segment %= factors[index + 1];
        }
        remainderMs -= segment * cumulativeFactor;
        return Utils.toDecimal(segment, index === 0 ? precision : 0, {pad:2});
      })
      .filter((x) => typeof x === 'string')
      .reverse()
      .join(':');
  };

  static isMultiple(a:number, b:number, precision:number = 0.001): [boolean, number, number, boolean] {
    let isALarger = a > b
    let factor = isALarger ? a / b : b / a;
    let wholeFactor = Math.round(factor);
    let wholeDiff = Math.abs(factor - wholeFactor);
    return [ wholeDiff < precision, wholeFactor, wholeDiff, isALarger ];
  }

  static getRange(range:PenciltestRange, subject:Array<any>, cut: boolean = false): [ Array<any>, number ] {
    if (typeof range?.start !== 'number' || typeof range.end !== 'number') { return [[], -1]; }
    const low = Math.max(0, Math.min(range.start, range.end, subject.length - 1));
    const high = Math.min(Math.max(0, range.start, range.end), subject.length - 1);
    const frames = cut ? subject.splice(low, high - low + 1) : subject.slice(low, high + 1);
    return [ frames, low ];
  }

  static getIntersection(a:Array<any>, b:Array<any>): Array<any> {
    return a.filter((A) => b.indexOf(A) !== -1);
  }

  static encodeBase64(input: any) {
    return btoa(input);
  };

  static decodeBase64(input: any) {
    return atob(input);
  };

  static downloadFromUrl(url: any, filename: any) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    return link.click();
  };

  static registerGlobalPromise(promise:Promise<any>, group:GlobalPromiseGroup = GlobalPromiseGroup.MODAL) {
    if (!("penciltestGlobalPromises" in globalThis)) {
      globalThis.penciltestGlobalPromises = {};
    }
    const set = globalThis.penciltestGlobalPromises;
    if (!(group in set)) {
      set[group] = [];
    }
    set[group].push(promise);
    promise.finally(() => {
      const promiseIndex = set[group].indexOf(promise);
      if (promiseIndex !== -1) {
        set[group].splice(promiseIndex, 1);
      }
    });
  }

  static getGlobalPromises(group:GlobalPromiseGroup = GlobalPromiseGroup.MODAL) {
    const set = globalThis.penciltestGlobalPromises;
    if (set && set[group]) { return set[group]; }
    return [];
  }

  static anyGlobalPromises(group:GlobalPromiseGroup = GlobalPromiseGroup.MODAL) {
    return Boolean(globalThis.penciltestGlobalPromises && globalThis.penciltestGlobalPromises[group]?.length > 0);
  }

  static uid(): number {
    return ++PtUtilsUID;
  }

};
