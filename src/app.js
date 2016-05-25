
/*
global: window, document
 */
window.addEventListener('load', function() {
  var penciltest;
  penciltest = new Penciltest({
    container: '#penciltest'
  });
  window.p = penciltest;
  return window.addEventListener('resize', function() {
    return penciltest.resize();
  });
});
