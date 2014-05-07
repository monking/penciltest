###
global: document, window
###

class PencilTest

  constructor: (@options) ->
    for key, value of {
      container: document.body
      containerSelector: 'body'
      hideCursor: false
      loop: true
      frameRate: 12
      onionSkin: true
      onionSkinOpacity: 0.5
    }
      @options[key] = value if typeof @options[key] is 'undefined'

    @container = @options.container or document.querySelector @options.containerSelector
    @container.className = 'penciltest-app'

    @buildContainer()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()

    @optionListeners[optionName]?.action.call @ for optionName of @options

    @newFilm()

    window.penciltest = @

  optionListeners:
    undo:
      label: "Undo"
      action: -> @undo()
    hideCursor:
      label: "Hide Cursor"
      listener: -> @options.hideCursor = not @options.hideCursor
      action: -> Utils.toggleClass @container, 'hide-cursor', @options.hideCursor
    onionSkin:
      label: "Onion Skin"
      listener: ->
        @options.onionSkin = not @options.onionSkin
        @drawCurrentFrame()
      action: -> Utils.log "onionSkin--#{@options.onionSkin}"
    frameRate:
      label: "Frame Rate"
      listener: -> null
      action: -> Utils.log "frameRate--#{@options.frameRate}"
    loop:
      label: "Loop"
      listener: -> @options.loop = not @options.loop
      action: -> Utils.log "loop--#{@options.loop}"
    saveFilm:
      label: "Save"
      listener: -> @saveFilm()
    loadFilm:
      label: "Load"
      listener: -> @loadFilm()
    newFilm:
      label: "New"
      listener: -> @newFilm() if Utils.confirm "This will BURN your current animation."

  menuOptions: [
    'undo'
    'hideCursor'
    'onionSkin'
    'frameRate'
    'loop'
    'saveFilm'
    'loadFilm'
    'newFilm'
  ]

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

    getEventPageXY = (event) ->
      if /^touch/.test event.type
        eventLocation = event.touches[0]
      else
        eventLocation = event

      {x: eventLocation.pageX, y: eventLocation.pageY}

    markFromEvent = (event) ->
      coords = getEventPageXY event
      self.mark(
        coords.x - self.fieldElement.offsetLeft,
        coords.y - self.fieldElement.offsetTop
      )

    mouseDownListener = (event) ->
      event.preventDefault()
      if event.type is 'touchstart' and event.touches.length > 1
        mouseUpListener()
        if event.touches.length is 3
          self.showMenu()
        else
          self.hideMenu()
      else
        if event.button is 2
          return true # allow context menu
        else
          self.hideMenu()

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
      self.showMenu getEventPageXY event

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
      self.optionListeners[optionName].listener?.call self
      self.optionListeners[optionName].action?.call self
      self.updateMenuOption this
      self.hideMenu()

    for option in @menuItems
      option.addEventListener 'mouseup', menuOptionListener
      option.addEventListener 'touchend', menuOptionListener
      @updateMenuOption option

  addKeyboardListeners: ->
    self = @

    keyboardHandlers =
      keydown:
        32: -> @togglePlay() # SPACE
        37: -> @prevFrame 'stop' # LEFT
        38: -> @lastFrame 'stop' # UP
        39: -> @nextFrame 'stop' # RIGHT
        40: -> @firstFrame 'stop' # DOWN
      keyup:
        8: -> @dropFrame() # BACKSPACE
        48: -> # 0
        49: -> # 1
        50: -> # 2
        51: -> # 3
        52: -> # 4
        53: -> # 5
        54: -> # 6
        55: -> # 7
        56: -> # 8
        57: -> # 9
        189: -> @getCurrentFrame().hold++ # -
        187: -> @getCurrentFrame().hold-- # =

    keyboardListener = (event) ->
      if keyboardHandlers[event.type]? and  keyboardHandlers[event.type][event.keyCode]?
        event.preventDefault()
        keyboardHandlers[event.type][event.keyCode].apply self, [event]

      Utils.log "#{event.type}-#{event.keyCode}" if event.keyCode isnt 0

    document.body.addEventListener 'keydown', keyboardListener
    document.body.addEventListener 'keyup', keyboardListener

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

  showMenu: (coords = {x: 10, y: 10}) ->
    Utils.toggleClass @container, 'menu-visible', true
    coords.x = Math.min document.body.offsetWidth - @menuElement.offsetWidth, coords.x
    coords.y = Math.min document.body.offsetHeight - @menuElement.offsetHeight, coords.y
    @menuElement.style.left = "#{coords.x}px"
    @menuElement.style.top = "#{coords.y}px"

  hideMenu: ->
    Utils.toggleClass @container, 'menu-visible', false

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex, stop = false) ->

    if newIndex < 0
      @newFrame 'prepend'
    else if newIndex >= @frames.length
      @newFrame()
    else
      @currentFrameIndex = newIndex

    @drawCurrentFrame()
    if stop isnt false then @stop()

  play: ->
    self = @
    if @currentFrameIndex < @frames.length - 1
      @framesHeld = 0
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      if self.framesHeld >= currentFrame.hold
        self.framesHeld = 0
        if self.currentFrameIndex >= self.frames.length - 1
          if self.options.loop
            self.goToFrame 0
          else
            self.stop()
        else
          self.goToFrame self.currentFrameIndex + 1

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
    if @options.onionSkin
      if @currentFrameIndex > 0
        @drawFrame @currentFrameIndex - 1, "rgba(0,0,255,#{@options.onionSkinOpacity})"
      if @currentFrameIndex < @frames.length - 1
        @drawFrame @currentFrameIndex + 1, "rgba(255,0,0,#{@options.onionSkinOpacity / 2})"
    @drawFrame @currentFrameIndex

  drawFrame: (frameIndex, color = null) ->
    for stroke in @frames[frameIndex].strokes
      path = @field.path stroke.join ''
      path[0].style.stroke = color if color

  lift: ->
    @currentStrokeIndex = null

  nextFrame: (stop = false) ->
    @goToFrame @currentFrameIndex + 1
    @stop() if stop

  prevFrame: (stop = false) ->
    @goToFrame @currentFrameIndex - 1
    @stop() if stop

  firstFrame: (stop = false) ->
    @goToFrame 0
    @stop() if stop

  lastFrame: (stop = false) ->
    @goToFrame @frames.length - 1
    @stop() if stop

  dropFrame: ->
    @frames.splice @currentFrameIndex, 1
    if @currentFrameIndex >= @frames.length
      @currentFrameIndex--
    @drawCurrentFrame()

  undo: ->
    @getCurrentFrame().strokes.pop()

  getSavedFilms: ->
    films = {}
    filmData = window.localStorage.getItem 'films'
    if filmData
      try
        films = JSON.parse filmData
      catch error
        Utils.log error

    films

  newFilm: ->
    @frames = []
    @newFrame()

  saveFilm: ->
    films = @getSavedFilms()
    name = window.prompt "what will you name your film?"
    if not films[name]? or Utils.confirm "Overwrite existing film \"#{name}\"?"
      films[name] = @frames
      window.localStorage.setItem 'films', JSON.stringify films

  loadFilm: ->
    films = @getSavedFilms()
    filmNames = []
    filmNames.push name for name, film of films
    if filmNames.length
      loadFilmName = window.prompt "Choose a film to load:\n\n#{filmNames.join '\n'}"
      if films[loadFilmName]
        @frames = films[loadFilmName]
        @goToFrame 0
    else
      Utils.alert "You don't have any saved films yet."
