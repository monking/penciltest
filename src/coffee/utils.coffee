###
global: document, window
###

Utils =

  toggleClass: (element, className) ->
    classes = element.className.split /\s+/
    classIndex = classes.indexOf className
    if classIndex > -1
      classes.splice classIndex, 1
    else
      classes.push className
    element.className = classes.join ' '
