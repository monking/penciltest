let keyCode: number, keyCodeName: string | number;
var Utils = {

  clone(object: any) {
    return JSON.parse(JSON.stringify(object));
  },

  toggleClass(element: { classList: { contains: (arg0: any) => any; remove: (arg0: any) => void; add: (arg0: any) => void; }; }, className: any, presence = null) {
    let added=false;
    if (element.classList.contains(className)) {
      if (presence !== true) { element.classList.remove(className); }
    } else if (presence !== false) {
      element.classList.add(className);
      added = true;
    }
    return added;
  },

  inherit(child: { [x: string]: any; }, ...ancestors: {}) {
    if (child == null) { child = {}; }
    for (let ancestor of Array.from(ancestors)) {
      if (ancestor) {
        for (let key in ancestor) {
          const value = ancestor[key];
          if (typeof child[key] === 'undefined') { child[key] = ancestor[key]; }
        }
      }
    }
    return child;
  },

  log(...arguments) {
    // globalThis.location.hash = arguments[0].toString()
    return console.log.apply(console, arguments);
  },

  alert(...arguments) {
    return globalThis.alert.apply(globalThis, arguments);
  },

  confirm(message: any, callback: function | null = null) {
    if (globalThis.confirm(message)) { return callback(); }
  },

  prompt(message: any, defaultValue: any, callback: (arg0: any) => any, promptInput: { type: string; value: any; style: { display: string; }; addEventListener: (arg0: string, arg1: () => any) => void; focus: () => any; }, shouldSubmitOnChange: any) {
    let property: string | number, value: any;
    const utils = this;
    globalThis.pauseKeyboardListeners = true; // FIXME: needed so that the penciltest-ui.coffee keyboard listener can not interfere. Find a better way (event driven?)
    const promptModal = document.createElement('div');
    const promptModalCss = {
      position: 'absolute',
      top: '0px',
      left: '0px',
      bottom: '0px',
      right: '0px',
      backgroundColor: 'rgba(0,0,0,0.5)'
    };
    for (property in promptModalCss) {
      value = promptModalCss[property];
      promptModal.style[property] = value;
    }

    const promptForm = document.createElement('form');
    const promptFormCss = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      padding: '1em',
      transform: 'translateX(-50%) translateY(-50%)',
      backgroundColor: 'lightgray'
    };
    for (property in promptFormCss) {
      value = promptFormCss[property];
      promptForm.style[property] = value;
    }
    promptForm.innerHTML = message;
    promptModal.appendChild(promptForm);

    const promptType = typeof promptInput === 'string' ? promptInput : null;
    if (typeof promptInput !== 'object') { promptInput = document.createElement('input'); } 
    if (promptType !== null) {
      promptInput.type = promptType;
    }
    try {
      if (defaultValue !== null) { promptInput.value = defaultValue; }
    } catch (e) {
      console.error(e);
    }
    promptInput.style.display = 'block';
    promptForm.appendChild(promptInput);

    const closePromptModal = function() {
      promptModal.remove();
      document.removeEventListener('keydown', promptKeyListener);
      return globalThis.pauseKeyboardListeners = false;
    };

    const submitPromptModal = function() {
      closePromptModal();
      return callback(promptInput.value);
    };

    var promptKeyListener = function(event: any) {
      const keysDescription = utils.describeKeyCombo(event);
      if (keysDescription === 'Esc') {
        return closePromptModal();
      } else if (keysDescription === 'Enter') {
        return submitPromptModal();
      }
    };

    document.addEventListener('keydown', promptKeyListener);

    const promptCancelButton = document.createElement('button');
    promptCancelButton.type = 'button';
    promptCancelButton.innerHTML = 'Cancel';
    promptCancelButton.addEventListener('click', function(event: { preventDefault: () => void; }) {
      event.preventDefault();
      return closePromptModal();
    });
    promptForm.appendChild(promptCancelButton);

    if (shouldSubmitOnChange) {
      promptInput.addEventListener('change', () => submitPromptModal());
    } else {
      const promptAcceptButton = document.createElement('input');
      promptAcceptButton.type = 'submit';
      promptAcceptButton.value = 'Accept';
      promptForm.addEventListener('submit', function(event: { preventDefault: () => void; }) {
        event.preventDefault();
        return submitPromptModal();
      });
      promptForm.appendChild(promptAcceptButton);
    }

    document.body.appendChild(promptModal);
    return promptInput.focus();
  },


  // @param message string
  // @param options array of strings
  // @return selected string or boolean false
  select(message: any, options: { length?: any; indexOf?: any; }, defaultValue: any, callback: (arg0: any) => any) {
    // TODO: a real selectable list
    // TODO: update the application core to handle async prompts (e.g. selectSceneNames)
    let option: any;
    const selectInput = document.createElement('select');
    for (let index = 0; index < options.length; index++) {
      option = options[index];
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.innerHTML = option;
      selectInput.appendChild(optionElement);
      if (option === defaultValue) { selectInput.selectedIndex = index; }
    }

    const promptCallback = function(selected: number | boolean) {
      if (selected && options.indexOf(selected === -1)) {
        for (option of Array.from(options)) {
          if (RegExp(selected).test(option)) { selected = option; }
        }
      }

      if (!selected || (options.indexOf(selected) === -1)) {
        selected = false;
      }
      return callback(selected);
    };
    return this.prompt(message, null, promptCallback, selectInput);
  },

  promptForFile(message: any, callback: (arg0: any, arg1: any) => void, acceptTypes: any, loadAs: string) {
    if (loadAs == null) { loadAs = 'files'; }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    if (acceptTypes) { fileInput.accept = String(acceptTypes); }
    const loadFile = function(filePath: any) {
      if (loadAs === 'text') {
        return (() => {
          const result = [];
          for (let file of Array.from(fileInput.files)) {
            const fileReader = new FileReader();
            fileReader.addEventListener('load', (event: { target: { result: any; }; }) => callback(event.target.result, filePath));
            result.push(fileReader.readAsText(file));
          }
          return result;
        })();
      } else if (loadAs === 'uri') {
        return (() => {
          const result1 = [];
          for (let file of Array.from(fileInput.files)) {
            if (file) {
              callback(URL.createObjectURL(file), filePath);
              break;
            } else {
              result1.push(undefined);
            }
          }
          return result1;
        })();
      } else {
        return callback(fileInput.files, filePath);
      }
    };
    this.prompt(message, null, loadFile, fileInput, true);
    return fileInput.click();
  },

  keyCodeNames: {
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
  },

  shiftKeyCodeNames: {
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
  },

  getKeyCodeName(keyCode: string | number, shiftKey: any) {
    let keyCodeName: any;
    if (shiftKey && this.shiftKeyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = this.shiftKeyCodeNames[keyCode];
    } else if (this.keyCodeNames.hasOwnProperty(keyCode)) {
      keyCodeName = this.keyCodeNames[keyCode];
    } else {
      keyCodeName = String.fromCharCode(keyCode); // sometimes correct; use keyCodeNames
    }

    return keyCodeName;
  },

  describeKeyCombo(event: { metaey: any; ctrlKey: any; altKey: any; keyCode: any; shiftKey: any; }) {
    const combo = [];
    if (event.metaey) { combo.push('Super'); }
    if (event.ctrlKey) { combo.push('Ctrl'); }
    if (event.altKey) { combo.push('Alt'); }
    if (!this.shiftKeyCodeNames.hasOwnProperty(event.keyCode)) {
      if (event.shiftKey) { combo.push('Shift'); }
    }

    const keyName = this.getKeyCodeName(event.keyCode, event.shiftKey);
    if (!/^Ctrl|Alt|Shift$/.test(keyName)) { combo.push(keyName); }

    return combo.join('+');
  },

  averageTouches(event: { targetTouches: { length: number; }; }) {
    const sumPoints = {x: 0, y: 0};
    for (let point of Array.from(event.targetTouches)) {
      sumPoints.x += point.clientX;
      sumPoints.y += point.clientY;
    }

    sumPoints.x /= event.targetTouches.length;
    sumPoints.y /= event.targetTouches.length;

    return sumPoints;
  },

  diffPoints(point1: { x: number; y: number; }, point2: { x: number; y: number; }) {
    return {
      x: point1.x - point2.x,
      y: point1.y - point2.y
    };
  },

  getDecimal(value: number, precision: number, toString: boolean = false): string | number {
    const factor = Math.pow(10, precision);
    const value = Math.round(value * factor) / factor;

    if (toString) {
      const parts = output.toString().split('.');
      if (parts.length === 1) {
        parts.push('0');
      }
      while (parts[1].length < precision) { parts[1] += '0'; }
      return parts.join('.');
    }

    return value;
  },

  encodeBase64(input: any) {
    return btoa(input);
  },

  decodeBase64(input: any) {
    return atob(input);
  },

  downloadFromUrl(url: any, filename: any) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    return link.click();
  }
};

Utils.keyCodes = {};
for (keyCode = 0; keyCode < 256; keyCode++) {
  keyCodeName = Utils.keyCodeNames[keyCode] || String.fromCharCode(keyCode);
  if (keyCodeName) {
    Utils.keyCodes[keyCodeName] = keyCode;
    if (Utils.keyCodeNames[keyCode] == null) { Utils.keyCodeNames[keyCode] = keyCodeName; }
  }
}

Utils.shiftKeyCodes = {};
for (keyCodeName in Utils.shiftKeyCodeNames) { keyCode = Utils.shiftKeyCodeNames[keyCodeName]; Utils.shiftKeyCodes[keyCode] = keyCodeName; }
