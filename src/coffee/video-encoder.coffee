###
global: Penciltest
###

module.exports = PenciltestVideoEncoder

class PenciltestVideoEncoder

  constructor: (filmFilePath) ->
    @penciltest = new Penciltest
    film = require filmFilePath
    @penciltest.setFilm film
