###
global: Penciltest
###

module.exports = PenciltestVideoEncoder

class PenciltestVideoEncoder

  constructor: (sceneFilePath) ->
    @penciltest = new Penciltest
    scene = require sceneFilePath
    @penciltest.setScene scene
