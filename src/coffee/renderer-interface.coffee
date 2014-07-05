###
global: document, window
###

class RendererInterface

  options:
    container: 'body'
    lineColor: [0, 0, 0]
    lineWeight: 1
    lineOpacity: 1

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

  moveTo: (x, y) ->
    null

  lineTo: (x, y) ->
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
