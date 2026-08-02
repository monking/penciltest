"use strict";
// globalThis.document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
globalThis.addEventListener('load', function () {
    const penciltest = new Penciltest({
        container: '#penciltest'
    });
    globalThis.p = penciltest;
    return globalThis.addEventListener('resize', () => penciltest.resize());
});
