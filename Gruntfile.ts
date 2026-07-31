// interface GruntTypescript {
//   base: {
//     src: [];
//     dest: string;
//     options: {
//       module: "amd" | "commonjs";
//       target: "es5" | "es3";
//       sourceMap: boolean;
//       declaration: boolean;
//     }
//   }
// }

// interface GruntCoffee {
//   options: { bare: boolean; };
//   expand: boolean;
//   cwd: string; 
//   src: string;
//   dest: string;
//   ext: string;
// }

interface GruntSass {
  options: {
    sassDir: string;
    imagesDir: string;
    cssDir: string;
    environment: string;
    outputStyle: string;
    config: string;
    force: boolean;
  };
}

interface Grunt {
  loadNpmTasks: any;
  initConfig: (
    arg0: {
      pkg: any;
      //coffee: {
      //  compile: GruntCoffee;
      //};
      compass: {
        compile: GruntSass;
      };
      concat: any;
      watch: any;
    }
  ) => void;

  file: { readJSON: (arg0: string) => any; };

  registerTask: (arg0: string, arg1: {}) => any;
} 

export default function(grunt: Grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    typescript: {
      base: {
        src: ['src/**/*.ts'],
        dest: 'dist',
        options: {
          module: 'amd', //or commonjs
          target: 'es2018', //or es3
          sourceMap: true,
          declaration: true
        }
      }
    },

    //coffee: {
    //  compile: {
    //    options: {
    //      bare: true
    //    },
    //    expand : true,
    //    cwd    : 'src/coffee',
    //    src    : '**/*.coffee',
    //    dest   : 'dist',
    //    ext    : '.js',
    //  }
    //},

    compass: {
      compile: {
        options: {
          sassDir     : 'style',
          imagesDir   : 'public/img',
          cssDir      : 'public/css',
          environment : 'production',
          outputStyle : 'expanded',
          config      : 'style/config.rb',
          force       : true
        }
      }
    },

    concat: {
      dist: {
        files: {
          'public/js/penciltest.js':[
            'src/vendor/*.js',
            'dist/utils.js',
            'dist/penciltest-ui-component.js',
            'dist/renderer-interface.js',
            'dist/*-renderer.js',
            'dist/penciltest-ui.js',
            'dist/penciltest.js',
            'dist/penciltest-legacy.js'
          ],
          'public/js/app.js':[
            'dist/app.js'
          ]
        }
      }
    },

    watch: {
      ts: {
        files: ['src/**/*.ts'],
        tasks: ['typescript', 'concat']
      }
      // coffee: {
      //   files: ['src/coffee/**/*.coffee'],
      //   tasks: ['coffee', 'concat']
      // }
      // ,styles: {
      //   files: ['style/**/*.{sass,scss}'],
      //   tasks: ['compass'],
      // }
    }
    });

  // // Disabling compass (for now) because rubygem dependencies are not building on sandbox - CL (2018-04-15T16:15:52Z)
  return grunt.registerTask('default', ['typescript', /*'compass',*/ 'concat']);

};
