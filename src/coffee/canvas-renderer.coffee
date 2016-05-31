# TODO: bump, get on this. it's the next step

###
global: document, window
###

class CanvasRenderer extends RendererInterface

  constructor: (options) ->
    @field = document.createElement 'canvas'
    @context = @field.getContext '2d'

    super options

    @container.appendChild @field

    @updateStrokeStyle()

  lineTo: (x, y) ->
    super x, y
    @context.lineTo x, y

  rect: (x, y, width, height, backgroundColor) ->
    super x, y, width, height, backgroundColor
    @context.fillStyle = backgroundColor
    @context.rect x, y, width, height
    @context.fill()
    @context.fillStyle = null

  updateStrokeStyle: ->
    if @context
      @context.lineWidth = @currentLineOptions.lineWeight
      @context.lineJoin = @currentLineOptions.lineCorner
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
    super()
    if @context
      @context.stroke()
      @drawingPath = null

  clear: ->
    @drawingPath = null
    @context.clearRect 0, 0, @width, @height
    super()

  destroy: ->
    @field.remove()
    super()

  resize: (width, height) ->
    @field.setAttribute 'width', width
    @field.setAttribute 'height', height
    super width, height
