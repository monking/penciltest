module.exports = (grunt) ->

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      compile:
        options:
          bare: true
        expand : true
        cwd    : 'src/coffee'
        src    : '**/*.coffee'
        dest   : 'src'
        ext    : '.js'

    # compass:
    #   compile:
    #     options:
    #       sassDir     : 'style'
    #       imagesDir   : 'public/img'
    #       cssDir      : 'public/css'
    #       environment : 'production'
    #       outputStyle : 'expanded'
    #       config      : 'style/config.rb'
    #       force       : true

    concat:
      dist:
        files:
          'public/js/penciltest.js':[
            'src/vendor/*.js'
            'src/utils.js'
            'src/penciltest-ui-component.js'
            'src/renderer-interface.js'
            'src/*-renderer.js'
            'src/penciltest-ui.js'
            'src/penciltest.js'
            'src/penciltest-legacy.js'
          ]
          'public/js/app.js':[
            'src/app.js'
          ]

    watch:
      coffee:
        files: ['src/coffee/**/*.coffee']
        tasks: ['coffee', 'concat']

      # styles:
      #   files: ['style/**/*.{sass,scss}']
      #   tasks: ['compass']

  grunt.registerTask 'default', ['coffee', 'concat']
