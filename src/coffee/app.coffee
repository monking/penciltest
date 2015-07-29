###
global: window, document
###

# document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
window.scrollTo 0, 1
window.addEventListener 'load', ->

  penciltest = new Penciltest
    container: '#penciltest'

  window.addEventListener 'resize', ->
    penciltest.resize()
