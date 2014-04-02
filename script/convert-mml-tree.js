#!/usr/bin/env node

require('coffee-script/register');

// This assumes that lab repo is in a sibling directory of lab-interactives-site
// Could define an environment variable LAB_REPO_DIRECTORY if desired
var parseMML = require('../../lab/src/helpers/md2d/md2d-node-api').parseMML;
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var sys = require('sys');

/**
   Recursively collects all mml files in a directory.

   @param searchPath The path to search. May be a directory or regular file.
   @param baseDir    Base directory name relative to which all paths will be normalized.

   if baseDir is null, assumes 'searchPath' is the baseDir

   @returns Array of mml file paths found starting at searchPath, named relative to baseDir.
*/
function collectAllMMLFiles(searchPath, baseDir) {
  // Search relative to the input path if baseDir is not specified
  if (baseDir == null) baseDir = searchPath;

  var mmlFiles = [];
  // statSync follows symlinks, unlike lstatSync
  var stat = fs.statSync(searchPath);
  var files, i;

  if (stat.isFile() && path.extname(searchPath) === '.mml') {
    return [path.relative(baseDir, searchPath)];
  }

  if (stat.isDirectory()) {
    files = fs.readdirSync(searchPath);
    for (i=0; i<files.length; i++) {
      if (files[i]) {
        mmlFiles = mmlFiles.concat( collectAllMMLFiles(path.join(searchPath, files[i]), baseDir) );
      }
    }
  }

  return mmlFiles;
}


/**
  Converts one MML file, assuming a directory tree approach.

  @param inputBaseDir  name of root of the directory tree where mml files are found
  @param mmlPath       path to mml file to convert, relative to inputBaseDir
  @param outputBaseDir root of directory tree to which mml files are to be put
  @param onlyOutdated  if true, check mtimes: conversion proceeds only if the output file is not
                          older than the input file. Default is false.

  Reads .mml file at path inputBaseDir/mmlPath
  Writes .json file at outputBaseDir/mmlPath (with '.json' substituted for '.mml')

  @returns true if a conversion was made, false otherwise
  @throws Error if the input file could not be found, or could not be converted.
*/
function convertMMLFile(inputBaseDir, mmlPath, outputBaseDir, onlyOutdated, verbose) {
  var inputPath  = path.normalize( path.join(inputBaseDir, mmlPath) );
  var outputPath = path.normalize( path.join(outputBaseDir, mmlPath) ).replace(/mml$/, 'json');
  var inputMtime, outputMtime, mml, conversion;

  if ( !fs.existsSync(inputPath) ) {
    throw new Error("convertMMLFile: could not find input file \"" + inputPath + "\"");
  }

  // check existence and mtimes
  if (onlyOutdated) {
    if (fs.existsSync(outputPath)) {
      inputMtime  = fs.statSync(inputPath).mtime;
      outputMtime = fs.statSync(outputPath).mtime;

      if (inputMtime.getTime() < outputMtime.getTime()) {
        return false;
      }
    }
  }

  // if we got this far, convert the mml file
  if (verbose) {
    sys.puts(inputPath);
  }

  mml = fs.readFileSync(inputPath).toString();
  conversion = parseMML(mml);

  if ( conversion.error ) {
    throw new Error("convertMMLFile: could not convert input file \"" + inputPath + "\"; error = " + conversion.error);
  }

  // and write the ouptut
  if (verbose) {
    sys.puts(outputPath + "\n");
  }

  mkdirp.sync( path.dirname(outputPath) );
  fs.writeFileSync(outputPath, JSON.stringify(conversion.json, null, 2) );
  return true;
}

/**
  Batch converts the entire legacy MML folder.

  @param inputBaseDir
    base folder to be walked to find MML files. Set this to the base of the MML folder tree.

  @param outputBaseDir
    base folder in which to put output JSON files. The tree rooted at inputFolderBase will be
    reproduced, rooted at outputFolderBase and with MML files converted to JSON files.

  @param onlyOutdated
    Whether to only convert outdated MML files, or convert them all

  @param showProgress
    Whether to print a '.' as each group of 10 files are processed

  @param verbose
    optional: display input and out filenames as they are being processed

    example: imports/legacy-mw-content/conversion-and-physics-examples/

  @returns The number of files converted.
*/
function convertMMLFolder(inputBaseDir, outputBaseDir, onlyOutdated, showProgress, verbose) {
  var mmlFiles = collectAllMMLFiles(inputBaseDir);
  var nConverted = 0;

  if (verbose) {
    sys.puts("\n");
  }

  mmlFiles.forEach(function(mmlFile) {
    var converted = convertMMLFile(inputBaseDir, mmlFile, outputBaseDir, onlyOutdated, verbose);
    if (converted) {
      nConverted++;
      if (!verbose) {
        if (showProgress && nConverted > 0 && nConverted % 10 === 0) sys.print('.');
      }
    }
  });

  sys.puts("\n");

  return nConverted;
}

var rootPath = require.main ? path.dirname(require.main.filename) : process.cwd();
var inputBaseDir = path.normalize(rootPath + '/../imports/legacy-mw-content/');
var outputBaseDir = path.normalize(rootPath + '/../src/models-converted/lab-version/1/md2d/');

convertMMLFolder(inputBaseDir, outputBaseDir, false, true, false);
