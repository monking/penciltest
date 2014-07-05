###
global: document, window
###

class PencilTest

  modes:
    DRAWING: 'drawing'
    BUSY: 'working'
    PLAYING: 'playing'

  availableRenderers:
    canvas: CanvasRenderer
    svg: SVGRenderer

  options:
    container: 'body'
    hideCursor: false
    loop: true
    showStatus: true
    frameRate: 12
    onionSkin: true
    smoothing: 3
    onionSkinRange: 4
    renderer: 'svg'
    onionSkinOpacity: 0.5

  state:
    version: '0.0.4'
    mode: PencilTest.prototype.modes.DRAWING

  current:
    frameIndex: []
    exposureIndex: []
    exposures: 0
    exposureNumber: 0
    frameNumber: 0

  constructor: (options) ->
    @state = Utils.inherit(
      @getStoredData 'app', 'state'
      PencilTest.prototype.state
    )

    @setOptions Utils.inherit(
      @getStoredData 'app', 'options'
      options
      PencilTest.prototype.options
    )

    @container = document.querySelector @options.container
    @container.className = 'penciltest-app'

    @buildContainer()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()
    @addOtherListeners()

    @appActions[optionName]?.action?.call @ for optionName of @options

    @newFilm()

    if @state.version isnt PencilTest.prototype.state.version
      @state.version = PencilTestLegacy.update @, @state.version, PencilTest.prototype.state.version

    window.pt = @

  setOptions: (options) ->
    @options = Utils.inherit(
      options
      @options or {}
      PencilTest.prototype.state
    )

    for key, value of options
      @appActions[key].action() if key in @appActions and @appActions[key].action

  appActions:
    renderer:
      label: "Set Renderer"
      listener: ->
        name = Utils.prompt 'renderer (svg, canvas): ', @options.renderer
        if name in @availableRenderers
          @options.renderer = name
      action: ->
        if @fieldElement
          @renderer = new @availableRenderers[ @options.renderer ](
            container: @fieldElement
          )
    playPause:
      label: "Play/Pause"
      hotkey: ['Space']
      cancelComplement: true
      listener: ->
        @playDirection = 1
        @togglePlay()
    playReverse:
      label: "Play in Reverse"
      hotkey: ['Shift+Space']
      cancelComplement: true
      listener: ->
        @playDirection = -1
        @togglePlay()
    nextFrame:
      label: "Next Frame"
      hotkey: ['Right','.']
      repeat: true
      listener: ->
        @goToFrame @current.frameNumber + 1
        @stop()
        @scrubAudio() if @audioElement
    prevFrame:
      label: "Previous Frame"
      hotkey: ['Left',',']
      repeat: true
      listener: ->
        @goToFrame @current.frameNumber - 1
        @stop()
        @scrubAudio() if @audioElement
    firstFrame:
      label: "First Frame"
      hotkey: ['0','Home','PgUp']
      cancelComplement: true
      listener: ->
        @goToFrame 0
        @stop()
    lastFrame:
      label: "Last Frame"
      hotkey: ['$','End','PgDn']
      cancelComplement: true
      listener: ->
        @goToFrame @film.frames.length - 1
        @stop()
    insertFrameBefore:
      label: "Insert Frame Before"
      hotkey: ['Shift+I']
      listener: ->
        newIndex = @current.frameNumber
        @newFrame newIndex
        @goToFrame newIndex
    insertFrameAfter:
      label: "Insert Frame After"
      hotkey: ['I']
      listener: ->
        newIndex = @current.frameNumber + 1
        @newFrame newIndex
        @goToFrame newIndex
    insertSeconds:
      label: "Insert Seconds"
      hotkey: ['Alt+Shift+I']
      listener: ->
        seconds = Number Utils.prompt '# of seconds to insert: ', 1
        first = @current.frameNumber + 1
        last = @current.frameNumber + Math.floor @options.frameRate * seconds
        @newFrame newIndex for newIndex in [first..last]
        @goToFrame newIndex
    undo:
      label: "Undo"
      title: "Remove the last line drawn"
      hotkey: ['U','Alt+Z']
      repeat: true
      listener: -> @undo()
    frameRate:
      label: "Frame Rate"
      action: -> @singleFrameDuration = 1 / @options.frameRate
    redo:
      label: "Redo"
      title: "Put back a line removed by 'Undo'"
      hotkey: ['R','Alt+Shift+Z']
      repeat: true
      listener: -> @redo()
    hideCursor:
      label: "Hide Cursor"
      hotkey: ['C']
      listener: -> @options.hideCursor = not @options.hideCursor
      action: -> Utils.toggleClass @container, 'hide-cursor', @options.hideCursor
    onionSkin:
      label: "Onion Skin"
      hotkey: ['O']
      title: "show previous and next frames in red and blue"
      listener: ->
        @options.onionSkin = not @options.onionSkin
        @drawCurrentFrame()
    dropFrame:
      label: "Drop Frame"
      hotkey: ['X','Backspace']
      cancelComplement: true
      listener: -> @dropFrame()
    smoothing:
      label: "Smoothing..."
      title: "How much your lines will be smoothed as you draw"
      hotkey: ['Shift+S']
      listener: -> @options.smoothing = Number Utils.prompt('Smoothing', @options.smoothing)
      action: -> @state.smoothDrawInterval = Math.sqrt @options.smoothing
    smoothFrame:
      label: "Smooth Frame"
      title: "Draw the frame again, with current smoothing settings"
      hotkey: ['Shift+M']
      listener: -> @smoothFrame @current.frameNumber
    smoothFilm:
      label: "Smooth All Frames"
      title: "Redraw all frames in the film with the current smoothing setting"
      hotkey: ['Alt+Shift+M']
      listener: -> @smoothFilm()
    lessHold:
      label: "Shorter Frame Hold"
      hotkey: ['Down', '-']
      repeat: true
      listener: -> @setCurrentFrameHold @getCurrentFrame().hold - 1
    moreHold:
      label: "Longer Frame Hold"
      hotkey: ['Up', '+', '=']
      repeat: true
      listener: -> @setCurrentFrameHold @getCurrentFrame().hold + 1
    showStatus:
      label: "Show Status"
      title: "hide the film status bar"
      hotkey: ['S']
      listener: -> @options.showStatus = not @options.showStatus
      action: -> Utils.toggleClass @statusElement, 'hidden', not @options.showStatus
    loop:
      label: "Loop"
      hotkey: ['L']
      listener: -> @options.loop = not @options.loop
    saveFilm:
      label: "Save"
      hotkey: ['Alt+S']
      repeat: true
      listener: -> @saveFilm()
    loadFilm:
      label: "Load"
      hotkey: ['Alt+O']
      repeat: true
      listener: -> @loadFilm()
    newFilm:
      label: "New"
      hotkey: ['Alt+N']
      repeat: true
      listener: -> @newFilm() if Utils.confirm "This will BURN your current animation."
    deleteFilm:
      label: "Delete Film"
      hotkey: ['Alt+Backspace']
      listener: -> @deleteFilm()
    exportFilm:
      label: "Export"
      hotkey: ['Alt+E']
      cancelComplement: true
      listener: ->
        open = Utils.toggleClass @textElement, 'active'
        if open
          @textElement.value = JSON.stringify @film
        else
          @textElement.value = ''
    importFilm:
      label: "Import"
      hotkey: ['Alt+I']
      cancelComplement: true
      listener: ->
        open = Utils.toggleClass @textElement, 'active'
        if open
          @textElement.value = ''
        else
          importJSON = @textElement.value
          try
            @setFilm JSON.parse importJSON
          @textElement.value = ''
    importAudio:
      label: "Import Audio"
      hotkey: ['Alt+A']
      listener: ->
        audioURL = Utils.prompt 'Audio file URL: ', @state.audioURL
        if audioURL?
          @film.audio ?= {}
          @film.audio.url = audioURL
          @unsavedChanges = true
          @loadAudio audioURL
    unloadAudio:
      label: "Unload Audio"
      listener: ->
        @destroyAudio
    shiftAudioEarlier:
      label: "Shift Audio Earlier"
      hotkey: ['[']
      listener: ->
        Utils.log "Shift Audio Earlier"
        @film.audio.offset-- if @film.audio
        @updateStatus()
    shiftAudioLater:
      label: "Shift Audio Later"
      hotkey: [']']
      listener: ->
        Utils.log "Shift Audio Later"
        @film.audio.offset++ if @film.audio
        @updateStatus()
    keyboardShortcuts:
      label: "Keyboard Shortcuts"
      hotkey: ['?']
      listener: -> @keyboardShortcuts()
    reset:
      label: "Reset"
      title: "Clear settings; helpful if the app has stopped working."
      action: ->
        @state = Utils.inherit {}, PencilTest.prototype.state
        @setOptions Utils.inherit {}, PencilTest.prototype.options

  menuOptions: [
    _icons: [
      'firstFrame'
      'prevFrame'
      'playPause'
      'nextFrame'
      'lastFrame'
    ]
    Edit: [
      'undo'
      'redo'
      'insertFrameAfter'
      'insertFrameBefore'
      'insertSeconds'
      'dropFrame'
      'moreHold'
      'lessHold'
    ]
    Playback: [
      'loop'
    ]
    Tools: [
      'hideCursor'
      'onionSkin'
      'showStatus'
      'smoothing'
      'smoothFrame'
      'smoothFilm'
      'importAudio'
    ]
    Film: [
      'saveFilm'
      'loadFilm'
      'newFilm'
      'importFilm'
      'exportFilm'
    ]
    Help: [
      'keyboardShortcuts'
      'reset'
    ]
  ]

  buildContainer: ->
    markup = '<div class="field-container">' +
      '<div class="field"></div>' +
      '<div class="status"></div>' +
    '</div>' +
    '<textarea></textarea>' +
    '<ul class="menu">' +
    @menuWalker(@menuOptions) +
    '</ul>'

    @container.innerHTML = markup

    @fieldContainer = @container.querySelector '.field-container'
    @fieldElement = @container.querySelector '.field'
    @statusElement = @container.querySelector '.status'

    # FIXME: this will have already been called in the constructor. some way to
    # execute initial option actions in such an order that this doesn't need to
    # be called again?
    @appActions.renderer.action()

  menuWalker: (level) ->
    markup = ''
    for key in level
      if typeof key is 'string'
        label = @appActions[key].label
        title = @appActions[key].title
        markup += "<li rel=\"#{key}\" title=\"#{title}\"><label>#{label}</label></li>"
      else
        for groupName, group of key
          if groupName is '_icons'
            markup += "<li class=\"icons\"><ul>"
          else
            markup += "<li class=\"group collapsed\"><label>#{groupName}</label><ul>"
          markup += @menuWalker(group)
          markup += '</ul></li>'

    markup

  addInputListeners: ->
    self = @

    getEventPageXY = (event) ->
      if /^touch/.test event.type
        eventLocation = event.touches[0]
      else
        eventLocation = event

      {x: eventLocation.pageX, y: eventLocation.pageY}

    trackFromEvent = (event) ->
      pageCoords = getEventPageXY event

      self.track(
        pageCoords.x - self.fieldContainer.offsetLeft,
        pageCoords.y - self.fieldContainer.offsetTop
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

        trackFromEvent event
        document.body.addEventListener 'mousemove', mouseMoveListener
        document.body.addEventListener 'touchmove', mouseMoveListener
        document.body.addEventListener 'mouseup', mouseUpListener
        document.body.addEventListener 'touchend', mouseUpListener

    mouseMoveListener = (event) ->
      event.preventDefault()
      trackFromEvent event if self.state.mode is PencilTest.prototype.modes.DRAWING

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
      self.toggleMenu getEventPageXY event

    @fieldElement.addEventListener 'mousedown', mouseDownListener
    @fieldElement.addEventListener 'touchstart', mouseDownListener
    @fieldElement.addEventListener 'contextmenu', contextMenuListener

  updateMenuOption: (optionElement) ->
    optionName = optionElement.attributes.rel.value
    if typeof @options[optionName] is 'boolean'
      Utils.toggleClass optionElement, 'enabled', @options[optionName]

  doAppAction: (optionName) ->
    @appActions[optionName].listener?.call @
    @appActions[optionName].action?.call @

  addMenuListeners: ->
    self = @
    @menuElement = @container.querySelector '.menu'
    @menuItems = @menuElement.querySelectorAll 'LI'

    menuOptionListener = (event) ->
      if /\bgroup\b/.test @className
        Utils.toggleClass this, 'collapsed'
      else if @attributes.rel
        event.preventDefault()
        optionName = @attributes.rel.value
        self.doAppAction optionName
        self.hideMenu()

    for option in @menuItems
      option.addEventListener 'mouseup', menuOptionListener
      option.addEventListener 'touchend', menuOptionListener
      option.addEventListener 'contextmenu', menuOptionListener

    @textElement = @container.querySelector 'textarea'

  addKeyboardListeners: ->
    self = @

    @keyBindings =
      keydown: {}
      keyup: {}

    for name, action of @appActions
      if action.hotkey
        for hotkey in action.hotkey
          if action.repeat
            @keyBindings.keydown[hotkey] = name

            if action.cancelComplement
              @keyBindings.keyup[hotkey] = null

          else

            @keyBindings.keyup[hotkey] = name

            if action.cancelComplement
              @keyBindings.keydown[hotkey] = null

    keyboardListener = (event) ->
      combo = Utils.describeKeyCombo event
      actionName = self.keyBindings[event.type][combo]

      if actionName or actionName is null
        event.preventDefault()

        if actionName
          self.doAppAction actionName

      # Utils.log "#{event.type}-#{combo} (#{event.keyCode})" if event.keyCode isnt 0

    document.body.addEventListener 'keydown', keyboardListener
    document.body.addEventListener 'keyup', keyboardListener

  addOtherListeners: ->
    self = @
    window.addEventListener 'beforeunload', ->
      self.putStoredData 'app', 'options', self.options
      self.putStoredData 'app', 'state', self.state
      event.returnValue = "You have unsaved changes. Alt+S to save." if self.unsavedChanges

  newFrame: (index = null) ->
    frame =
      hold: 1
      strokes: []

    if index is null
      index = @film.frames.length

    @lift()
    @film.frames.splice index, 0, frame
    @buildFilmMeta()

  getCurrentFrame: ->
    @film.frames[@current.frameNumber]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex or 0]

  mark: (x,y) ->
    x = Utils.getDecimal x, 1
    y = Utils.getDecimal y, 1

    if not @currentStrokeIndex
      @getCurrentFrame().strokes ?= []
      @currentStrokeIndex = @getCurrentFrame().strokes.length
      @getCurrentFrame().strokes.push []
      @renderer.moveTo x, y
    else
      @renderer.lineTo x, y

    @getCurrentStroke().push [x, y]
    if @state.mode is PencilTest.prototype.modes.DRAWING
      @renderer.render()

    @clearRedo()
    @unsavedChanges = true

  track: (x,y) ->
    coords =
      x: x
      y: y

    makeMark = false

    if not @currentStrokeIndex?
      @markPoint = coords
      @markBuffer = []
      makeMark = true

    @markBuffer.push coords

    @markPoint.x = (@markPoint.x * @options.smoothing + x) / (@options.smoothing + 1)
    @markPoint.y = (@markPoint.y * @options.smoothing + y) / (@options.smoothing + 1)

    if @markBuffer.length > @state.smoothDrawInterval
      @markBuffer = []
      makeMark = true

    @mark @markPoint.x, @markPoint.y if makeMark

  showMenu: (coords = {x: 10, y: 10}) ->
    if not @menuIsVisible
      @menuIsVisible = true
      Utils.toggleClass @container, 'menu-visible', true
      coords.x = Math.min document.body.offsetWidth - @menuElement.offsetWidth, coords.x
      coords.y = Math.min document.body.offsetHeight - @menuElement.offsetHeight, coords.y
      @menuElement.style.left = "#{coords.x + 1}px"
      @menuElement.style.top = "#{coords.y}px"
      for option in @menuItems
        @updateMenuOption option if option.attributes.rel

  hideMenu: ->
    if @menuIsVisible
      @menuIsVisible = false
      Utils.toggleClass @container, 'menu-visible', false

  toggleMenu: (coords) ->
    if @menuIsVisible then @hideMenu() else @showMenu coords

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex) ->
    newIndex = Math.max 0, Math.min @film.frames.length - 1, newIndex

    @current.frameNumber = newIndex
    @current.frame = @film.frames[@current.frameNumber]

    if @state.mode isnt PencilTest.prototype.modes.PLAYING
      @seekToAudioAtExposure newIndex
    @drawCurrentFrame()

  seekToAudioAtExposure: (frameNumber) ->
    if @film.audio
      seekTime = ( @current.frameIndex[frameNumber].time - @film.audio.offset ) * @singleFrameDuration
      @seekAudio 

  play: ->
    self = @
    @playDirection ?= 1
    if @current.frameNumber < @film.frames.length - 1
      @framesHeld = 0
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      if self.framesHeld >= currentFrame.hold
        self.framesHeld = 0
        newIndex = self.current.frameNumber + self.playDirection
        if newIndex >= self.film.frames.length or newIndex < 0
          if self.options.loop
            newIndex = (newIndex + self.film.frames.length) % self.film.frames.length
            self.goToFrame newIndex
          else
            self.stop()
        else
          self.goToFrame newIndex

    @stop()
    stepListener()
    @playInterval = setInterval stepListener, 1000 / @options.frameRate
    @lift()
    @state.mode = PencilTest.prototype.modes.PLAYING
    @playAudio()

  stop: ->
    @pauseAudio() if @audioElement
    clearInterval @playInterval
    if @state.mode is PencilTest.prototype.modes.PLAYING
      @state.mode = PencilTest.prototype.modes.DRAWING

  togglePlay: ->
    if @state.mode isnt PencilTest.prototype.modes.BUSY
      if @state.mode is PencilTest.prototype.modes.PLAYING then @stop() else @play()

  drawCurrentFrame: ->
    @renderer.clear()
    if @options.onionSkin
      for i in [1..@options.onionSkinRange]
        if @current.frameNumber >= i
          @drawFrame(
            @current.frameNumber - i
            {
              color: [255, 0, 0],
              opacity: Math.pow @options.onionSkinOpacity, i
            }
          )
        if @current.frameNumber < @film.frames.length - i
          @drawFrame(
            @current.frameNumber + i
            {
              color: [0, 0, 255],
              opacity: Math.pow @options.onionSkinOpacity, i
            }
          )
    @drawFrame @current.frameNumber
    @updateStatus()

  drawFrame: (frameIndex, lineOptions) ->
    @renderer.setLineOverrides lineOptions if lineOptions

    for stroke in @film.frames[frameIndex].strokes
      @renderer.path stroke

    @renderer.clearLineOverrides()

  lift: ->
    if @markBuffer && @markBuffer.length
      last = @markBuffer.pop()
      @mark last.x, last.y
      @markBuffer = []
    @currentStrokeIndex = null

  dropFrame: ->
    @film.frames.splice @current.frameNumber, 1
    @current.frameNumber-- if @current.frameNumber >= @film.frames.length and @current.frameNumber > 0
    if @film.frames.length is 0
      @newFrame()

    @buildFilmMeta()
    @drawCurrentFrame()

  smoothFrame: (index, amount) ->
    if not amount
      amount = Number Utils.prompt 'How much to smooth? 1-5', 2
    smoothingBackup = @options.smoothing
    @options.smoothing = amount
    frame = @film.frames[index]
    oldStrokes = JSON.parse JSON.stringify frame.strokes
    @lift()
    frame.strokes = []
    @current.frameNumber = index
    @renderer.clear()
    for stroke in oldStrokes
      for segment in stroke
        @track.apply @, segment
      @lift()

    @options.smoothing = smoothingBackup

  smoothFilm: (amount) ->
    if @state.mode is PencilTest.prototype.modes.DRAWING
      if Utils.confirm 'Would you like to smooth every frame of this film?'
        if not amount
          amount = Number Utils.prompt 'How much to smooth? 1-5', 2
        @state.mode = PencilTest.prototype.modes.BUSY
        lastIndex = @film.frames.length - 1
        for frame in [0..lastIndex]
          @smoothFrame frame, amount
        @state.mode = PencilTest.prototype.modes.DRAWING
    else
      Utils.log 'Unable to alter film while playing'

  undo: ->
    if @getCurrentFrame().strokes and @getCurrentFrame().strokes.length
      @redoQueue ?= []
      @redoQueue.push @getCurrentFrame().strokes.pop()
      @unsavedChanges = true
      @drawCurrentFrame()

  redo: ->
    if @redoQueue and @redoQueue.length
      @getCurrentFrame().strokes.push @redoQueue.pop()
      @unsavedChanges = true
      @drawCurrentFrame()

  clearRedo: ->
    @redoQueue = []

  setCurrentFrameHold: (newHold) ->
    @getCurrentFrame().hold = Math.max 1, newHold
    @buildFilmMeta()
    @updateStatus()

  updateStatus: ->
    if @options.showStatus
      markup = "<div class=\"settings\">"
      markup += "v#{PencilTest.prototype.state.version}"
      markup += " Smoothing: #{@options.smoothing}"
      markup += "</div>"
      markup += "<div class=\"frame\">"
      markup += "#{@options.frameRate} FPS"
      markup += " | (hold #{@getCurrentFrame().hold})"
      markup += " | #{@current.frameNumber + 1}/#{@film.frames.length}"
      markup += " | #{Utils.getDecimal @current.frameIndex[@current.frameNumber].time, 1, String}"
      if @film.audio?.offset
        markup += " #{if @film.audio.offset >= 0 then '+' else ''}#{@film.audio.offset}"
      markup += "</div>"
      @statusElement.innerHTML = markup

  newFilm: ->
    @film =
      name: ''
      version: PencilTest.prototype.state.version
      frames: []

    @newFrame()
    @goToFrame 0

  getFilmNames: ->
    filmNamePattern = /^film:/
    filmNames = []
    for storageName of window.localStorage
      reference = @decodeStorageReference storageName
      if reference and reference.namespace is 'film'
        filmNames.push reference.name
    filmNames

  encodeStorageReference: (namespace, name) ->
    "#{namespace}:#{name}"

  decodeStorageReference: (encoded) ->
    if match = encoded.match /^(app|film):(.*)/
      {
        namespace: match[1]
        name: match[2]
      }
    else
      false

  getStoredData: (namespace, name) ->
    storageName = @encodeStorageReference namespace, name
    JSON.parse window.localStorage.getItem storageName

  putStoredData: (namespace, name, data) ->
    storageName = @encodeStorageReference namespace, name
    window.localStorage.setItem storageName, JSON.stringify data

  saveFilm: ->
    name = window.prompt "what will you name your film?", @film.name
    if name
      @film.name = name
      @putStoredData 'film', name, @film
      @unsavedChanges = false

  selectFilmName: (message) ->
    filmNames = @getFilmNames()
    if filmNames.length
      message ?= 'Choose a film'
      selectedFilmName = window.prompt "#{message}:\n\n#{filmNames.join '\n'}"

      if selectedFilmName and filmNames.indexOf selectedFilmName is -1
        for filmName in filmNames
          selectedFilmName = filmName if RegExp(selectedFilmName).test filmName

      if selectedFilmName and filmNames.indexOf( selectedFilmName ) isnt -1
        return selectedFilmName
      else
        Utils.alert "No film by that name."
    else
      Utils.alert "You don't have any saved films yet."

    false

  setFilm: (film) ->
    @film = film
    @buildFilmMeta()
    if @film.audio and @film.audio.url
      @loadAudio @film.audio.url
    else
      @destroyAudio()
    @goToFrame 0
    @updateStatus()
    @unsavedChanges = false

  loadFilm: ->
    if name = @selectFilmName 'Choose a film to load'
      @setFilm @getStoredData 'film', name

  deleteFilm: ->
    if filmName = @selectFilmName 'Choose a film to DELETE...FOREVER'
      window.localStorage.removeItem @encodeStorageReference 'film', filmName

  buildFilmMeta: ->
    @current.frameIndex = []
    @current.exposureIndex = []
    @current.exposures = 0

    for i in [0...@film.frames.length]
      frame = @film.frames[i]
      frameMeta =
        id: i
        exposure: @current.exposures
        duration: frame.hold * @singleFrameDuration
        time: @current.exposures * @singleFrameDuration
      @current.frameIndex.push frameMeta
      @current.exposureIndex.push frameMeta for [1...frame.hold]
      @current.exposures += @film.frames[i].hold

    @current.duration = @current.exposures * @singleFrameDuration

  getFrameDuration: (frameNumber = @current.frameNumber) ->
    frame = @film.frames[frameNumber]
    frame.hold / @options.frameRate

  loadAudio: (audioURL) ->
    @state.audioURL = audioURL
    if not @audioElement
      @audioElement = document.createElement 'audio'
      @fieldElement.insertBefore @audioElement
      @audioElement.preload = true
    else
      @pauseAudio()
    @audioElement.src = @state.audioURL

  destroyAudio: ->
    if @audioElement
      @pauseAudio()
      @audioElement.remove()
      @audioElement = null

  pauseAudio: ->
    @audioElement.pause() if @audioElement and not @audioElement.paused

  playAudio: ->
    @audioElement.play() if @audioElement and @audioElement.paused

  seekAudio: (time) ->
    ( @audioElement.currentTime = time ) if @audioElement

  scrubAudio: ->
    Utils.log 'scrubAudio'
    self = @
    @seekToAudioAtExposure @current.frameNumber
    clearTimeout @scrubAudioTimeout
    @playAudio()
    @scrubAudioTimeout = setTimeout(
      -> self.pauseAudio()
      Math.max @getFrameDuration( @current.frameNumber ) * 1000, 100
    )

  keyboardShortcuts: ->
    open = Utils.toggleClass @textElement, 'active'
    if open
      helpDoc = 'Keyboard Shortcuts:\n'

      for name, action of @appActions
        if not action.hotkey then continue

        helpDoc += action.label or name
        if action.hotkey
          helpDoc += " [#{action.hotkey.join ' or '}]"
        if action.title
          helpDoc += " - #{action.title}"
        helpDoc += '\n'

      @textElement.value = helpDoc
    else
      @textElement.value = ''
