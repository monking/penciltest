
/*
global: window, document
 */
window.addEventListener('load', function() {
  window.penciltest = new PencilTest({
    container: document.getElementById('penciltest')
  });
  return Utils.log(window.penciltest);
});
