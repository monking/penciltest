
/*
global: Penciltest
 */
var PenciltestVideoEncoder;

module.exports = PenciltestVideoEncoder;

PenciltestVideoEncoder = (function() {
  function PenciltestVideoEncoder(sceneFilePath) {
    var scene;
    this.penciltest = new Penciltest;
    scene = require(sceneFilePath);
    this.penciltest.setScene(scene);
  }

  return PenciltestVideoEncoder;

})();
