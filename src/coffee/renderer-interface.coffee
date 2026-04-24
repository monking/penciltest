###
global: document
###

class RendererInterface

  options:
    container: 'body'
    lineColor: 'black'
    lineWeight: 1
    lineOpacity: 1
    lineCorner: 'round'
    width: 1920
    height: 1080

  constructor: (options) ->
    @options = Utils.inherit(
      options
      @options
    )

    if typeof @options.container is 'string'
      @container = document.querySelector @options.container
    else
      @container = @options.container

    @composeOptions()

    @resize @options.width, @options.height

  resize: (width, height) ->
    @width = width
    @height = height

  moveTo: (x, y) ->
    null

  lineTo: (x, y) ->
    null

  rect: (x, y, width, height, backgroundColor, strokeColor) ->
    null

  composeOptions: (overrides, persist = null) ->
    composedOptions = Object.assign {}, @options

    Object.assign @overrides, overrides if persist == true

    Object.assign composedOptions, @overrides if persist != false

    Object.assign composedOptions, overrides if persist != true

    @currentLineOptions =
      color: composedOptions.lineColor
      weight: composedOptions.lineWeight
      corner: composedOptions.lineCorner
      opacity: composedOptions.lineOpacity

  path: (path) ->
    for segment, i in path
      if i is 0
        @moveTo segment[0], segment[1]
      else
        @lineTo segment[0], segment[1]

    @render()

  render: ->
    null

  clear: ->
    null

  destroy: ->
    null
