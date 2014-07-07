###
global: window, document
###

# document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
window.addEventListener 'load', ->

  penciltest = new PencilTest
    container: '#penciltest'

  window.addEventListener 'resize', ->
    penciltest.resize()
