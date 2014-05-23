###
global: document, window
###

class PencilTest

  constructor: (@options) ->
    savedOptions = @getStoredData 'app', 'options'
    for key, value of {
      container: 'body'
      hideCursor: false
      loop: true
      showStatus: true
      frameRate: 12
      onionSkin: true
      onionSkinRange: 4
      onionSkinOpacity: 0.5
    }
      @options[key] = savedOptions[key] if savedOptions and typeof savedOptions[key] isnt 'undefined'
      @options[key] = value if typeof @options[key] is 'undefined'

    @container = document.querySelector @options.container
    @container.className = 'penciltest-app'

    @buildContainer()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()
    @addOtherListeners()

    @appActions[optionName]?.action?.call @ for optionName of @options

    @newFilm()

    window.penciltest = @

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
    prevFrame:
      label: "Previous Frame"
      hotkey: ['Left',',']
      repeat: true
      listener: ->
        @goToFrame @currentFrameIndex - 1
        @stop()
    firstFrame:
      label: "First Frame"
      hotkey: ['Home','PgUp']
      cancelComplement: true
      listener: ->
        @goToFrame 0
        @stop()
    lastFrame:
      label: "Last Frame"
      hotkey: ['End','PgDn']
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
    undo:
      label: "Undo"
      title: "Remove the last line drawn"
      hotkey: ['U','Alt+Z']
      repeat: true
      listener: -> @undo()
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
      listener: -> @dropFrame()
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
        if @textElement.innerHTML
          @textElement.innerHTML = JSON.stringify @film
        else
          Utils.toggleClass @textElement, 'active', true
    importFilm:
      label: "Import"
      hotkey: ['Alt+I']
      cancelComplement: true
      listener: ->
        if @textElement.innerHTML
          @film = JSON.parse @textElement.innerHTML
          @drawCurrentFrame()
          @textElement.innerHTML = ''
          Utils.toggleClass @textElement, 'active', false
        else
          Utils.toggleClass @textElement, 'active', true
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
      markFromEvent event if not self.isPlaying

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
      event.returnValue = "You have unsaved changes. Alt+S to save." if self.unsavedChanges

  newFrame: (index = null) ->
    frame =
      hold: 1
      strokes: []

    if index is null
      index = @film.frames.length

    @film.frames.splice index, 0, frame

  getCurrentFrame: ->
    @film.frames[@currentFrameIndex]

  getCurrentStroke: ->
    @getCurrentFrame().strokes[@currentStrokeIndex or 0]

  mark: (x,y) ->
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

  goToFrame: (newIndex, stop = false) ->
    newIndex = Math.max 0, Math.min @film.frames.length - 1, newIndex

    @currentFrameIndex = newIndex
    @drawCurrentFrame()
    if stop isnt false then @stop()

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
    @playInterval = setInterval stepListener, 1000 / @options.frameRate
    @lift()
    @isPlaying = true

  stop: ->
    clearInterval @playInterval
    @isPlaying = false

  togglePlay: ->
    if @isPlaying then @stop() else @play()

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
    @currentStrokeIndex = null

  dropFrame: ->
    @film.frames.splice @currentFrameIndex, 1
    @currentFrameIndex-- if @currentFrameIndex >= @film.frames.length and @currentFrameIndex > 0
    if @film.frames.length is 0
      @newFrame()

    @drawCurrentFrame()

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
    @updateStatus()

  updateStatus: ->
    if @options.showStatus
      markup = "#{@options.frameRate} FPS"
      markup += " | (hold #{@getCurrentFrame().hold})"
      markup += " | #{@currentFrameIndex + 1}/#{@film.frames.length}"
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

  loadFilm: ->
    if name = @selectFilmName 'Choose a film to load'
      @film = @getStoredData 'film', name
      @goToFrame 0
      @updateStatus()
      @unsavedChanges = false

  deleteFilm: ->
    if filmName = @selectFilmName 'Choose a film to DELETE...FOREVER'
      window.localStorage.removeItem @encodeStorageReference 'film', filmName

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
