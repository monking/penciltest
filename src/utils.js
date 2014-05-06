
/*
global: document, window
 */
var Utils;

Utils = {
  toggleClass: function(element, className) {
    var classIndex, classes;
    classes = element.className.split(/\s+/);
    classIndex = classes.indexOf(className);
    if (classIndex > -1) {
      classes.splice(classIndex, 1);
    } else {
      classes.push(className);
    }
    return element.className = classes.join(' ');
  }
};
