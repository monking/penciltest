###
global: document, window
###

class Penciltest

  modes:
    DRAWING: 'drawing'
    ERASING: 'erasing'
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
    frameRate: 24
    frameHold: 2
    onionSkin: true
    smoothing: 3
    onionSkinRange: 4
    renderer: 'canvas'
    onionSkinOpacity: 0.5
    background: 'white'

  state:
    version: '0.2.4'
    mode: Penciltest.prototype.modes.DRAWING
    toolStack: ['pencil','eraser']

  # metadata generated while interpreting the film data
  current:
    frameIndex: []
    exposureIndex: []
    exposures: 0
    exposureNumber: 0
    frameNumber: 0

  constructor: (options) ->
    @state = Utils.inherit(
      @getStoredData 'app', 'state'
      Penciltest.prototype.state
    )

    @options = Utils.inherit( # set options without triggering actions
      @getStoredData 'app', 'options'
      options
      Penciltest.prototype.options
    )

    @container = document.querySelector @options.container
    @container.className = 'penciltest-app'

    @buildContainer()

    @ui = new PenciltestUI( this )
    @options.background = Penciltest.prototype.options.background # until there's a UI to change it

    @setOptions @options # do all the option actions

    @newFilm()

    if @state.version isnt Penciltest.prototype.state.version
      @state.version = PenciltestLegacy.update @, @state.version, Penciltest.prototype.state.version

    @resize()

    window.pt = @

  setOptions: (options) ->
    @options = Utils.inherit(
      options
      @options or {}
      Penciltest.prototype.state
    )

    for key, value of options
      @ui.appActions[key].action.call @ if key of @ui.appActions and @ui.appActions[key].action

  buildContainer: ->
    markup = '<div class="field-container">' +
      '<div class="field"></div>' +
    '</div>'

    @container.innerHTML = markup

    @fieldContainer = @container.querySelector '.field-container'
    @fieldElement = @container.querySelector '.field'

  newFrame: (index = null) ->
    frame =
      hold: @options.frameHold
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

    @getCurrentStroke().push @scaleCoordinates [x, y], 1 / @zoomFactor
    if @state.mode is Penciltest.prototype.modes.DRAWING
      @renderer.render()

    @clearRedo()
    @unsavedChanges = true

  track: (x,y) ->
    coords =
      x: x
      y: y

    if @state.toolStack[0] == 'eraser'
      screenPoint = [x, y]
      point = @scaleCoordinates screenPoint, 1 / @zoomFactor
      done = false
      currentFrame = @getCurrentFrame()
      screenEraseRadius = 10
      @drawCurrentFrame()
      for stroke, strokeIndex in currentFrame.strokes
        for segment in stroke
          realEraseRadius = screenEraseRadius / @zoomFactor
          if Math.abs(point[0] - segment[0]) < realEraseRadius && Math.abs(point[1] - segment[1]) < realEraseRadius
            currentFrame.strokes.splice strokeIndex, 1
            @drawCurrentFrame()
            done = true
          if done then break
        if done then break
      @renderer.rect screenPoint[0] - screenEraseRadius, screenPoint[1] - screenEraseRadius, screenEraseRadius * 2, screenEraseRadius * 2, null, 'red'

    else
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

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex) ->
    newIndex = Math.max 0, Math.min @film.frames.length - 1, newIndex

    @current.frameNumber = newIndex
    @current.frame = @film.frames[@current.frameNumber]

    if @state.mode isnt Penciltest.prototype.modes.PLAYING
      @seekAudioToFrame newIndex
    @drawCurrentFrame()

  seekAudioToFrame: (frameNumber) ->
    if @film.audio
      Utils.log(@current.frameIndex[frameNumber])
      seekTime = @current.frameIndex[frameNumber].time - @film.audio.offset
      @seekAudio seekTime

  play: ->
    self = @
    @playDirection ?= 1
    if @current.frameNumber < @film.frames.length # i.e. it is a frame in the film (in case @current.frameNumber was
      @framesHeld = 0
      @goToFrame @current.frameNumber # reset the audio position to the _beginning_ of the current frame
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
            self.seekAudioToFrame 0
          else
            self.stop()
        else
          self.goToFrame newIndex

    @stop()
    stepListener()
    @playInterval = setInterval stepListener, 1000 / @options.frameRate
    @lift()
    @state.mode = Penciltest.prototype.modes.PLAYING
    @playAudio()

  stop: ->
    @pauseAudio() if @audioElement
    clearInterval @playInterval
    if @state.mode is Penciltest.prototype.modes.PLAYING
      @state.mode = Penciltest.prototype.modes.DRAWING

  togglePlay: ->
    if @state.mode isnt Penciltest.prototype.modes.BUSY
      if @state.mode is Penciltest.prototype.modes.PLAYING then @stop() else @play()

  drawCurrentFrame: ->
    return if not @film.frames.length

    @renderer.clear()

    if @options.background
      @renderer.rect 0, 0, @width, @height, @options.background

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
    @ui.updateStatus()

  drawFrame: (frameIndex, overrides) ->
    return if !@width or !@height

    @renderer.setLineOverrides overrides if overrides

    for stroke in @film.frames[frameIndex].strokes
      @renderer.path @scaleStroke stroke, @zoomFactor

    @renderer.clearLineOverrides()

  scaleStroke: (stroke, factor) ->
    @scaleCoordinates coords, factor for coords in stroke

  scaleCoordinates: (coords, factor) ->
    newCoords = [
      coords[0] * factor
      coords[1] * factor
    ]
    newCoords.push  coords.slice 2
    newCoords

  useTool: (toolName) ->
    index = @state.toolStack.indexOf(toolName)
    if index > -1
      @state.toolStack.unshift(@state.toolStack.splice(index, 1)[0])

  cancelStroke: ->
    @markBuffer = []
    @currentStrokeIndex = null

  lift: ->
    if @markBuffer && @markBuffer.length
      last = @markBuffer.pop()
      @mark last.x, last.y
      @markBuffer = []
    @currentStrokeIndex = null
    if @state.toolStack[0] == 'eraser'
      @drawCurrentFrame()

  copyFrame: (frame = @getCurrentFrame()) ->
    if frame.strokes.length
      @copyBuffer = Utils.clone frame

  pasteFrame: ->
    if @copyBuffer
      newFrameIndex = @current.frameNumber + 1
      @film.frames.splice newFrameIndex, 0, Utils.clone(@copyBuffer)
      @buildFilmMeta()
      @goToFrame(newFrameIndex)

  pasteStrokes: ->
    if @copyBuffer
      @film.frames[@current.frameNumber].strokes = @film.frames[@current.frameNumber].strokes.concat(Utils.clone(@copyBuffer.strokes))
      @drawCurrentFrame()

  cutFrame: ->
    droppedFrame = @dropFrame()
    @copyFrame droppedFrame if droppedFrame.strokes.length

  dropFrame: ->
    droppedFrame = @getCurrentFrame()
    @film.frames.splice @current.frameNumber, 1
    @current.frameNumber-- if @current.frameNumber >= @film.frames.length and @current.frameNumber > 0
    if @film.frames.length is 0
      @newFrame()

    @buildFilmMeta()
    @drawCurrentFrame()

    droppedFrame

  smoothFrame: (index, amount) ->
    self = @
    smooth = (amount) ->
      amount = Number amount
      smoothingBackup = self.options.smoothing
      self.options.smoothing = amount
      frame = self.film.frames[index]
      oldStrokes = JSON.parse JSON.stringify frame.strokes
      self.lift()
      frame.strokes = []
      self.current.frameNumber = index
      self.renderer.clear()
      for stroke in oldStrokes
        for segment in stroke
          self.track.apply self, segment
        self.lift()

    @options.smoothing = smoothingBackup
    if amount
      Utils.prompt 'How much to smooth? 1-5', 2, smooth
    else
      smooth amount

  smoothFilm: (amount) ->
    self = @
    if @state.mode is Penciltest.prototype.modes.DRAWING
      Utils.confirm 'Would you like to smooth every frame of this film?', ->
        doTheThing = (amount) ->
          amount = Number amount
          self.state.mode = Penciltest.prototype.modes.BUSY
          lastIndex = self.film.frames.length - 1
          for frame in [0..lastIndex]
            self.smoothFrame frame, amount
          self.state.mode = Penciltest.prototype.modes.DRAWING
        if not amount
          Utils.prompt 'How much to smooth? 1-5', 2, doTheThing
        else
          doTheThing amount
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
    @ui.updateStatus()

  newFilm: ->
    @film =
      name: ''
      version: Penciltest.prototype.state.version
      aspect: '16:9'
      width: 1920
      frames: []

    @unsavedChanges = false

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
    self = @
    Utils.prompt "what will you name your film?", @film.name, (name) ->
      if name
        self.film.name = name
        self.putStoredData 'film', name, self.film
        self.unsavedChanges = false

  renderGif: ->
    self = @
    doTheThing = (gifConfigurationString) ->
      gifConfiguration = (gifConfigurationString || '512 2').split ' '
      # configure for rendering
      # dimensions = [64, 64]
      dimensions = self.getFilmDimensions()
      # while rendering is only useful at one size, save the step # dimensions = ().split 'x'
      maxGifDimension = parseInt gifConfiguration[0], 10
      gifLineWidth = parseInt gifConfiguration[1], 10
      if dimensions.width > maxGifDimension
        dimensions.width = maxGifDimension
        dimensions.height = maxGifDimension / dimensions.aspect
      else if dimensions.height > maxGifDimension
        dimensions.height = maxGifDimension
        dimensions.width = maxGifDimension * dimensions.aspect

      self.forceDimensions =
        width: dimensions.width
        height: dimensions.height
      # rebuild renderer to ensure correct resolution for capture
      self.ui.appActions.renderer.action()
      self.resize()

      oldRendererType = self.options.renderer
      self.setOptions renderer: 'canvas'
      self.ui.appActions.renderer.action()

      oldLineOverrides = self.renderer.overrides
      renderLineOverrides = 
        weight: gifLineWidth

      baseFrameDelay = 1000 / self.options.frameRate
      frameIndex = 0

      # prepare encoder
      gifEncoder = new GIFEncoder()
      # gifEncoder.setSize dimensions.width, dimensions.height # no use: uses the original dimensions of the canvas, regardless of its current size
      gifEncoder.setRepeat 0
      gifEncoder.setDelay baseFrameDelay
      gifEncoder.start()

      for frameIndex in [0...self.film.frames.length]
        self.renderer.setLineOverrides renderLineOverrides
        self.goToFrame frameIndex
        gifEncoder.setDelay baseFrameDelay * self.getCurrentFrame().hold # FIXME no good; how to set individual delays for each fram in gifEncoder?
        gifEncoder.addFrame self.renderer.context


      gifEncoder.finish()
      binaryGif = gifEncoder.stream().getData()
      dataUrl = 'data:image/gif;base64,' + encode64 binaryGif

      gifElementId = 'rendered_gif'
      gifElement = document.getElementById gifElementId
      if not gifElement
        gifElement = document.createElement 'img'
        gifElement.id = gifElementId
        gifCss =
          position: 'absolute'
          top: '50%'
          left: '50%'
          transform: 'translateX(-50%) translateY(-50%)'
          maxWidth: '80%'
          maxHeight: '80%'
        for property, value of gifCss
          gifElement.style[property] = value
        gifContainer = document.createElement 'div'
        containerCss =
          position: 'absolute'
          top: '0px'
          left: '0px'
          bottom: '0px'
          right: '0px'
          backgroundColor: 'rgba(0,0,0,0.5)'
        for property, value of containerCss
          gifContainer.style[property] = value
        gifInstructions = document.createElement 'div'
        containerCss =
          position: 'relative'
          color: 'white'
          textAlign: 'center'
          backgroundColor: 'rgba(0,0,0,0.5)'
        for property, value of containerCss
          gifInstructions.style[property] = value
        gifInstructions.innerHTML = "Right click (or touch & hold on mobile) to save.<br>Click/touch outside GIF to close."
        gifContainer.appendChild gifElement
        gifContainer.appendChild gifInstructions
        document.body.appendChild gifContainer

        gifCloseHandler = (event) ->
          if event.target isnt gifElement
            gifContainer.removeEventListener 'click', gifCloseHandler
            gifContainer.removeEventListener 'touchend', gifCloseHandler
            gifContainer.remove()

        gifContainer.addEventListener 'click', gifCloseHandler
        gifContainer.addEventListener 'touchend', gifCloseHandler

      gifElement.src = dataUrl

      # TODO 1) render each frame small in canvas
      # TODO 2) append with the corect duration to a GIF in memory
      # TODO 3) draw the GIF as a `data:` URL, prompting to right-click and save'

      # reset to user's configuration
      self.setOptions renderer: oldRendererType
      self.renderer.setLineOverrides oldLineOverrides
      self.forceDimensions = null
      self.resize()

    Utils.prompt 'GIF size & lineWidth', '512 2', doTheThing

  selectFilmName: (message, callback) ->
    filmNames = @getFilmNames()
    if filmNames.length
      message ?= 'Choose a film'
      Utils.select message, filmNames, @film.name, (selectedFilmName) ->
        if selectedFilmName
          callback selectedFilmName
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
    @ui.updateStatus()
    @unsavedChanges = false
    @resize() # FIXME

  loadFilm: ->
    self = @
    @selectFilmName 'Choose a film to load', (name) ->
      self.setFilm self.getStoredData 'film', name

  deleteFilm: ->
    self = @
    @selectFilmName 'Choose a film to DELETE...FOREVER', (filmName) ->
      window.localStorage.removeItem self.encodeStorageReference 'film', filmName

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
    @film.audio ?= {}
    @film.audio.url = audioURL
    @film.audio.offset = 0
    @unsavedChanges = true
    if not @audioElement # TODO: abstract away from browser
      @audioElement = document.createElement 'audio'
      @audioElement.preload = true
      @fieldContainer.appendChild @audioElement
    else
      @pauseAudio()
    @audioElement.src = audioURL

  destroyAudio: ->
    if @film.audio
      delete @film.audio
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
    self = @
    Utils.log 'scrubAudio', @current.frameNumber
    @seekAudioToFrame @current.frameNumber
    clearTimeout @scrubAudioTimeout
    @playAudio()
    @scrubAudioTimeout = setTimeout(
      -> self.pauseAudio()
      Math.max @getFrameDuration * 1000, 100
    )

  pan: (deltaPoint) ->
    for frame in @film.frames
      for stroke in frame.strokes
        for segment in stroke
          segment[0] += deltaPoint[0]
          segment[1] += deltaPoint[1]

  getFilmDimensions: ->
    aspect = @film.aspect or '1:1'
    aspectParts = aspect.split ':'
    dimensions = 
      width: @film.width
      aspect: aspectParts[0] / aspectParts[1]
    dimensions.height = Math.ceil dimensions.width / dimensions.aspect
    dimensions

  resize: ->
    if @forceDimensions
      containerWidth = @forceDimensions.width
      containerHeight = @forceDimensions.height
    else
      containerWidth = @container.offsetWidth
      containerHeight = @container.offsetHeight
      if @options.showStatus
        containerHeight -= 36
    filmDimensions = @getFilmDimensions()
    containerAspect = containerWidth / containerHeight

    if containerAspect > filmDimensions.aspect
      @width = Math.floor containerHeight * filmDimensions.aspect
      @height = containerHeight
    else
      @width = containerWidth
      @height = Math.floor containerWidth / filmDimensions.aspect

    @fieldContainer.style.width = "#{@width}px"
    @fieldContainer.style.height = "#{@height}px"
    @renderer.resize @width, @height
    @zoomFactor = @width / @film.width
    @renderer.options.lineWeight = @zoomFactor
    @drawCurrentFrame()
