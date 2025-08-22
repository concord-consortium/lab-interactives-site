import { copyFiles } from './copy-files.mjs';


const fileMap = {
  // These files the files that need the Makefile build system to create them.
  // They are checked into the repository, so developers and CI don't need to 
  // rebuild the setup just to update and test an interactive.
  'built-for-simple-copy/embeddable.html': '',
  'built-for-simple-copy/embeddable.css': '',
  'built-for-simple-copy/themes/cc-themes.css': 'themes/',

  // These require their git submodules to be updated
  'vendor/modernizr/modernizr.js': 'vendor/modernizr/',
  'vendor/shutterbug.js/dist/shutterbug.js': 'vendor/shutterbug/',

  // These are just direct copies from the source directory
  'src/embeddable.js': '',
  'src/interactives/': 'interactives/',
  'src/models-converted/': 'models-converted/',
  'src/models/': 'models/',
  'src/locales/': 'locales/',
};

copyFiles('dist-using-copy/', fileMap);