// // referencing <https://stackoverflow.com/a/59941251>
//addEventListener<K extends keyof WindowEventMap>(
//  type: K, 
//  listener: (this: Window, ev: WindowEventMap[K]) => any, 
//  options?: boolean | AddEventListenerOptions
//): void;

// globalThis.document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
globalThis.addEventListener('load', function() {

  const penciltest = new Penciltest({
    container: '#penciltest'
  });

  globalThis.p = penciltest;

  return globalThis.addEventListener('resize', () => penciltest.resize());
});
