
/*
global: window, document
 */
window.onload = function() {
  window.penciltest = new PencilTest({
    container: document.getElementById('penciltest')
  });
  return console.log(window.penciltest);
};
