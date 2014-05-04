###
global: window, document
###

window.onload = ->

  window.penciltest = new PencilTest
    container: document.getElementById 'penciltest'

  console.log window.penciltest
