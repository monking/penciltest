
/*
global: Penciltest
 */
var PenciltestVideoEncoder;

module.exports = PenciltestVideoEncoder;

PenciltestVideoEncoder = (function() {
  function PenciltestVideoEncoder(filmFilePath) {
    var film;
    this.penciltest = new Penciltest;
    film = require(filmFilePath);
    this.penciltest.setFilm(film);
  }

  return PenciltestVideoEncoder;

})();
