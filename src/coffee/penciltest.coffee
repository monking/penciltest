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

    @strokes = []
    @lift()
    @buildContainer()
    window.penciltest = @

  buildContainer: ->
    self = @
    markup = '<div class="field"></div>'

    @container.innerHTML = markup

    @fieldElement = @container.querySelector '.field'
    @field = new Raphael @fieldElement

    mouseDownHandler = (event) ->
      self.fieldElement.addEventListener 'mousemove', mouseMoveHandler
      self.fieldElement.addEventListener 'touchmove', mouseMoveHandler

    mouseMoveHandler = (event) ->
      if event.type is 'touchmove'
        x = event.touches[0].pageX - self.fieldElement.offsetLeft
        y = event.touches[0].pageY - self.fieldElement.offsetTop
      else
        self.mark event.offsetX, event.offsetY

      self.mark x, y
      event.preventDefault()
      false

    mouseUpHandler = (event) ->
      self.fieldElement.removeEventListener 'mousemove', mouseMoveHandler
      self.fieldElement.removeEventListener 'touchmove', mouseMoveHandler
      self.lift()

    @fieldElement.addEventListener 'mousedown', mouseDownHandler
    @fieldElement.addEventListener 'touchstart', mouseDownHandler
    @fieldElement.addEventListener 'mouseup', mouseUpHandler
    @fieldElement.addEventListener 'touchend', mouseUpHandler

  getCurrentStroke: ->
    @currentStrokeIndex isnt null and @strokes[@currentStrokeIndex]

  mark: (x,y) ->
    if @currentStrokeIndex is null
      @currentStrokeIndex = @strokes.length
      @strokes.push "M#{x} #{y}"
    else
      @strokes[@currentStrokeIndex] += "L#{x} #{y}"

    @display()

  display: ->
    @field.clear()
    @field.path stroke for stroke in @strokes

  lift: ->
    @currentStrokeIndex = null
