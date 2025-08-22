import { copyFiles } from './copy-files.mjs';

// These are the only files necessary for dist-using-copy
// Currently dist-using-copy only supports embeddable.html
// By checking in the built-for-simple-copy it isn't necessary
// to run the Makefile, ruby, and node toolchain when the only
// goal is to update and test an interactive.
const fileMap = {
  'public/embeddable.html': '',
  'public/embeddable.css': '',
  'public/themes/cc-themes.css': 'themes/',
};

copyFiles('built-for-simple-copy/', fileMap);