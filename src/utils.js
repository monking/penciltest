
/*
global: document, window
 */
var Utils, code, name, _base, _i, _ref;

Utils = {
  toggleClass: function(element, className, presence) {
    var classIndex, classes;
    if (presence == null) {
      presence = null;
    }
    classes = element.className.split(/\s+/);
    classIndex = classes.indexOf(className);
    if (classIndex > -1) {
      if (presence !== true) {
        classes.splice(classIndex, 1);
      }
    } else if (presence !== false) {
      classes.push(className);
    }
    return element.className = classes.join(' ');
  },
  log: function() {
    return console.log(arguments[0]);
  },
  alert: function() {
    return window.alert(arguments[0]);
  },
  confirm: function() {
    return window.confirm(arguments[0]);
  },
  prompt: function() {
    return window.prompt(arguments[0], arguments[1]);
  },
  keyCodeNames: {
    8: 'Backspace',
    32: 'Space',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    40: 'Down',
    188: ',',
    190: '.',
    186: ';',
    187: '=',
    189: '-',
    191: '/',
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
    if (!/^Control|Alt|Shift$/.test(keyName)) {
      combo.push(keyName);
    }
    return combo.join('+');
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
