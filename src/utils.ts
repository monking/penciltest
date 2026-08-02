interface PromptOptions {
  input?: HTMLInputElement | HTMLSelectElement | string;
  submitOnChange?: boolean;
  onOpen?: Function;
}

interface FilePromptOptions extends PromptOptions {
  accept?: string;
  loadAs?: "text" | "uri" | "files";
}

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
      if (globalThis.confirm(message)) {
        resolve(true);
      } else {
        reject();
      }
    });
  };

  static async prompt(message: string, defaultValue: any = null, options: PromptOptions = {}): Promise<string> {
    const {
      input: givenPromptInput,
      submitOnChange: shouldSubmitOnChange,
    } = options;

    let property: string | number, value: any;
    globalThis.pauseKeyboardListeners = true; // FIXME: needed so that the penciltest-ui.coffee keyboard listener can not interfere. Find a better way (event driven?)
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

    const promptInput = (typeof givenPromptInput === 'string' || !givenPromptInput
      ? document.createElement('input')
      : givenPromptInput) as HTMLInputElement;
    if (typeof givenPromptInput === 'string') {
      promptInput.setAttribute('type', givenPromptInput);
    }
    if (defaultValue !== null) { promptInput.value = defaultValue; }
    promptInput.style.display = 'block';
    promptForm.appendChild(promptInput);

    return new Promise((resolve, reject) => {
      const promptKeyListener = function(event: KeyboardEvent):any {
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
        globalThis.pauseKeyboardListeners = false;
      };

      const cancelPrompt = ():void => {
        closePromptModal();
        reject(promptInput.value);
      };

      const submitPrompt = ():void => {
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
        reject();
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
  };


  static select(message: string, choices: Array<string>, defaultValue: string, options: PromptOptions = {}): Promise<string | boolean> {
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
    48  : ')',
    49  : '!',
    50  : '@',
    51  : '#',
    52  : '$',
    53  : '%',
    54  : '^',
    55  : '&',
    56  : '*',
    57  : '(',
    79  : ')',
    187 : '+',
    189 : '_',
    191 : '?'
  };

  static getKeyCodeName(keyCode: number, shiftKey: boolean = false, key: string = ''):string {
    let keyCodeName: any;
    if (shiftKey && Utils.shiftKeyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = Utils.shiftKeyCodeNames[keyCode];
    } else if (Utils.keyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = Utils.keyCodeNames[keyCode];
    } else {
      keyCodeName = `${shiftKey ? 'Shift+' : ''}${key || String.fromCharCode(keyCode)}`;
    }

    return keyCodeName;
  };

  static describeKeyCombo(event: KeyboardEvent):string {
    const combo = [];
    if (event.metaKey) { combo.push('Super'); }
    if (event.ctrlKey) { combo.push('Ctrl'); }
    if (event.altKey) { combo.push('Alt'); }
    if (event.shiftKey && !Utils.shiftKeyCodeNames.hasOwnProperty(event.keyCode)) {
      combo.push('Shift');
    }

    const keyName = Utils.getKeyCodeName(event.keyCode, event.shiftKey);
    if (!/^Ctrl|Alt|Shift$/.test(keyName)) { combo.push(keyName); }

    return combo.join('+');
  };

  static averagePoints(points: Array<Point>):Point {
    const sumPoints:Point = {x: 0, y: 0};
    for (let point of points) {
      sumPoints.x += point.x;
      sumPoints.y += point.y;
    }

    sumPoints.x /= points.length;
    sumPoints.y /= points.length;

    return sumPoints;
  };

  static touchPoint(event: TouchEvent, touchLimit: number = 1, scope: "client" | "page" = "client"):Point {
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
      return Utils.averagePoints(points);
    }
  };

  static eventPoint(event: PointerEvent | TouchEvent, scope: "client" | "page" = "client", mode: "first" | "average" = "first"):Point {
    if (event.type.substr(5) === 'touch') {
      return Utils.touchPoint(event as TouchEvent);
    }
    return {
      x: event[`${scope}X`],
      y: event[`${scope}Y`]
    };
  };

  static scalePoint(point: Point, factor: number) {
    return {
      x: point.x * factor,
      y: point.y * factor
    }
  };

  static diffPoints(point1: Point, point2: Point):Point {
    return {
      x: point1.x - point2.x,
      y: point1.y - point2.y
    };
  };

  static getDecimal(input: number, precision: number, toString: boolean = false): string | number {
    const factor = Math.pow(10, precision);
    const value = Math.round(input * factor) / factor;

    if (toString) {
      const parts = String(value).split('.');
      if (parts.length === 1) {
        parts.push('0');
      }
      while (parts[1].length < precision) { parts[1] += '0'; }
      return parts.join('.');
    }

    return value;
  };

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
};
