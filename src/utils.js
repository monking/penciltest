
/*
global: document, window, btoa, FileReader
 */
var Utils, code, name, _base, _i, _ref,
  __slice = [].slice;

Utils = {
  clone: function(object) {
    return JSON.parse(JSON.stringify(object));
  },
  toggleClass: function(element, className, presence) {
    var added, classIndex, classes;
    if (presence == null) {
      presence = null;
    }
    added = false;
    classes = element.className.split(/\s+/);
    classIndex = classes.indexOf(className);
    if (classIndex > -1) {
      if (presence !== true) {
        classes.splice(classIndex, 1);
      }
    } else if (presence !== false) {
      classes.push(className);
      added = true;
    }
    element.className = classes.join(' ');
    return added;
  },
  inherit: function() {
    var ancestor, ancestors, child, key, value, _i, _len;
    child = arguments[0], ancestors = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (child == null) {
      child = {};
    }
    for (_i = 0, _len = ancestors.length; _i < _len; _i++) {
      ancestor = ancestors[_i];
      if (ancestor) {
        for (key in ancestor) {
          value = ancestor[key];
          if (typeof child[key] === 'undefined') {
            child[key] = ancestor[key];
          }
        }
      }
    }
    return child;
  },
  log: function() {
    return console.log(arguments[0]);
  },
  alert: function() {
    return window.alert(arguments[0]);
  },
  confirm: function(message, callback) {
    if (window.confirm(message)) {
      return callback();
    }
  },
  prompt: function(message, defaultValue, callback, promptInput) {
    var closePromptModal, promptAcceptButton, promptCancelButton, promptForm, promptFormCss, promptModal, promptModalCss, property, value;
    window.pauseKeyboardListeners = true;
    promptModal = document.createElement('div');
    promptModalCss = {
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
    promptForm = document.createElement('form');
    promptFormCss = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      padding: '1em',
      transform: 'translateX(-50%) translateY(-50%)',
      backgroundColor: 'white'
    };
    for (property in promptFormCss) {
      value = promptFormCss[property];
      promptForm.style[property] = value;
    }
    promptForm.innerHTML = message;
    promptModal.appendChild(promptForm);
    if (!promptInput) {
      promptInput = document.createElement('input');
    }
    if (defaultValue !== null) {
      promptInput.value = defaultValue;
    }
    promptInput.style.display = 'block';
    promptForm.appendChild(promptInput);
    closePromptModal = function() {
      promptModal.remove();
      return window.pauseKeyboardListeners = false;
    };
    promptCancelButton = document.createElement('button');
    promptCancelButton.innerHTML = 'Cancel';
    promptCancelButton.addEventListener('click', function(event) {
      event.preventDefault();
      return closePromptModal();
    });
    promptForm.appendChild(promptCancelButton);
    promptAcceptButton = document.createElement('input');
    promptAcceptButton.type = 'submit';
    promptAcceptButton.value = 'Accept';
    promptForm.addEventListener('submit', function(event) {
      event.preventDefault();
      closePromptModal();
      return callback(promptInput.value);
    });
    promptForm.appendChild(promptAcceptButton);
    document.body.appendChild(promptModal);
    return promptInput.focus();
  },
  select: function(message, options, defaultValue, callback) {
    var index, option, optionElement, promptCallback, selectInput, _i, _len;
    selectInput = document.createElement('select');
    for (index = _i = 0, _len = options.length; _i < _len; index = ++_i) {
      option = options[index];
      optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.innerHTML = option;
      selectInput.appendChild(optionElement);
      if (option === defaultValue) {
        selectInput.selectedIndex = index;
      }
    }
    promptCallback = function(selected) {
      var _j, _len1;
      if (selected && options.indexOf(selected === -1)) {
        for (_j = 0, _len1 = options.length; _j < _len1; _j++) {
          option = options[_j];
          if (RegExp(selected).test(option)) {
            selected = option;
          }
        }
      }
      if (!selected || options.indexOf(selected) === -1) {
        selected = false;
      }
      return callback(selected);
    };
    return this.prompt(message, null, promptCallback, selectInput);
  },
  promptForFile: function(message, callback) {
    var fileInput, loadFile;
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    loadFile = function() {
      var file, fileReader, _i, _len, _ref, _results;
      _ref = fileInput.files;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        fileReader = new FileReader();
        fileReader.addEventListener('load', function(event) {
          return callback(event.target.result);
        });
        _results.push(fileReader.readAsText(file));
      }
      return _results;
    };
    return this.prompt(message, null, loadFile, fileInput);
  },
  keyCodeNames: {
    8: 'Backspace',
    16: 'Shift',
    17: 'Ctrl',
    18: 'Alt',
    32: 'Space',
    33: 'PgUp',
    34: 'PgDn',
    35: 'End',
    36: 'Home',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    40: 'Down',
    46: 'Delete',
    91: 'Super',
    188: ',',
    190: '.',
    186: ';',
    187: '=',
    189: '-',
    191: '/',
    219: '[',
    221: ']',
    222: '\''
  },
  shiftKeyCodeNames: {
    48: ')',
    49: '!',
    50: '@',
    51: '#',
    52: '$',
    53: '%',
    54: '^',
    55: '&',
    56: '*',
    57: '(',
    79: ')',
    187: '+',
    189: '_',
    191: '?'
  },
  getKeyCodeName: function(keyCode, shiftKey) {
    var name;
    if (shiftKey && this.shiftKeyCodeNames.hasOwnProperty(keyCode)) {
      name = this.shiftKeyCodeNames[keyCode];
    } else if (this.keyCodeNames.hasOwnProperty(keyCode)) {
      name = this.keyCodeNames[keyCode];
    } else {
      name = String.fromCharCode(keyCode);
    }
    return name;
  },
  describeKeyCombo: function(event) {
    var combo, keyName;
    combo = [];
    if (event.metaey) {
      combo.push('Super');
    }
    if (event.ctrlKey) {
      combo.push('Ctrl');
    }
    if (event.altKey) {
      combo.push('Alt');
    }
    if (!this.shiftKeyCodeNames.hasOwnProperty(event.keyCode)) {
      if (event.shiftKey) {
        combo.push('Shift');
      }
    }
    keyName = this.getKeyCodeName(event.keyCode, event.shiftKey);
    if (!/^Ctrl|Alt|Shift$/.test(keyName)) {
      combo.push(keyName);
    }
    return combo.join('+');
  },
  averageTouches: function(event) {
    var point, sumPoints, _i, _len, _ref;
    sumPoints = {
      x: 0,
      y: 0
    };
    _ref = event.targetTouches;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      point = _ref[_i];
      sumPoints.x += point.clientX;
      sumPoints.y += point.clientY;
    }
    sumPoints.x /= event.targetTouches.length;
    sumPoints.y /= event.targetTouches.length;
    return sumPoints;
  },
  recordGesture: function(event) {
    if (!this.currentGesture) {
      this.currentGesture = {
        touches: event.targetTouches.length,
        origin: Utils.averageTouches(event)
      };
    }
    return this.currentGesture.last = Utils.averageTouches(event);
  },
  clearGesture: function(event) {
    return this.currentGesture = null;
  },
  describePosition: function(coordinates, bounds) {
    var descriptors, minRatio, positionDescription, positionDescriptors, positionRatio;
    positionDescriptors = {
      '0.00': {
        x: 'left',
        y: 'top'
      },
      '0.33': {
        x: 'center',
        y: 'middle'
      },
      '0.67': {
        x: 'right',
        y: 'bottom'
      }
    };
    positionRatio = {
      x: (coordinates.x - bounds.x) / bounds.width,
      y: (coordinates.y - bounds.y) / bounds.height
    };
    positionDescription = {};
    for (minRatio in positionDescriptors) {
      descriptors = positionDescriptors[minRatio];
      if (positionRatio.x > Number(minRatio)) {
        positionDescription.x = descriptors.x;
      }
      if (positionRatio.y > Number(minRatio)) {
        positionDescription.y = descriptors.y;
      }
    }
    return positionDescription.x + ' ' + positionDescription.y;
  },
  describeMotion: function(startCoordinates, endCoordinates) {
    var delta, description, motionThreshold;
    motionThreshold = 10;
    delta = {
      x: endCoordinates.x - startCoordinates.x,
      y: endCoordinates.y - startCoordinates.y
    };
    delta.absX = Math.abs(delta.x);
    delta.absY = Math.abs(delta.y);
    if (delta.absX + delta.absY < motionThreshold) {
      description = 'still';
    } else if (delta.absX > delta.absY) {
      description = delta.x > 0 ? 'right' : 'left';
    } else {
      description = delta.y > 0 ? 'down' : 'up';
    }
    return description;
  },
  describeGesture: function(gestureBounds, extra) {
    var description;
    if (extra == null) {
      extra = '';
    }
    description = this.currentGesture.touches;
    description += ' ' + Utils.describeMotion(this.currentGesture.origin, this.currentGesture.last);
    description += ' from ' + Utils.describePosition(this.currentGesture.origin, gestureBounds);
    if (extra) {
      description += " " + extra;
    }
    return description;
  },
  getDecimal: function(value, precision, type) {
    var factor, output, parts;
    if (type == null) {
      type = Number;
    }
    factor = Math.pow(10, precision);
    output = Math.round(value * factor) / factor;
    if (type === String) {
      parts = output.toString().split('.');
      if (parts.length === 1) {
        parts.push('0');
      }
      while (parts[1].length < precision) {
        parts[1] += '0';
      }
      output = parts.join('.');
    }
    return output;
  },
  encodeBase64: function(input) {
    return btoa(input);
  },
  decodeBase64: function(input) {
    return atob(input);
  },
  downloadFromUrl: function(url, filename) {
    var link;
    link = document.createElement('a');
    link.download = filename;
    link.href = url;
    return link.click();
  }
};

Utils.keyCodes = {};

for (code = _i = 0; _i < 256; code = ++_i) {
  name = Utils.keyCodeNames[code] || String.fromCharCode(code);
  if (name) {
    Utils.keyCodes[name] = code;
    if ((_base = Utils.keyCodeNames)[code] == null) {
      _base[code] = name;
    }
  }
}

Utils.shiftKeyCodes = {};

_ref = Utils.shiftKeyCodeNames;
for (name in _ref) {
  code = _ref[name];
  Utils.shiftKeyCodes[code] = name;
}
