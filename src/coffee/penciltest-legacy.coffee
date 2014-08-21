PenciltestLegacy =

  index: [
    '0.0.3'
    '0.0.4'
    '0.0.5'
  ]

  workers:
    '0.0.3': null
    '0.0.4': ->
      # change strokes from Raphael SVG format to simple arrays
      filmNamePattern = /^film:/
      for storageName of window.localStorage
        if filmNamePattern.test storageName
          film = JSON.parse window.localStorage.getItem storageName
          if not film or not film.frames or not film.frames.length then continue

          for frame, frameIndex in film.frames
            for stroke, strokeIndex in frame.strokes
              for segment, segmentIndex in stroke
                if typeof segment is 'string'
                  newSegment = segment.replace(/[ML]/g, '').split(' ')
                  if newSegment.length isnt 2
                    throw new Error "bad stroke segment '#{segment}': #{storageName}:f#{frameIndex}:p#{strokeIndex}:s#{segmentIndex}"
                  if isNaN newSegment[0] or isNaN newSegment[1]
                    throw new Error "NaN stroke segment '#{segment}':  #{storageName}:f#{frameIndex}:p#{strokeIndex}:s#{segmentIndex}"
                  newSegment[i] = Number newSegment[i] for i in [0...newSegment.length]
                  film.frames[frameIndex].strokes[strokeIndex][segmentIndex] = newSegment

          film.version = '0.0.4'
          window.localStorage.setItem storageName, JSON.stringify film
    '0.0.5': ->
      # enable scaling, assuming 16:9, 720 width for undefined
      filmNamePattern = /^film:/
      for storageName of window.localStorage
        if filmNamePattern.test storageName
          film = JSON.parse window.localStorage.getItem storageName
          if not film or not film.frames or not film.frames.length then continue

          film.aspect ?= '16:9'
          film.width ?= 720
          film.version = '0.0.5'
          window.localStorage.setItem storageName, JSON.stringify film

  update: (pt, from, to) ->
    at  = from
    fromIndex = @index.indexOf from
    if fromIndex isnt -1 and fromIndex < @index.length - 1
      confirmMessage = "You last used v#{from}. Currently v#{to}. Update your saved films to the new format now?"
      if Utils.confirm confirmMessage
        try
          for i in [(fromIndex + 1)...@index.length]
            version = @index[i]
            @workers[version]?.call pt
            at = version
        catch error
          Utils.log error
          Utils.alert "The conversion from #{at} to #{version} failed. Your data is still compatible with #{at}"

    return at
