class PenciltestUI extends PenciltestUIComponent

  constructor: (@controller) ->

    super className: 'penciltest-ui', parent: @controller.container

    @markupDOMElements()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()
    @addOtherListeners()

  markupDOMElements: ->
    @components = {}

    componentInfo =
      toolbar:
        className: 'toolbar'
        parent: this
      statusBar:
        className: 'status'
        parent: 'toolbar'
      statusLeft:
        className: 'status-left'
        parent: 'statusBar'
      statusRight:
        className: 'status-right'
        parent: 'statusBar'
      appStatus:
        className: 'app-status'
        parent: 'statusLeft'
      filmStatus:
        className: 'film-status'
        parent: 'statusRight'
      toggleTool:
        tagName: 'button'
        className: 'toggle-tool fa fa-pencil'
        parent: 'statusRight'
      toggleMenu:
        tagName: 'button'
        className: 'toggle-menu fa fa-cog'
        parent: 'statusRight'
      toggleHelp:
        tagName: 'button'
        className: 'toggle-help fa fa-question-circle'
        parent: 'statusRight'
      menu:
        tagName: 'ul'
        className: 'menu'
        parent: this
      textIO:
        tagName: 'textarea'
        parent: 'toolbar'

    for name, options of componentInfo
      if typeof options.parent is 'string'
        options.parent = @components[options.parent]
      @components[name] = new PenciltestUIComponent options

    @components.menu.setHTML @menuWalker @menuOptions

  # action and listener functions are called in controller scope
  appActions:
    showMenu:
      label: "Show Menu"
      gesture: /4 still/
      listener: -> @ui.toggleMenu x: 0, y: 0
    renderer:
      label: "Set Renderer"
      listener: ->
        self = @
        name = Utils.select 'renderer', @availableRenderers, @options.renderer, (selected) ->
          self.setOptions renderer: selected
      action: ->
        if @fieldElement
          @renderer?.destroy()
          @renderer = new @availableRenderers[ @options.renderer ](
            container: @fieldElement
            width: if @forceDimensions then @forceDimensions.width else @width
            height: if @forceDimensions then @forceDimensions.height else @height
          )
    playPause:
      label: "Play/Pause"
      hotkey: ['Space']
      gesture: /2 still from center (bottom|middle)/
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
      gesture: /2 still from right bottom/
      repeat: true
      listener: ->
        @goToFrame @current.frameNumber + 1
        @stop()
        @scrubAudio() if @audioElement
    prevFrame:
      label: "Previous Frame"
      hotkey: ['Left',',']
      gesture: /2 still from left bottom/
      repeat: true
      listener: ->
        @goToFrame @current.frameNumber - 1
        @stop()
        @scrubAudio() if @audioElement
    firstFrame:
      label: "First Frame"
      hotkey: ['0','Home','PgUp']
      gesture: /2 left from .* (bottom|middle)/
      cancelComplement: true
      listener: ->
        @goToFrame 0
        @stop()
    lastFrame:
      label: "Last Frame"
      hotkey: ['$','End','PgDn']
      gesture: /2 right from .* (bottom|middle)/
      cancelComplement: true
      listener: ->
        @goToFrame @film.frames.length - 1
        @stop()
    copyFrame:
      label: "Copy Frame"
      hotkey: ['C']
      listener: ->
        @copyFrame()
    pasteFrame:
      label: "Paste Frame"
      hotkey: ['V']
      listener: ->
        @pasteFrame()
    pasteStrokes:
      label: "Paste Strokes"
      hotkey: ['Shift+V']
      listener: ->
        @pasteStrokes()
    insertFrameBefore:
      label: "Insert Frame Before"
      hotkey: ['Shift+I']
      gesture: /2 still from left top/
      listener: ->
        newIndex = @current.frameNumber
        @newFrame newIndex
        @goToFrame newIndex
    insertFrameAfter:
      label: "Insert Frame After"
      hotkey: ['I']
      gesture: /2 still from right top/
      listener: ->
        newIndex = @current.frameNumber + 1
        @newFrame newIndex
        @goToFrame newIndex
    insertSeconds:
      label: "Insert Seconds"
      hotkey: ['Alt+Shift+I']
      listener: ->
        self = @
        Utils.prompt '# of seconds to insert: ', 1, (seconds) ->
          first = self.current.frameNumber + 1
          last = self.current.frameNumber + Math.floor self.options.frameRate * Number(seconds)
          self.newFrame newIndex for newIndex in [first..last]
          self.goToFrame newIndex
    undo:
      label: "Undo"
      title: "Remove the last line drawn"
      hotkey: ['U','Alt+Z']
      gesture: /3 still from left/
      repeat: true
      listener: -> @undo()
    redo:
      label: "Redo"
      title: "Put back a line removed by 'Undo'"
      hotkey: ['R','Alt+Shift+Z']
      gesture: /3 still from right/
      repeat: true
      listener: -> @redo()
    frameRate:
      label: "Frame Rate"
      listener: ->
        Utils.prompt 'frames per second: ', @options.frameRate, (rate) ->
          if rate then @setOptions frameRate: Number rate
      action: -> @singleFrameDuration = 1 / @options.frameRate
    frameHold:
      label: "Default Frame Hold"
      listener: ->
        Utils.prompt 'default exposures per drawing: ', @options.frameHold, (hold) ->
          update = Utils.confirm 'update hold for existing frames in proportion to new setting??: '
          if hold
            oldHold = @options.frameHold
            @setOptions frameHold: Number hold
            if update
              magnitudeDelta = @options.frameHold / oldHold
              for frame in @film.frames
                frame.hold = Math.round frame.hold * magnitudeDelta
              @drawCurrentFrame() # FIXME: not sure why I need to redraw here. something about `setoptions frameHold` above?
    hideCursor:
      label: "Hide Cursor"
      hotkey: ['H']
      listener: -> @setOptions hideCursor: not @options.hideCursor
      action: -> Utils.toggleClass @container, 'hide-cursor', @options.hideCursor
    onionSkin:
      label: "Onion Skin"
      hotkey: ['O']
      gesture: /2 down from center (bottom|middle)/
      title: "show previous and next frames in red and blue"
      listener: ->
        @setOptions onionSkin: not @options.onionSkin
        @resize() # FIXME: should either not redraw, or redraw fine without this
    dropFrame:
      label: "Drop Frame"
      hotkey: ['Shift+X']
      gesture: /4 down from center top/
      cancelComplement: true
      listener: -> @dropFrame()
    cutFrame:
      label: "Cut Frame"
      hotkey: ['X']
      gesture: /3 down from center top/
      cancelComplement: true
      listener: -> @cutFrame()
    smoothing:
      label: "Smoothing..."
      title: "How much your lines will be smoothed as you draw"
      hotkey: ['Shift+S']
      listener: ->
        self = @
        Utils.prompt 'Smoothing', @options.smoothing, (smoothing) ->
          self.setOptions smoothing: Number smoothing
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
      gesture: /2 still from left middle/
      repeat: true
      listener: -> @setCurrentFrameHold @getCurrentFrame().hold - 1
    moreHold:
      label: "Longer Frame Hold"
      hotkey: ['Up', '+', '=']
      gesture: /2 still from right middle/
      repeat: true
      listener: -> @setCurrentFrameHold @getCurrentFrame().hold + 1
    showStatus:
      label: "Show Status"
      title: "hide the film status bar"
      listener: -> @setOptions showStatus: not @options.showStatus
      action: -> Utils.toggleClass @ui.components.statusBar.getElement(), 'hidden', not @options.showStatus
    loop:
      label: "Loop"
      hotkey: ['L']
      gesture: /2 up from center (bottom|middle)/
      listener: ->
        @setOptions loop: not @options.loop
        @resize() # FIXME: should either not redraw, or redraw fine without this
    saveFilm:
      label: "Save"
      hotkey: ['Alt+S']
      gesture: /3 still from center (bottom|middle)/
      listener: -> @saveFilm()
    loadFilm:
      label: "Load"
      hotkey: ['Alt+O']
      gesture: /3 up from center (bottom|middle)/
      listener: -> @loadFilm()
    newFilm:
      label: "New"
      hotkey: ['Alt+N']
      listener: -> @newFilm() if Utils.confirm "This will BURN your current animation."
    renderGif:
      label: "Render GIF"
      hotkey: ['Alt+G']
      listener: -> @renderGif()
    resizeFilm:
      label: "Resize Film"
      hotkey: ['Alt+R']
      listener: ->
        Utils.prompt 'Film width & aspect', "#{@film.width} #{@film.aspect}", (dimensionsResponse) ->
          dimensions = dimensionsResponse.split ' '
          @film.width = Number dimensions[0]
          @film.aspect = dimensions[1]
          @resize()
    panFilm:
      label: "Pan Film"
      hotkey: ['P']
      listener: ->
        self = @
        oldMode = @state.mode
        @state.mode = Penciltest.prototype.modes.BUSY

        startPoint = endPoint = deltaPoint = [0,0]
        frameScale = @width / @film.width

        dragStart = (event) ->
          startPoint = endPoint = [event.clientX, event.clientY]
          deltaPoint = [0, 0]
          self.fieldElement.addEventListener 'mousemove', dragStep
          self.fieldElement.addEventListener 'mouseup', dragEnd

        dragStep = (event) ->
          deltaPoint = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]]
          immediateDeltaPoint =  [event.clientX - endPoint[0], event.clientY - endPoint[1]]
          endPoint = [event.clientX, event.clientY]
          self.pan [immediateDeltaPoint[0] / frameScale, immediateDeltaPoint[1] / frameScale]
          self.drawCurrentFrame()

        dragEnd = (event) ->
          self.fieldElement.removeEventListener 'mouseup', dragEnd
          self.fieldElement.removeEventListener 'mousedown', dragStart
          self.fieldElement.removeEventListener 'mousemove', dragStep

          self.state.mode = oldMode

        @fieldElement.addEventListener 'mousedown', dragStart
        @resize()
    deleteFilm:
      label: "Delete Film"
      hotkey: ['Alt+Backspace']
      listener: -> @deleteFilm()
    exportFilm:
      label: "Export"
      hotkey: ['Alt+E']
      cancelComplement: true
      listener: ->
        open = Utils.toggleClass @ui.components.textIO.getElement(), 'active'
        if open
          @ui.components.textIO.getElement().value = JSON.stringify @film
        else
          @ui.components.textIO.getElement().value = ''
    importFilm:
      label: "Import"
      hotkey: ['Alt+I']
      cancelComplement: true
      listener: ->
        open = Utils.toggleClass @ui.components.textIO.getElement(), 'active'
        if open
          @ui.components.textIO.getElement().value = ''
        else
          importJSON = @ui.components.textIO.getElement().value
          try
            @setFilm JSON.parse importJSON
          @ui.components.textIO.getElement().value = ''
    linkAudio:
      label: "Link Audio"
      hotkey: ['Alt+A']
      listener: ->
        Utils.prompt 'Audio file URL: ', @state.audioURL, (audioURL) ->
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
        @film.audio.offset-- if @film.audio
        @ui.updateStatus()
    shiftAudioLater:
      label: "Shift Audio Later"
      hotkey: [']']
      listener: ->
        Utils.log "Shift Audio Later"
        @film.audio.offset++ if @film.audio
        @ui.updateStatus()
    describeKeyboardShortcuts:
      label: "Keyboard Shortcuts"
      hotkey: ['?']
      listener: -> @ui.describeKeyboardShortcuts()
    reset:
      label: "Reset"
      title: "Clear settings; helpful if the app has stopped working."
      action: ->
        @state = Utils.inherit {}, Penciltest.prototype.state
        @setOptions Utils.inherit {}, Penciltest.prototype.options
    eraser:
      label: "Eraser"
      hotkey: ['E']
      listener: ->
        @useTool if @state.toolStack[0] == 'eraser' then @state.toolStack[1] else 'eraser'
        @ui.updateStatus()

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
      'moreHold'
      'lessHold'
      'copyFrame'
      'cutFrame'
      'pasteFrame'
      'pasteStrokes'
      'insertFrameAfter'
      'insertFrameBefore'
      'insertSeconds'
      'dropFrame'
    ]
    Playback: [
      'loop'
      'frameRate'
    ]
    Tools: [
      'hideCursor'
      'onionSkin'
      'smoothing'
      'smoothFrame'
      'smoothFilm'
      'linkAudio'
    ]
    Film: [
      'saveFilm'
      'loadFilm'
      'newFilm'
      'importFilm'
      'exportFilm'
      'renderGif'
      'resizeFilm'
      'panFilm'
    ]
    Settings: [
      'frameHold'
      'renderer'
      'describeKeyboardShortcuts'
      'reset'
    ]
  ]

  doAppAction: (optionName) ->
    @appActions[optionName].listener?.call @controller

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

      self.controller.track(
        pageCoords.x - self.controller.fieldContainer.offsetLeft,
        pageCoords.y - self.controller.fieldContainer.offsetTop
      )

    mouseDownListener = (event) ->
      return if self.controller.state.mode != Penciltest.prototype.modes.DRAWING
      event.preventDefault()
      if event.type is 'touchstart' and event.touches.length > 1
        self.controller.cancelStroke()
        self.fieldBounds =
          x: 0
          y: 0
          width: self.controller.width
          height: self.controller.height
        if not Utils.currentGesture
          self.doAppAction 'undo'
        Utils.clearGesture()
        Utils.recordGesture event
      else
        if event.button is 2
          return true # allow context menu
        else
          self.hideMenu()

        self.controller.useTool 'eraser' if event.button is 1

        trackFromEvent event
        document.body.addEventListener 'mousemove', mouseMoveListener
        document.body.addEventListener 'touchmove', mouseMoveListener
        document.body.addEventListener 'mouseup', mouseUpListener
        document.body.addEventListener 'touchend', mouseUpListener

    mouseMoveListener = (event) ->
      event.preventDefault()
      if event.type is 'touchmove' and event.touches.length > 1
        Utils.recordGesture event
        Utils.describeGesture self.fieldBounds
        # TODO: support continuous gestures, like scrubbing the timeline
      else
        trackFromEvent event if self.controller.state.mode is Penciltest.prototype.modes.DRAWING

    mouseUpListener = (event) ->
      if event.type is 'mouseup' and event.button is 2
        return true # allow context menu
      else
        if event.type is 'touchend' and Utils.currentGesture
          self.doGesture Utils.describeGesture self.fieldBounds, 'final'
          Utils.clearGesture event
        self.controller.useTool 'pencil' if event.button is 1
        document.body.removeEventListener 'mousemove', mouseMoveListener
        document.body.removeEventListener 'touchmove', mouseMoveListener
        document.body.removeEventListener 'mouseup', mouseUpListener
        document.body.removeEventListener 'touchend', mouseUpListener
        self.controller.lift()

    toggleToolListener = (event) ->
      event.preventDefault()
      self.appActions.eraser.listener.call self.controller

    contextMenuListener = (event) ->
      event.preventDefault()
      self.toggleMenu getEventPageXY event

    @controller.fieldElement.addEventListener 'mousedown', mouseDownListener
    @controller.fieldElement.addEventListener 'touchstart', mouseDownListener
    @controller.fieldElement.addEventListener 'contextmenu', contextMenuListener
    @components.toggleTool.getElement().addEventListener 'click', toggleToolListener
    @components.toggleMenu.getElement().addEventListener 'click', contextMenuListener
    @components.toggleHelp.getElement().addEventListener 'click', -> self.doAppAction 'describeKeyboardShortcuts'

  doGesture: (gestureDescription) ->
    for name, action of @appActions
      if action.gesture and action.gesture.test gestureDescription
        @showFeedback action.label
        return @doAppAction name

  updateMenuOption: (optionElement) ->
    optionName = optionElement.attributes.rel.value
    if typeof @controller.options[optionName] is 'boolean'
      Utils.toggleClass optionElement, 'enabled', @controller.options[optionName]

  addMenuListeners: ->
    self = @
    @menuItems = @components.menu.getElement().querySelectorAll 'LI'

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
      # option.addEventListener 'touchend', menuOptionListener
      option.addEventListener 'contextmenu', menuOptionListener

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
      self.controller.putStoredData 'app', 'options', self.controller.options
      self.controller.putStoredData 'app', 'state', self.controller.state
      event.returnValue = "You have unsaved changes. Alt+S to save." if self.controller.unsavedChanges

  describeKeyboardShortcuts: ->
    open = Utils.toggleClass @components.textIO.getElement(), 'active'
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

      @components.textIO.getElement().value = helpDoc
    else
      @components.textIO.getElement().value = ''

  updateStatus: ->
    if @controller.options.showStatus
      appStatusMarkup = "v#{Penciltest.prototype.state.version}"
      appStatusMarkup += " Smoothing: #{@controller.options.smoothing}"

      @components.appStatus.setHTML appStatusMarkup

      filmStatusMarkup = "<div class=\"frame\">"
      filmStatusMarkup += "#{@controller.options.frameRate} FPS"
      filmStatusMarkup += " | (hold #{@controller.getCurrentFrame().hold})"
      filmStatusMarkup += " | #{@controller.current.frameNumber + 1}/#{@controller.film.frames.length}"
      filmStatusMarkup += " | #{Utils.getDecimal @controller.current.frameIndex[@controller.current.frameNumber].time, 1, String}"
      if @controller.film.audio?.offset
        filmStatusMarkup += " #{if @controller.film.audio.offset >= 0 then '+' else ''}#{@controller.film.audio.offset}"
      filmStatusMarkup += "</div>"

      @components.filmStatus.setHTML filmStatusMarkup
      @components.toggleTool.getElement().className = "toggle-tool fa fa-#{@controller.state.toolStack[0]}"# FIXME: use a helper to do this

  showMenu: (coords = {x: 10, y: 10}) ->
    if not @menuIsVisible
      @menuIsVisible = true
      menuElement = @components.menu.getElement()
      Utils.toggleClass menuElement, 'active', true

      maxRight = @components.menu.getElement().offsetWidth
      maxBottom = 0

      if coords.x > document.body.offsetWidth - maxRight - menuElement.offsetWidth
        menuElement.style.right = "#{maxRight}px"
        menuElement.style.left = "auto"
      else
        menuElement.style.left = "#{coords.x + 1}px"
        menuElement.style.right = "auto"

      if coords.y > document.body.offsetHeight - maxBottom - menuElement.offsetHeight
        menuElement.style.top = "auto"
        menuElement.style.bottom = maxBottom
      else
        menuElement.style.top = "#{coords.y}px"
        menuElement.style.bottom = "auto"

      for option in @menuItems
        @updateMenuOption option if option.attributes.rel

  hideMenu: ->
    if @menuIsVisible
      @menuIsVisible = false
      Utils.toggleClass @components.menu.getElement(), 'active', false

  toggleMenu: (coords) ->
    if @menuIsVisible then @hideMenu() else @showMenu coords

  showFeedback: (message, duration = 2000) ->
    self = @
    if not @feedbackElement
      @feedbackElement = new PenciltestUIComponent id: 'pt-feedback', parent: @
    @feedbackElement.setHTML message
    @feedbackElement.getElement().style.opacity = 1

    clearTimeout @feedbackTimeout
    hideFeedback = () ->
      self.feedbackElement.getElement().style.opacity = 0
    @feedbackTimeout = setTimeout hideFeedback, duration
