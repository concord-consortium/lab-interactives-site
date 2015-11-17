#!/usr/bin/env node

/**
 This script goes through all the interactives, runs the shouldProcess
 and processInteractive function on each, and saves back to the original filename.

 To use this script in the future to refactor interactives, simply change
 the contents of the processInteractive function.

 To run this script
 $ cd lab-interactives-site
 $ node ./script/interactive-processor.js
 **/
require('coffee-script/register');

var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

var interactivesFolderPath = path.normalize('./src/interactives/');

function processInteractives() {
  var interactiveFiles = findInteractives(interactivesFolderPath);

  for (i = 0; i < interactiveFiles.length; i++) {
    interactivePath = path.normalize(path.join(interactivesFolderPath, interactiveFiles[i]));
    json = fs.readFileSync(interactivePath).toString();
    interactive = JSON.parse(json);

    if (shouldProcess(interactive)) {
      var newInteractive = processInteractive(interactive, interactivePath);
      if (newInteractive) {
        json = JSON.stringify(newInteractive, null, 2);
        mkdirp.sync(path.dirname(interactivePath));
        fs.writeFileSync(interactivePath, json);
      }
    }
  }
}

function findInteractives(searchPath, baseDir) {
  // Search relative to the input path if baseDir is not specified
  if (baseDir == null) baseDir = searchPath;

  var interactiveFiles = [], stat, files, i;

  // statSync follows symlinks, unlike lstatSync
  stat = fs.statSync(searchPath);

  if (stat.isFile() && path.extname(searchPath) === '.json') {
    return [path.relative(baseDir, searchPath)];
  }

  if (stat.isDirectory()) {
    files = fs.readdirSync(searchPath);
    for (i = 0; i < files.length; i++) {
      if (files[i]) {
        interactiveFiles = interactiveFiles.concat(findInteractives(path.join(searchPath, files[i]), baseDir));
      }
    }
  }

  return interactiveFiles;
}

function shouldProcess(interactive) {
  return interactive.exports != null;
}

/**
 In the future, this function can be replaced with something else
 to process interactives.
 **/
function processInteractive(interactive, interactivePath) {
  var isLoggedPropBound = {};
  interactive.exports.perRun.forEach(function (loggedProp) {
    isLoggedPropBound[loggedProp] = false;
  });
  interactive.components.forEach(function (comp) {
    if (comp.property) isLoggedPropBound[comp.property] = true;
  });
  var unboundProps = [];
  Object.keys(isLoggedPropBound).forEach(function (prop) {
    if (!isLoggedPropBound[prop]) {
      unboundProps.push(prop);
    }
  });
  if (unboundProps.length > 0) {
    interactive.logging = {
      properties: interactive.exports.perRun
    };
    // Well, code below is obviously unnecessary, but it causes that 'exports' ends up at the end of file,
    // nicely stacked next to 'logging' section.
    var exports = interactive.exports;
    delete interactive.exports;
    interactive.exports = exports;
    return interactive;
  }
  return null;
}

processInteractives();
