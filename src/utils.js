
/*
global: document, window
 */
var Utils;

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
  }
};
