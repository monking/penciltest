class PenciltestUI

  constructor: (@controller) ->

    @markupDOMElements()

    @addInputListeners()
    @addMenuListeners()
    @addKeyboardListeners()
    @addOtherListeners()

  markupDOMElements: ->
    @el = {}

    # container
    @el.container = document.createElement 'div'
    @el.container.className = 'penciltest-ui'
    @controller.container.appendChild @el.container

    # toolbar
    @el.toolbar = document.createElement 'div'
    @el.toolbar.className = 'toolbar'
    @el.container.appendChild @el.toolbar

    # status bar
    @el.statusBar = document.createElement 'div'
    @el.statusBar.className = 'status'
    @el.toolbar.appendChild @el.statusBar

    # menu
    @el.menu = document.createElement 'ul'
    @el.menu.className = 'menu'
    @el.menu.innerHTML = @menuWalker @menuOptions
    @el.container.appendChild @el.menu

    # text input/output
    @el.textIO = document.createElement 'textarea'
    @el.toolbar.appendChild @el.textIO

  # action and listener functions are called in controller scope
  appActions:
    renderer:
      label: "Set Renderer"
      listener: ->
        name = Utils.prompt 'renderer (svg, canvas): ', @options.renderer
        if name of @availableRenderers
          @setOptions renderer: name
      action: ->
        if @fieldElement
          @renderer?.destroy()
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
      listener: -> @setOptions hideCursor: not @options.hideCursor
      action: -> Utils.toggleClass @container, 'hide-cursor', @options.hideCursor
    onionSkin:
      label: "Onion Skin"
      hotkey: ['O']
      title: "show previous and next frames in red and blue"
      listener: ->
        @setOptions onionSkin: not @options.onionSkin
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
      listener: -> @setOptions smoothing: Number Utils.prompt('Smoothing', @options.smoothing)
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
      listener: -> @setOptions showStatus: not @options.showStatus
      action: -> Utils.toggleClass @ui.el.statusBar, 'hidden', not @options.showStatus
    loop:
      label: "Loop"
      hotkey: ['L']
      listener: -> @setOptions loop: not @options.loop
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
        open = Utils.toggleClass @ui.el.textIO, 'active'
        if open
          @el.textIO.value = JSON.stringify @film
        else
          @el.textIO.value = ''
    importFilm:
      label: "Import"
      hotkey: ['Alt+I']
      cancelComplement: true
      listener: ->
        open = Utils.toggleClass @ui.el.textIO, 'active'
        if open
          @el.textIO.value = ''
        else
          importJSON = @el.textIO.value
          try
            @setFilm JSON.parse importJSON
          @el.textIO.value = ''
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
    Settings: [
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
      trackFromEvent event if self.controller.state.mode is Penciltest.prototype.modes.DRAWING

    mouseUpListener = (event) ->
      if event.button is 2
        return true # allow context menu
      else
        document.body.removeEventListener 'mousemove', mouseMoveListener
        document.body.removeEventListener 'touchmove', mouseMoveListener
        document.body.removeEventListener 'mouseup', mouseUpListener
        document.body.removeEventListener 'touchend', mouseUpListener
        self.controller.lift()

    contextMenuListener = (event) ->
      event.preventDefault()
      self.toggleMenu getEventPageXY event

    @controller.fieldElement.addEventListener 'mousedown', mouseDownListener
    @controller.fieldElement.addEventListener 'touchstart', mouseDownListener
    @controller.fieldElement.addEventListener 'contextmenu', contextMenuListener

  updateMenuOption: (optionElement) ->
    optionName = optionElement.attributes.rel.value
    if typeof @controller.options[optionName] is 'boolean'
      Utils.toggleClass optionElement, 'enabled', @controller.options[optionName]

  addMenuListeners: ->
    self = @
    @menuElement = @controller.container.querySelector '.menu'
    @menuItems = @menuElement.querySelectorAll 'LI'

    menuOptionListener = (event) ->
      if /\bgroup\b/.test @className
        Utils.toggleClass this, 'collapsed'
      else if @attributes.rel
        event.preventDefault()
        optionName = @attributes.rel.value
        self.doAppAction optionName
        self.controller.hideMenu()

    for option in @menuItems
      option.addEventListener 'mouseup', menuOptionListener
      option.addEventListener 'touchend', menuOptionListener
      option.addEventListener 'contextmenu', menuOptionListener

    @el.textIO = @controller.container.querySelector 'textarea'

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
    open = Utils.toggleClass @el.textIO, 'active'
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

      @el.textIO.value = helpDoc
    else
      @el.textIO.value = ''

  updateStatus: ->
    if @controller.options.showStatus
      markup = "<div class=\"settings\">"
      markup += "v#{Penciltest.prototype.state.version}"
      markup += " Smoothing: #{@controller.options.smoothing}"
      markup += "</div>"
      markup += "<div class=\"frame\">"
      markup += "#{@controller.options.frameRate} FPS"
      markup += " | (hold #{@controller.getCurrentFrame().hold})"
      markup += " | #{@controller.current.frameNumber + 1}/#{@controller.film.frames.length}"
      markup += " | #{Utils.getDecimal @controller.current.frameIndex[@controller.current.frameNumber].time, 1, String}"
      if @controller.film.audio?.offset
        markup += " #{if @controller.film.audio.offset >= 0 then '+' else ''}#{@controller.film.audio.offset}"
      markup += "</div>"
      @el.statusBar.innerHTML = markup

  showMenu: (coords = {x: 10, y: 10}) ->
    if not @menuIsVisible
      @menuIsVisible = true
      Utils.toggleClass @el.container, 'menu-visible', true
      coords.x = Math.min document.body.offsetWidth - @menuElement.offsetWidth, coords.x
      coords.y = Math.min document.body.offsetHeight - @menuElement.offsetHeight, coords.y
      @menuElement.style.left = "#{coords.x + 1}px"
      @menuElement.style.top = "#{coords.y}px"
      for option in @menuItems
        @ui.updateMenuOption option if option.attributes.rel

  hideMenu: ->
    if @menuIsVisible
      @menuIsVisible = false
      Utils.toggleClass @el.container, 'menu-visible', false

  toggleMenu: (coords) ->
    if @menuIsVisible then @hideMenu() else @showMenu coords
