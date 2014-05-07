
/*
global: document, window
 */
var Utils, code, name, _ref, _ref1;

Utils = {
  toggleClass: function(element, className, presence) {
    var classIndex, classes;
    if (presence == null) {
      presence = null;
    }
    classes = element.className.split(/\s+/);
    classIndex = classes.indexOf(className);
    if (classIndex > -1 && presence !== true) {
      classes.splice(classIndex, 1);
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
    8: 'BACKSPACE',
    32: 'SPACE',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    78: 'n',
    79: 'o',
    83: 's',
    187: '=',
    189: '-'
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
    189: '_'
  }
};

Utils.keyCodes = {};

_ref = Utils.keyCodeNames;
for (name in _ref) {
  code = _ref[name];
  Utils.keyCodes[code] = name;
}

Utils.shiftKeyCodes = {};

_ref1 = Utils.shiftKeyCodeNames;
for (name in _ref1) {
  code = _ref1[name];
  Utils.shiftKeyCodes[code] = name;
}
