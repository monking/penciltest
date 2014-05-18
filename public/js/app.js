
/*
global: window, document
 */
window.addEventListener('load', function() {
  window.penciltest = new PencilTest({
    container: '#penciltest'
  });
  return Utils.log(window.penciltest);
});
