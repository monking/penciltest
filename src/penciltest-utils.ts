interface PromptOptions {
  input?: HTMLInputElement | HTMLSelectElement | string;
  inputAttrs?: { [key:string]: any; };
  inputLabel?: string;
  labelLogic?: (value:string) => string;
  onOpen?: Function;
  submitOnChange?: boolean;
}

interface FilePromptOptions extends PromptOptions {
  accept?: string;
  loadAs?: "text" | "uri" | "files";
}

enum GlobalPromiseGroup {
  MODAL = "modal",
};

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

  static promptCanceled = 'canceled';
  static async prompt(message: string, defaultValue: any = null, options: PromptOptions = {}): Promise<string> {
    const {
      input: givenPromptInput,
      submitOnChange: shouldSubmitOnChange,
      inputAttrs,
      inputLabel,
      labelLogic,
    } = options;

    let property: string | number, value: any;
    const promptModal = document.createElement('div');
    Object.assign(promptModal.style, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      bottom: '0px',
      right: '0px',
      backgroundColor: 'rgba(0,0,0,0.5)'
    });

    const promptForm = document.createElement('form');
    Object.assign(promptForm.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      padding: '1em',
      transform: 'translateX(-50%) translateY(-50%)',
      backgroundColor: 'lightgray'
    });
    promptForm.innerHTML = message;
    promptModal.appendChild(promptForm);

    const inputRow = document.createElement('div');

    const promptInput = (typeof givenPromptInput === 'string' || !givenPromptInput
      ? document.createElement('input')
      : givenPromptInput) as HTMLInputElement;
    if (typeof givenPromptInput === 'string') {
      promptInput.setAttribute('type', givenPromptInput);
    }
    if (inputAttrs) {
      for (let key in inputAttrs) {
        promptInput.setAttribute(key, inputAttrs[key]);
      }
    }
    if (!promptInput.hasAttribute('id')) {
      promptInput.setAttribute('id', 'promptInputLabel');
    }
    if (defaultValue !== null) { promptInput.value = defaultValue; }

    inputRow.appendChild(promptInput);

    if (inputLabel || labelLogic) {
      const labelElement = document.createElement('label')
      labelElement.setAttribute('for', promptInput.getAttribute('id'));
      if (labelLogic) {
        promptInput.addEventListener('input', (event) => {
          labelElement.innerText = labelLogic(promptInput.value);
        });
        labelElement.innerText = labelLogic(defaultValue);
      } else if (inputLabel) {
        labelElement.innerText = inputLabel;
      }
      Object.assign(labelElement.style, {
        padding: '0.5em 1em',
        'vertical-align': 'top',
        'line-height': '1.6em'
      });
      inputRow.appendChild(labelElement);
    }

    promptForm.appendChild(inputRow);

    const promptPromise:Promise<string> = new Promise((resolve, reject) => {
      const promptKeyListener = function(event: KeyboardEvent): any {
        const keysDescription = Utils.describeKeyCombo(event);
        if (keysDescription === 'Esc') {
          cancelPrompt();
        } else if (keysDescription === 'Enter') {
          submitPrompt();
        }
      };

      const closePromptModal = function() {
        promptModal.remove();
        document.removeEventListener('keydown', promptKeyListener);
      };

      const cancelPrompt = (): void => {
        closePromptModal();
        resolve(null);
      };

      const submitPrompt = (): void => {
        closePromptModal();
        resolve(promptInput.value);
      };

      document.addEventListener('keydown', promptKeyListener);

      const promptCancelButton = document.createElement('button');
      promptCancelButton.type = 'button';
      promptCancelButton.innerHTML = 'Cancel';
      promptCancelButton.addEventListener('click', function(event: { preventDefault: () => void; }) {
        event.preventDefault();
        closePromptModal();
        resolve(null);
      });
      promptForm.appendChild(promptCancelButton);

      if (shouldSubmitOnChange) {
        promptInput.addEventListener('change', submitPrompt);
      } else {
        const promptAcceptButton = document.createElement('input');
        promptAcceptButton.type = 'submit';
        promptAcceptButton.value = 'Accept';
        promptForm.addEventListener('submit', function(event: Event) {
          event.preventDefault();
          submitPrompt();
        });
        promptForm.appendChild(promptAcceptButton);
      }

      document.body.appendChild(promptModal);
      if (typeof options.onOpen === 'function') {
        options.onOpen();
      } else {
        promptInput.focus();
      }
    });

    Utils.registerGlobalPromise(promptPromise);

    return promptPromise;
  };


  static promptSelect(message: string, choices: Array<string>, defaultValue: string, options: PromptOptions = {}): Promise<string | boolean> {
    // TODO: update the application core to handle async prompts (e.g. selectSceneNames)
    const selectInput = document.createElement('select');
    choices.forEach((choice, index) => {
      const optionElement = document.createElement('option');
      optionElement.value = choice;
      optionElement.innerHTML = choice;
      if (choice === defaultValue) { optionElement.setAttribute('selected', 'true'); }
      selectInput.appendChild(optionElement);
    });
    return Utils.prompt(message, null, { ...options,  input: selectInput });
  };

  static async promptForFile(message: string, options: FilePromptOptions = {}): Promise<Array<any>> {
    // FIXME include filePath in result
    const { accept, loadAs } = options;
    const fileInput = document.createElement('input') as HTMLInputElement;
    fileInput.setAttribute('type', 'file');
    if (accept) { fileInput.setAttribute('accept', accept); }
    try {
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
      };
    } catch(ignore) {
      return [];
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

  static touchPoint(event: TouchEvent, touchLimit: number = 1, scope: AnyPointerScope = "client"):Point {
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
      return PTSpace.averagePoints(points);
    }
  };

  static eventPoint(event: AnyPointerEvent, scope: AnyPointerScope = "client", touchLimit: number = 1):Point {
    if (event.type.substr(5) === 'touch') {
      return Utils.touchPoint(event as TouchEvent);
    }
    return {
      x: event[`${scope}X`],
      y: event[`${scope}Y`]
    };
  };

  static toDecimal(input:number, precision:number, options:{string?:boolean, pad?:number, prefix?:boolean} = {string: false, pad: 0, prefix: false}): string | number {
    const {
      string: toString,
      pad: leftPad,
      prefix: literalPositive
    } = options;
    const factor = Math.pow(10, precision);
    const value = Math.round(input * factor) / factor;

    if (toString) {
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
    }

    return value;
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
        return Utils.toDecimal(segment, index === 0 ? precision : 0, {string:true, pad:2});
      })
      .filter((x) => typeof x === 'string')
      .reverse()
      .join(':');
  };

  static isMultiple(a:number, b:number, precision:number = 0.001):[boolean, number, number, boolean] {
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

};
