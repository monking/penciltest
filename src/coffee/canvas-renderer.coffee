###
global: document, window
###

class CanvasRenderer extends RendererInterface

  constructor: (options) ->
    super options
    @width = @container.offsetWidth
    @height = @container.offsetHeight
    @field = document.createElement 'canvas'
    @field.setAttribute 'width', @width
    @field.setAttribute 'height', @height
    @context = @field.getContext '2d'
    @updateStrokeStyle()
    @container.appendChild @field

  lineTo: (x, y) ->
    super x, y
    @context.lineTo x, y

  updateStrokeStyle: ->
    if @context
      @context.strokeStyle = 'rgba(' +
        @currentLineOptions.color[0] + ',' +
        @currentLineOptions.color[1] + ',' +
        @currentLineOptions.color[2] + ',' +
        @currentLineOptions.opacity + ')'

  setLineOverrides: (options) ->
    super options
    @updateStrokeStyle()

  clearLineOverrides: ->
    super()
    @updateStrokeStyle()

  moveTo: (x, y) ->
    super x, y
    @context.moveTo x, y
    @drawingPath ?= @context.beginPath()

  render: ->
    @context.stroke()
    @drawingPath = null
    super()

  clear: ->
    @drawingPath = null
    @context.clearRect 0, 0, @width, @height
    super()

  destroy: ->
    @field.remove()
    super()
