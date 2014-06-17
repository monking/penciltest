
/*
global: document, window
 */
var Utils, code, name, _base, _i, _ref,
  __slice = [].slice;

Utils = {
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
  confirm: function() {
    return window.confirm(arguments[0]);
  },
  prompt: function() {
    return window.prompt(arguments[0], arguments[1]);
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

Utils.getDecimal = function(value, precision, type) {
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
};
