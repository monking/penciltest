# TODO: bump, get on this. it's the next step

###
global: document, window
###

class CanvasRenderer extends RendererInterface

  constructor: (options) ->
    @field = document.createElement 'canvas'
    @context = @field.getContext '2d',
      alpha: false

    super options

    @container.appendChild @field

    @applyStrokeStyle()

  lineTo: (x, y) ->
    super x, y
    @context.lineTo x, y

  rect: (x, y, width, height, backgroundColor, strokeColor) ->
    super x, y, width, height, backgroundColor
    @context.beginPath()
    @context.rect x, y, width, height
    if backgroundColor
      @context.fillStyle = backgroundColor
      @context.fill()
    if strokeColor
      @context.strokeStyle = strokeColor
      @context.stroke()

    @applyStrokeStyle()

  applyStrokeStyle: ->
    if @context
      @context.fillStyle = null
      @context.lineWidth = @currentLineOptions.weight
      @context.lineJoin = @currentLineOptions.corner
      if Array.isArray @currentLineOptions.color
        @context.strokeStyle = 'rgba(' +
          @currentLineOptions.color[0] + ',' +
          @currentLineOptions.color[1] + ',' +
          @currentLineOptions.color[2] + ',' +
          @currentLineOptions.opacity + ')'
      else
        @context.strokeStyle = @currentLineOptions.color

  composeOptions: (options) ->
    super options
    @applyStrokeStyle()

  moveTo: (x, y) ->
    super x, y
    @context.moveTo x, y
    @drawingPath = @context.beginPath()

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
