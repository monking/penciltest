###
global: window, document
###

# document.addEventListener 'DOMContentLoaded', -> # the SVG is not the correct size yet
window.addEventListener 'load', ->

  window.penciltest = new PencilTest
    container: document.getElementById 'penciltest'

  Utils.log window.penciltest
