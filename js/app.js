
/*
global: window, document
 */
window.addEventListener('load', function() {
  var penciltest;
  penciltest = new PencilTest({
    container: '#penciltest'
  });
  return window.addEventListener('resize', function() {
    return penciltest.resize();
  });
});
