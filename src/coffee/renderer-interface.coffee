###
global: document
###

class RendererInterface

  options:
    container: 'body'
    lineColor: [0, 0, 0]
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

    @clearLineOverrides()

    @resize @options.width, @options.height

  resize: (width, height) ->
    @width = width
    @height = height

  moveTo: (x, y) ->
    null

  lineTo: (x, y) ->
    null

  rect: (x, y, width, height, backgroundColor) ->
    null

  setLineOverrides: ( options ) ->
    @overrides = options
    @currentLineOptions = Utils.inherit(
      options
      @overrides
      @defaultLineOptions()
    )

  defaultLineOptions: ->
    color: @options.lineColor
    weight: @options.lineWeight
    corner: @options.lineCorner
    opacity: @options.lineOpacity

  clearLineOverrides: ->
    @overrides = {}
    @currentLineOptions = @defaultLineOptions()

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
