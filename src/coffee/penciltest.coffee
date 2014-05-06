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

    @frames = []
    @lift()

    @buildContainer()

    @addInputHandlers()
    @addMenuHandlers()
    @addKeyboardHandlers()

    @newFrame()

    window.penciltest = @

  buildContainer: ->
    markup = '<div class="field"></div>' +
    '<ul class="menu">' +
      '<li rel="tablet-mode">Tablet Mode</li>' +
    '</ul>'

    @container.innerHTML = markup

    @fieldElement = @container.querySelector '.field'
    @field = new Raphael @fieldElement

  addInputHandlers: ->
    self = @

    mouseDownHandler = (event) ->
      event.preventDefault()
      if event.type is 'touchstart' and event.touches.length > 1
        mouseUpHandler()
        if event.touches.length is 3
          self.toggleMenu()
      else
        if event.button is 2 then return true # allow context menu
        mouseMoveHandler event
        document.body.addEventListener 'mousemove', mouseMoveHandler
        document.body.addEventListener 'touchmove', mouseMoveHandler
        document.body.addEventListener 'mouseup', mouseUpHandler
        document.body.addEventListener 'touchend', mouseUpHandler

    mouseMoveHandler = (event) ->
      event.preventDefault()

      if event.type is 'touchmove'
        if event.touches.length > 1 then return true # allow pan/zoom
        eventLocation = event.touches[0]
      else
        eventLocation = event

      self.mark(
        eventLocation.pageX - self.fieldElement.offsetLeft,
        eventLocation.pageY - self.fieldElement.offsetTop
      )

    mouseUpHandler = (event) ->
      if event.button is 2 
        return true # allow context menu
      else
        document.body.removeEventListener 'mousemove', mouseMoveHandler
        document.body.removeEventListener 'touchmove', mouseMoveHandler
        document.body.removeEventListener 'mouseup', mouseUpHandler
        document.body.removeEventListener 'touchend', mouseUpHandler
        self.lift()

    contextMenuHandler = (event) ->
      event.preventDefault()
      self.toggleMenu()

    @fieldElement.addEventListener 'mousedown', mouseDownHandler
    @fieldElement.addEventListener 'touchstart', mouseDownHandler
    @fieldElement.addEventListener 'contextmenu', contextMenuHandler

  addMenuHandlers: ->
    @menuElement = @container.querySelector '.menu'
    @menuItems = @menuElement.getElementsByTagName 'li'

  addKeyboardHandlers: ->
    self = @
    document.body.addEventListener 'keydown', (event) ->
      switch event.keyCode
        when 37 then self.goToFrame self.currentFrameIndex - 1
        when 39 then self.goToFrame self.currentFrameIndex + 1
      console.log event.keyCode

  newFrame: (prepend = false) ->
    newFrame =
      hold: 1
      strokes: []

    if prepend isnt false
      @currentFrameIndex = 0
      @frames.unshift newFrame
    else
      @currentFrameIndex = @frames.length
      @frames.push newFrame

    @currentStrokeIndex = null

    @drawCurrentFrame()

  getCurrentFrame: ->
    @frames[@currentFrameIndex]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex]

  mark: (x,y) ->
    if @currentStrokeIndex is null
      @currentStrokeIndex = @getCurrentFrame().strokes.length
      @getCurrentFrame().strokes.push ["M#{x} #{y}"]
    else
      @getCurrentStroke().push "L#{x} #{y}"
      @drawCurrentFrame()
      # @field.path
      #   @getCurrentFrame().strokes[@currentStrokeIndex - 1].replace('L', 'M'),
      #   @getCurrentFrame().strokes[@currentStrokeIndex]

  toggleMenu: ->
    Utils.toggleClass @container, 'menu-visible'

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex) ->
    if (newIndex < 0)
      @newFrame 'prepend'
    else if newIndex >= @frames.length
      @newFrame()
    else
      @currentFrameIndex = newIndex

    @drawCurrentFrame()

  drawCurrentFrame: ->
    @field.clear()
    @field.path stroke.join '' for stroke in @getCurrentFrame().strokes

  lift: ->
    @currentStrokeIndex = null
