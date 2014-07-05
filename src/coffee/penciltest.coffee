###
global: document, window
###

class PencilTest

  modes:
    DRAWING: 'drawing'
    BUSY: 'working'
    PLAYING: 'playing'

  options:
    container: 'body'
    hideCursor: false
    loop: true
    showStatus: true
    frameRate: 12
    onionSkin: true
    smoothing: 3
    onionSkinRange: 4
    onionSkinOpacity: 0.5

  state:
    version: '0.0.2'
    mode: PencilTest.prototype.modes.DRAWING

  constructor: (options) ->
    @setOptions Utils.inherit(
      @getStoredData 'app', 'options'
      options
      PencilTest.prototype.options
    )

    @state = Utils.inherit(
      @getStoredData 'app', 'state'
      PencilTest.prototype.state
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
      if LegacyDefinitions.hasOwnProperty @state.version
        confirmMessage = "You last used v#{@state.version}. Currently v#{PencilTest.prototype.state.version}. Update your saved films to the new format now?"
        if Utils.confirm confirmMessage
          Utils.log "upgrading saved films not currently supported...working on it"
      @state.version = PencilTest.prototype.state.version

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
        @goToFrame @currentFrameIndex + 1
        @stop()
        @scrubAudio() if @audioElement
    prevFrame:
      label: "Previous Frame"
      hotkey: ['Left',',']
      repeat: true
      listener: ->
        @goToFrame @currentFrameIndex - 1
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
        newIndex = @currentFrameIndex
        @newFrame newIndex
        @goToFrame newIndex
    insertFrameAfter:
      label: "Insert Frame After"
      hotkey: ['I']
      listener: ->
        newIndex = @currentFrameIndex + 1
        @newFrame newIndex
        @goToFrame newIndex
    insertSeconds:
      label: "Insert Seconds"
      hotkey: ['Alt+Shift+I']
      listener: ->
        seconds = Number Utils.prompt '# of seconds to insert: ', 1
        first = @currentFrameIndex + 1
        last = @currentFrameIndex + Math.floor @options.frameRate * seconds
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
      hotkey: ['Backspace']
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
      listener: -> @smoothFrame @currentFrameIndex
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
        @loadAudio audioURL if audioURL?
    unloadAudio:
      label: "Unload Audio"
      listener: ->
        @destroyAudio
    shiftAudioEarlier:
      label: "Shift Audio Earlier"
      hotkey: ['[']
      listener: ->
        Utils.log "Shift Audio Earlier"
        @audioOffset-- if @audioElement
        @updateStatus()
    shiftAudioLater:
      label: "Shift Audio Later"
      hotkey: [']']
      listener: ->
        Utils.log "Shift Audio Later"
        @audioOffset++ if @audioElement
        @updateStatus()
    showHelp:
      label: "Help"
      title: "Show Keyboard Shortcuts"
      hotkey: ['?']
      listener: -> @showHelp()

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
    'showHelp'
  ]

  buildContainer: ->
    markup = '<div class="field">' +
      '<div class="status"></div>' +
    '</div>' +
    '<textarea></textarea>' +
    '<ul class="menu">' +
    @menuWalker(@menuOptions) +
    '</ul>'

    @container.innerHTML = markup

    @fieldElement = @container.querySelector '.field'
    @field = new Raphael @fieldElement
      # container: @fieldElement
      # width: 1280
      # height: 720
      # # TODO: pipe the callback parameter into a promise

    @statusElement = @container.querySelector '.status'

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
        pageCoords.x - self.fieldElement.offsetLeft,
        pageCoords.y - self.fieldElement.offsetTop
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

    @film.frames.splice index, 0, frame
    @buildFrameTimeIndex()

  getCurrentFrame: ->
    @film.frames[@currentFrameIndex]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex or 0]

  mark: (x,y) ->
    x = Utils.getDecimal x, 1
    y = Utils.getDecimal y, 1

    if @currentStrokeIndex?
      @drawSegmentStart = @drawSegmentEnd.replace(/^L/, 'M') if @drawSegmentEnd
      @drawSegmentEnd = "L#{x} #{y}"
      @getCurrentStroke().push @drawSegmentEnd
      @field.path "#{@drawSegmentStart}#{@drawSegmentEnd}"
    else
      @currentStrokeIndex = @getCurrentFrame().strokes.length
      @drawSegmentStart = "M#{x} #{y}"
      @drawSegmentEnd = null
      @getCurrentFrame().strokes.push [@drawSegmentStart]

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

    @currentFrameIndex = newIndex

    if @state.mode isnt PencilTest.prototype.modes.PLAYING
      @audioGoToFrame newIndex
    @drawCurrentFrame()

  audioGoToFrame: (index) ->
    if @audioElement
      @seekAudio @frameTimeIndex[index] + @audioOffset * @singleFrameDuration

  play: ->
    self = @
    @playDirection ?= 1
    if @currentFrameIndex < @film.frames.length - 1
      @framesHeld = 0
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      if self.framesHeld >= currentFrame.hold
        self.framesHeld = 0
        newIndex = self.currentFrameIndex + self.playDirection
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
    @field.clear()
    if @options.onionSkin
      for i in [0...@options.onionSkinRange]
        if @currentFrameIndex > i - 1
          @drawFrame @currentFrameIndex - i, "rgba(255,0,0,#{Math.pow(@options.onionSkinOpacity, i)})"
        if @currentFrameIndex < @film.frames.length - i
          @drawFrame @currentFrameIndex + i, "rgba(0,0,255,#{Math.pow(@options.onionSkinOpacity, i)})"
    @drawFrame @currentFrameIndex
    @updateStatus()

  drawFrame: (frameIndex, color = null) ->
    for stroke in @film.frames[frameIndex].strokes
      path = @field.path stroke.join ''
      path[0].style.stroke = color if color

  lift: ->
    if @markBuffer && @markBuffer.length
      Utils.log 'markBuffer has stuff'
      last = @markBuffer.pop()
      @mark last.x, last.y
      @markBuffer = []
    @currentStrokeIndex = null

  dropFrame: ->
    @film.frames.splice @currentFrameIndex, 1
    @currentFrameIndex-- if @currentFrameIndex >= @film.frames.length and @currentFrameIndex > 0
    if @film.frames.length is 0
      @newFrame()

    @buildFrameTimeIndex()
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
    @currentFrameIndex = index
    @field.clear()
    for stroke in oldStrokes
      for segment in stroke
        coords = segment.match /[A-Z]([0-9.\-]+) ([0-9.\-]+)/
        @track Number(coords[1]), Number(coords[2])
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
    @buildFrameTimeIndex()
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
      markup += " | #{@currentFrameIndex + 1}/#{@film.frames.length}"
      markup += " | #{Utils.getDecimal @frameTimeIndex[@currentFrameIndex], 1}"
      if @audioOffset
        markup += " #{if @audioOffset >= 0 then '+' else ''}#{@audioOffset}"
      markup += "</div>"
      @statusElement.innerHTML = markup

  newFilm: ->
    @film =
      name: ''
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

      if selectedFilmName and filmNames.indexOf selectedFilmName is -1
        return selectedFilmName
      else
        Utils.alert "No film by that name."
    else
      Utils.alert "You don't have any saved films yet."

    false

  setFilm: (film) ->
    @film = film
    @goToFrame 0
    @buildFrameTimeIndex()
    @updateStatus()
    @unsavedChanges = false

  loadFilm: ->
    if name = @selectFilmName 'Choose a film to load'
      @setFilm @getStoredData 'film', name

  deleteFilm: ->
    if filmName = @selectFilmName 'Choose a film to DELETE...FOREVER'
      window.localStorage.removeItem @encodeStorageReference 'film', filmName

  buildFrameTimeIndex: ->
    time = 0
    @frameTimeIndex = ( time += @getFrameDuration i for i in [0...@film.frames.length] )

  getFrameDuration: (frameIndex = @currentFrameIndex) ->
    frame = @film.frames[frameIndex]
    frame.hold * 1 / @options.frameRate

  loadAudio: (audioURL) ->
    @state.audioURL = audioURL
    if not @audioElement
      @audioElement = document.createElement 'audio'
      @fieldElement.insertBefore @audioElement
      @fieldElement.preload = true
      @audioOffset = 0
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
    @audioGoToFrame @currentFrameIndex
    clearTimeout @scrubAudioTimeout
    @playAudio()
    @scrubAudioTimeout = setTimeout(
      -> self.pauseAudio()
      Math.max @getFrameDuration( @currentFrame ) * 1000, 100
    )

  showHelp: ->
    helpDoc = 'Keyboard Shortcuts:\n'
    for name, action of @appActions
      helpDoc += action.label or name
      if action.hotkey
        helpDoc += " [#{action.hotkey.join ' or '}]"
      if action.title
        helpDoc += " - #{action.title}"
      helpDoc += '\n'

    alert helpDoc
