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
    frameRate: 12
    frameHold: 2
    onionSkin: true
    smoothing: 1
    onionSkinRange: 4
    renderer: 'canvas'
    onionSkinOpacity: 0.5
    background: 'white'

  state:
    version: '0.2.12'
    mode: Penciltest.prototype.modes.DRAWING
    toolStack: ['pencil','eraser']

  # metadata generated while interpreting the scene data
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

    @newScene()

    if @state.version isnt Penciltest.prototype.state.version
      @state.version = PenciltestLegacy.update @, @state.version, Penciltest.prototype.state.version

    @resize()

    window.pt = @

  setOptions: (newOptions) ->
    @options = Utils.inherit(
      newOptions
      @options or {}
      Penciltest.prototype.state
    )

    for key, value of newOptions
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
      index = @scene.frames.length

    @lift()
    @scene.frames.splice index, 0, frame
    @buildSceneMeta()

  getCurrentFrame: ->
    @scene.frames[@current.frameNumber]

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
      if not @currentStrokeIndex?
        @markPoint = coords
        @markBuffer = []

      @markBuffer.push coords

      # TODO  Mark multiple points per @options.smoothing
      @markPoint.x = (@markPoint.x * @options.smoothing + x) / (@options.smoothing + 1)
      @markPoint.y = (@markPoint.y * @options.smoothing + y) / (@options.smoothing + 1)

      # TODO  Use previous mark for velocity, to interpolate `smoothing`×
      if @markBuffer.length > @state.smoothDrawInterval
        @markBuffer = []

      @mark @markPoint.x, @markPoint.y

  updateCurrentFrame: (segment) ->
    @drawCurrentFrame()

  goToFrame: (newIndex) ->
    if @options.loop
      newIndex = (newIndex + @scene.frames.length) % @scene.frames.length
    else
      newIndex = Math.max 0, Math.min @scene.frames.length - 1, newIndex

    @current.frameNumber = newIndex
    @current.frame = @scene.frames[@current.frameNumber]

    if @state.mode isnt Penciltest.prototype.modes.PLAYING
      @seekAudioToFrame newIndex
    @drawCurrentFrame()

  seekAudioToFrame: (frameNumber) ->
    if @scene.audio
      Utils.log(@current.frameIndex[frameNumber])
      seekTime = @current.frameIndex[frameNumber].time - @scene.audio.offset
      @seekAudio seekTime

  play: ->
    self = @
    @playDirection ?= 1
    if @current.frameNumber < @scene.frames.length # i.e. it is a frame in the scene (in case @current.frameNumber was
      @framesHeld = 0
      @goToFrame @current.frameNumber # reset the audio position to the _beginning_ of the current frame
    else
      @framesHeld = -1
      @goToFrame 0

    stepListener = (firstStep) ->
      self.framesHeld++
      currentFrame = self.getCurrentFrame()
      newIndex = self.current.frameNumber + self.playDirection
      if self.framesHeld >= currentFrame.hold || ( firstStep && newIndex == self.scene.frames.length )
        self.framesHeld = 0
        if newIndex >= self.scene.frames.length or newIndex < 0
          if self.options.loop || firstStep
            newIndex = (newIndex + self.scene.frames.length) % self.scene.frames.length
            self.goToFrame newIndex
            self.seekAudioToFrame 0
          else
            self.stop()
        else
          self.goToFrame newIndex

    @stop()
    stepListener(true)
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
    return if not @scene.frames.length

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
        if @current.frameNumber < @scene.frames.length - i
          @drawFrame(
            @current.frameNumber + i
            {
              color: [0, 255, 255],
              opacity: Math.pow @options.onionSkinOpacity, i
            }
          )
    @drawFrame @current.frameNumber
    @ui.updateStatus()

  drawFrame: (frameIndex, overrides) ->
    return if !@width or !@height

    @renderer.setLineOverrides overrides if overrides

    for stroke in @scene.frames[frameIndex].strokes
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
      @scene.frames.splice newFrameIndex, 0, Utils.clone(@copyBuffer)
      @buildSceneMeta()
      @goToFrame(newFrameIndex)

  pasteStrokes: ->
    if @copyBuffer
      @scene.frames[@current.frameNumber].strokes = @scene.frames[@current.frameNumber].strokes.concat(Utils.clone(@copyBuffer.strokes))
      @drawCurrentFrame()

  clearStrokes: ->
    @scene.frames[@current.frameNumber].strokes = []
    @drawCurrentFrame()

  cutFrame: ->
    droppedFrame = @dropFrame()
    @copyFrame droppedFrame if droppedFrame.strokes.length

  dropFrame: ->
    droppedFrame = @getCurrentFrame()
    @scene.frames.splice @current.frameNumber, 1
    @current.frameNumber-- if @current.frameNumber >= @scene.frames.length and @current.frameNumber > 0
    if @scene.frames.length is 0
      @newFrame()

    @buildSceneMeta()
    @drawCurrentFrame()

    droppedFrame

  smoothFrame: (index, amount) ->
    self = @
    smooth = (amount) ->
      amount = Number amount
      smoothingBackup = self.options.smoothing
      self.options.smoothing = amount
      frame = self.scene.frames[index]
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

  smoothScene: (amount) ->
    self = @
    if @state.mode is Penciltest.prototype.modes.DRAWING
      Utils.confirm 'Would you like to smooth every frame of this scene?', ->
        doTheThing = (amount) ->
          amount = Number amount
          self.state.mode = Penciltest.prototype.modes.BUSY
          lastIndex = self.scene.frames.length - 1
          for frame in [0..lastIndex]
            self.smoothFrame frame, amount
          self.state.mode = Penciltest.prototype.modes.DRAWING
        if not amount
          Utils.prompt 'How much to smooth? 1-5', 2, doTheThing
        else
          doTheThing amount
    else
      Utils.log 'Unable to alter scene while playing'

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
    @buildSceneMeta()
    @ui.updateStatus()

  newScene: ->
    now = new Date()
    nowString = now.toISOString()
    @scene =
      name: ''
      dateModified: nowString
      dateCreated: nowString
      instrument:
        name: 'io.lovejoy.penciltest'
        version: Penciltest.prototype.state.version
      aspect: '1:1'
      width: 1024
      frames: []

    @scene.dateModified = @scene.dateCreated

    @unsavedChanges = false

    @newFrame()
    @goToFrame 0

  getSceneNames: ->
    sceneNamePattern = /^scene:/
    sceneNames = []
    for storageName of window.localStorage
      reference = @decodeStorageReference storageName
      if reference and reference.namespace is 'scene'
        sceneNames.push reference.name
    sceneNames

  encodeStorageReference: (namespace, name) ->
    "#{namespace}:#{name}"

  decodeStorageReference: (encoded) ->
    if match = encoded.match /^(app|scene):(.*)/
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

  saveScene: ->
    self = @
    Utils.prompt "what will you name your scene?", @scene.name, (name) ->
      if name
        self.scene.name = name
        self.scene.dateModified = (new Date()).toISOString()
        self.putStoredData 'scene', name, self.scene
        self.unsavedChanges = false

  renderGif: ->
    self = @
    doTheThing = (gifConfigurationString) ->
      gifConfiguration = (gifConfigurationString || '512 2').split ' '
      # configure for rendering
      # dimensions = [64, 64]
      dimensions = self.getSceneDimensions()
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

      for frameIndex in [0...self.scene.frames.length]
        self.renderer.setLineOverrides renderLineOverrides
        self.goToFrame frameIndex
        gifEncoder.setDelay baseFrameDelay * self.getCurrentFrame().hold # FIXME no good; how to set individual delays for each fram in gifEncoder?
        gifEncoder.addFrame self.renderer.context


      gifEncoder.finish()
      blobUrl = URL.createObjectURL(new Blob([new Uint8Array(gifEncoder.stream().bin).buffer], { type: "image/gif" }))

      gifElementId = 'rendered_gif'
      gifElement = document.getElementById gifElementId
      gifLinkId = 'rendered_gif_link'
      gifLink = document.getElementById gifLinkId
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
        Object.assign gifElement.style, gifCss
        gifContainer = document.createElement 'div'
        containerCss =
          position: 'absolute'
          top: '0px'
          left: '0px'
          bottom: '0px'
          right: '0px'
          backgroundColor: 'rgba(0,0,0,0.5)'
        Object.assign gifContainer.style, containerCss
        gifInstructions = document.createElement 'div'
        containerCss =
          position: 'relative'
          color: 'white'
          textAlign: 'center'
          backgroundColor: 'rgba(0,0,0,0.5)'
        Object.assign gifInstructions.style, containerCss
        gifLink = document.createElement 'a'
        gifInstructions.innerHTML = "Click/touch image to download.<br>Click/touch outside GIF to close."
        gifLink.appendChild gifElement
        gifContainer.appendChild gifLink
        gifContainer.appendChild gifInstructions
        document.body.appendChild gifContainer

        gifCloseHandler = (event) ->
          if event.target isnt gifElement || ( event.type = 'keydown' && event.key == 'escape' )
            gifContainer.removeEventListener 'click', gifCloseHandler
            gifContainer.removeEventListener 'touchend', gifCloseHandler
            document.body.removeEventListener 'keydown', gifCloseHandler
            gifContainer.remove()

        gifContainer.addEventListener 'click', gifCloseHandler
        gifContainer.addEventListener 'touchend', gifCloseHandler
        document.body.addEventListener 'keydown', gifCloseHandler

      gifElement.src = blobUrl
      gifLink.href = blobUrl
      gifLink.download = (self.scene.name || 'untitled')+'.penciltest.gif'

      # TODO 1) render each frame small in canvas
      # TODO 2) append with the corect duration to a GIF in memory
      # TODO 3) draw the GIF as a `data:` URL, prompting to right-click and save'

      # reset to user's configuration
      self.setOptions renderer: oldRendererType
      self.renderer.setLineOverrides oldLineOverrides
      self.forceDimensions = null
      self.resize()

    gifSize = Math.min 512, self.scene.width
    lineWeight = 1
    Utils.prompt 'GIF size & line weight (px)', gifSize+' '+lineWeight, doTheThing

  selectSceneName: (message, callback) ->
    sceneNames = @getSceneNames()
    if sceneNames.length
      message ?= 'Choose a scene'
      Utils.select message, sceneNames, @scene.name, (selectedSceneName) ->
        if selectedSceneName
          callback selectedSceneName
        else
          Utils.alert "No scene by that name."
    else
      Utils.alert "You don't have any saved scenes yet."

    false

  setScene: (scene) ->
    @scene = scene
    @buildSceneMeta()
    if @scene.audio and @scene.audio.url
      @loadAudio @scene.audio.url
    else
      @destroyAudio()
    @goToFrame 0
    @ui.updateStatus()
    @unsavedChanges = false
    @resize() # FIXME

  loadScene: ->
    self = @
    @selectSceneName 'Choose a scene to load', (name) ->
      self.setScene self.getStoredData 'scene', name

  deleteScene: ->
    self = @
    @selectSceneName 'Choose a scene to DELETE...FOREVER', (sceneName) ->
      window.localStorage.removeItem self.encodeStorageReference 'scene', sceneName

  buildSceneMeta: ->
    @current.frameIndex = []
    @current.exposureIndex = []
    @current.exposures = 0

    for i in [0...@scene.frames.length]
      frame = @scene.frames[i]
      frameMeta =
        id: i
        exposure: @current.exposures
        duration: frame.hold * @singleFrameDuration
        time: @current.exposures * @singleFrameDuration
      @current.frameIndex.push frameMeta
      @current.exposureIndex.push frameMeta for [1...frame.hold]
      @current.exposures += @scene.frames[i].hold

    @current.duration = @current.exposures * @singleFrameDuration

  getFrameDuration: (frameNumber = @current.frameNumber) ->
    frame = @scene.frames[frameNumber]
    frame.hold / @options.frameRate

  loadAudio: (audioURL) ->
    @scene.audio ?= {}
    @scene.audio.url = audioURL
    @scene.audio.offset = 0
    @unsavedChanges = true
    if not @audioElement # TODO: abstract away from browser
      @audioElement = document.createElement 'audio'
      @audioElement.preload = true
      @fieldContainer.appendChild @audioElement
    else
      @pauseAudio()
    @audioElement.src = audioURL

  destroyAudio: ->
    if @scene.audio
      delete @scene.audio
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
    for frame in @scene.frames
      for stroke in frame.strokes
        for segment in stroke
          segment[0] += deltaPoint[0]
          segment[1] += deltaPoint[1]

  getSceneDimensions: ->
    aspect = @scene.aspect or '1:1'
    aspectParts = aspect.split ':'
    dimensions = 
      width: @scene.width
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
    sceneDimensions = @getSceneDimensions()
    containerAspect = containerWidth / containerHeight

    if containerAspect > sceneDimensions.aspect
      @width = Math.floor containerHeight * sceneDimensions.aspect
      @height = containerHeight
    else
      @width = containerWidth
      @height = Math.floor containerWidth / sceneDimensions.aspect

    @fieldContainer.style.width = "#{@width}px"
    @fieldContainer.style.height = "#{@height}px"
    @renderer.resize @width, @height
    @zoomFactor = @width / @scene.width
    @renderer.options.lineWeight = @zoomFactor
    @drawCurrentFrame()
