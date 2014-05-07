###
global: document, window
###

Utils =

  toggleClass: (element, className, presence = null) ->
    classes = element.className.split /\s+/
    classIndex = classes.indexOf className
    if classIndex > -1 and presence isnt true
      classes.splice classIndex, 1
    else if presence isnt false
      classes.push className
    element.className = classes.join ' '

  log: ->
    # window.location.hash = arguments[0].toString()
    console.log arguments[0]

  alert: ->
    window.alert arguments[0]

  confirm: ->
    window.confirm arguments[0]

  prompt: ->
    window.prompt arguments[0], arguments[1]

  keyCodeNames:
    8   : 'BACKSPACE'
    32  : 'SPACE'
    37  : 'LEFT'
    38  : 'UP'
    39  : 'RIGHT'
    40  : 'DOWN'
    48  : '0'
    49  : '1'
    50  : '2'
    51  : '3'
    52  : '4'
    53  : '5'
    54  : '6'
    55  : '7'
    56  : '8'
    57  : '9'
    78  : 'n'
    79  : 'o'
    83  : 's'
    187 : '='
    189 : '-'

  shiftKeyCodeNames:
    48  : ')'
    49  : '!'
    50  : '@'
    51  : '#'
    52  : '$'
    53  : '%'
    54  : '^'
    55  : '&'
    56  : '*'
    57  : '('
    79  : ')'
    187 : '+'
    189 : '_'

Utils.keyCodes = {}
Utils.keyCodes[code] = name for name, code of Utils.keyCodeNames

Utils.shiftKeyCodes = {}
Utils.shiftKeyCodes[code] = name for name, code of Utils.shiftKeyCodeNames
