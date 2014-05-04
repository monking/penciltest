###
global: document, window
###

class PencilTest
  constructor: (@options) ->
    for key, value in {
      container: document.body
      containerSelector: 'body'
    }
      @options[key] = value if typeof @options[key] is 'undefined'

    @container = @options.container or document.querySelector @options.containerSelector
    @container.className = 'penciltest-app'

    @buildContainer()

  buildContainer: ->
    markup = '<svg class="field"></svg>'

    @container.innerHTML = markup

    @field = @container.querySelector '.field'
