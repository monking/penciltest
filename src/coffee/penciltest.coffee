###
global: document, window
###

class PencilTest
  constructor: (@options) ->
    for key, value of {
      container: document.body
      containerSelector: 'body'
      frameRate: 12
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

    markFromEvent = (event) ->
      if /^touch/.test event.type
        if event.touches.length > 1 then return true # allow pan/zoom
        eventLocation = event.touches[0]
      else
        eventLocation = event

      self.mark(
        eventLocation.pageX - self.fieldElement.offsetLeft,
        eventLocation.pageY - self.fieldElement.offsetTop
      )

    mouseDownHandler = (event) ->
      event.preventDefault()
      if event.type is 'touchstart' and event.touches.length > 1
        mouseUpHandler()
        if event.touches.length is 3
          self.toggleMenu()
      else
        if event.button is 2 then return true # allow context menu
        markFromEvent event
        document.body.addEventListener 'mousemove', mouseMoveHandler
        document.body.addEventListener 'touchmove', mouseMoveHandler
        document.body.addEventListener 'mouseup', mouseUpHandler
        document.body.addEventListener 'touchend', mouseUpHandler

    mouseMoveHandler = (event) ->
      event.preventDefault()
      markFromEvent event

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
      matchedKey = true
      switch event.keyCode
        when 37 then self.goToFrame self.currentFrameIndex - 1 # LEFT
        when 39 then self.goToFrame self.currentFrameIndex + 1 # RIGHT
        when 38 then self.goToFrame self.frames.length - 1 # UP
        when 40 then self.goToFrame 0 # DOWN
        when 32 then self.togglePlay() # SPACE
        else matchedKey = false

      window.location.hash = event.keyCode

      if matchedKey then event.preventDefault()

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

  goToFrame: (newIndex, noNewFrame = false) ->

    if newIndex < 0
      @newFrame 'prepend' if noNewFrame is false
    else if newIndex >= @frames.length
      @newFrame() if noNewFrame is false
    else
      @currentFrameIndex = newIndex

    @drawCurrentFrame()

  play: ->
    self = @
    stepHandler = ->
      self.goToFrame self.currentFrameIndex + 1, 'no new frames'

    @stop()
    @playInterval = setInterval stepHandler, 1000 / @options.frameRate
    @isPlaying = true

  stop: ->
    clearInterval @playInterval
    @isPlaying = false

  togglePlay: ->
    if @isPlaying then @stop() else @play()

  drawCurrentFrame: ->
    @field.clear()
    @field.path stroke.join '' for stroke in @getCurrentFrame().strokes

  lift: ->
    @currentStrokeIndex = null
