###
global: document, window
###

class PencilTest

  optionListeners:
    hideCursor:
      label: "Hide Cursor"
      listener: ->
        @options.hideCursor = not @options.hideCursor
      action: ->
        Utils.toggleClass @container, 'hide-cursor', @options.hideCursor
    onionSkin:
      label: "Onion Skin"
      listener: -> @options.onionSkin = not @options.onionSkin
      action: -> console.log "onion skinning: #{@options.onionSkin}"
    frameRate:
      label: "Frame Rate"
      listener: -> null
      action: -> console.log "frame rate: #{@options.frameRate}"

  menuOptions: [
    'hideCursor'
    'onionSkin'
    'frameRate'
  ]

  constructor: (@options) ->
    for key, value of {
      container: document.body
      containerSelector: 'body'
      hideCursor: false
      frameRate: 12
      onionSkin: false
    }
      @options[key] = value if typeof @options[key] is 'undefined'

    @container = @options.container or document.querySelector @options.containerSelector
    @container.className = 'penciltest-app'

    @frames = []
    @lift()

    @buildContainer()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()

    @optionListeners[optionName]?.action.call @ for optionName of @options

    @newFrame()

    window.penciltest = @

  buildContainer: ->
    markup = '<div class="field"></div>' +
    '<ul class="menu">'
    markup += "<li rel=\"#{key}\">#{@optionListeners[key].label}</li>" for key in @menuOptions
    markup += '</ul>'

    @container.innerHTML = markup

    @fieldElement = @container.querySelector '.field'
    @field = new Raphael @fieldElement

  addInputListeners: ->
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

    mouseDownListener = (event) ->
      event.preventDefault()
      if event.type is 'touchstart' and event.touches.length > 1
        mouseUpListener()
        if event.touches.length is 3
          self.toggleMenu()
      else
        if event.button is 2 then return true # allow context menu
        markFromEvent event
        document.body.addEventListener 'mousemove', mouseMoveListener
        document.body.addEventListener 'touchmove', mouseMoveListener
        document.body.addEventListener 'mouseup', mouseUpListener
        document.body.addEventListener 'touchend', mouseUpListener

    mouseMoveListener = (event) ->
      event.preventDefault()
      markFromEvent event

    mouseUpListener = (event) ->
      if event.button is 2 
        return true # allow context menu
      else
        document.body.removeEventListener 'mousemove', mouseMoveListener
        document.body.removeEventListener 'touchmove', mouseMoveListener
        document.body.removeEventListener 'mouseup', mouseUpListener
        document.body.removeEventListener 'touchend', mouseUpListener
        self.lift()

    contextMenuListener = (event) ->
      event.preventDefault()
      self.toggleMenu()

    @fieldElement.addEventListener 'mousedown', mouseDownListener
    @fieldElement.addEventListener 'touchstart', mouseDownListener
    @fieldElement.addEventListener 'contextmenu', contextMenuListener

  updateMenuOption: (optionElement) ->
    optionName = optionElement.attributes.rel.value
    if typeof @options[optionName] is 'boolean'
      Utils.toggleClass optionElement, 'enabled', @options[optionName]

  addMenuListeners: ->
    self = @
    @menuElement = @container.querySelector '.menu'
    @menuItems = @menuElement.getElementsByTagName 'li'

    menuOptionListener = (event) ->
      optionName = this.attributes.rel.value
      self.optionListeners[optionName].listener.call self
      self.optionListeners[optionName].action.call self
      self.updateMenuOption this

    for option in @menuItems
      option.addEventListener 'click', menuOptionListener
      @updateMenuOption option

  addKeyboardListeners: ->
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
    stepListener = ->
      self.goToFrame self.currentFrameIndex + 1, 'no new frames'

    @stop()
    @playInterval = setInterval stepListener, 1000 / @options.frameRate
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
