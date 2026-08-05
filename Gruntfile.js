module.exports = (grunt) => {

  const sass = require('sass');
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    sass: {
      options: {
        implementation: sass,
        sourceMap: true
      },
      dist: {
        files: {
          'public/css/screen.css': 'style/screen.scss',
          'public/css/bare_page.css': 'style/bare_page.scss'
        }
      }
    },

    concat: {
      dist: {
        files: {
          'public/js/penciltest.js':[
            "dist/structure.js",
            "dist/utils.js",
            "dist/penciltest-scene.js",
            "dist/penciltest-versions.js",
            "dist/penciltest-ui-component.js",
            "dist/renderer-base.js",
            "dist/renderer-canvas.js",
            "dist/renderer-svg.js",
            "dist/penciltest-ui.js",
            "dist/vendor/GIFEncoder.js",
            "dist/penciltest-render-exporter.js",
            "dist/penciltest.js",
          ],
          'public/js/app.js':[
            "dist/locale/en-US.locale.js",
            "dist/penciltest-localization.js",
            'dist/app.js'
          ]
        }
      }
    }

  });

  return grunt.registerTask('default', ['sass', 'concat']);

};
