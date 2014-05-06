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
