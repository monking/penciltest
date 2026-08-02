module.exports = (grunt) => {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      dist: {
        files: {
          'public/js/penciltest.js':[
            "dist/structure.js",
            "dist/utils.js",
            "dist/penciltest-ui-component.js",
            "dist/renderer-base.js",
            "dist/renderer-canvas.js",
            "dist/renderer-svg.js",
            "dist/penciltest-versions.js",
            "dist/penciltest-menu.js",
            "dist/penciltest-timeline.js",
            "dist/penciltest-ui.js",
            "dist/vendor/GIFEncoder.js",
            "dist/vendor/raphael.js",
            "dist/penciltest.js",
          ],
          'public/js/app.js':[
            'dist/app.js'
          ]
        }
      }
    }

  });

  return grunt.registerTask('default', ['concat']);

};
