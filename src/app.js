
/*
global: window, document
 */
window.scrollTo(0, 1);

window.addEventListener('load', function() {
  var penciltest;
  penciltest = new Penciltest({
    container: '#penciltest'
  });
  return window.addEventListener('resize', function() {
    return penciltest.resize();
  });
});
