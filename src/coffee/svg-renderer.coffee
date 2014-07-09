###
global: document, window
###

class SVGRenderer extends RendererInterface

  constructor: (options) ->
    super options

    @field = new Raphael @container

    @init()

  lineTo: (x, y) ->
    super x, y
    @drawingPath += "L#{x} #{y}"

  moveTo: (x, y) ->
    super x, y
    @drawingPath ?= ''
    @drawingPath = "M#{x} #{y}"

  render: ->
    path = @field.path @drawingPath if @drawingPath
    if @currentLineOptions.color.join ' ' isnt '0 0 0' or @currentLineOptions.opacity isnt 1
      pathStyle = 'rgba(' +
        @currentLineOptions.color[0] + ',' +
        @currentLineOptions.color[1] + ',' +
        @currentLineOptions.color[2] + ',' +
        @currentLineOptions.opacity + ')'
      path[0].style.stroke = pathStyle
    super()

  clear: ->
    @field.clear()
    super()

  destroy: ->
    @field.remove()
    super()

  resize: (width, height) ->
    @field.setSize width, height
    super width, height
