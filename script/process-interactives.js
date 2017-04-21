#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const klawSync = require('klaw-sync');

const groups = require('../src/interactives/groups.json');

const mainDir = path.join(__dirname, '..');
const publicPath = path.join(mainDir, 'public');
const interactivesPath = path.join(mainDir, 'src/interactives');

function stringCompare(s1, s2) {
  return (s1 > s2) - (s1 < s2);
}

const interactives = [];

const interactiveFiles = klawSync(interactivesPath, {nodir: true, ignore: 'groups.json'})
  .map(file => file.path)
  .filter(path => path.endsWith('.json'));

interactiveFiles.forEach(file => {
  const interactive = require(file);
  if (interactive.redirect) return;

  const relativePath = file.replace(interactivesPath, '').substr(1);

  const meta = {
    title: interactive.title,
    path: 'interactives/' + relativePath,
    groupKey: path.dirname(relativePath),
    subtitle: interactive.subtitle || "",
    about: interactive.about || "",
    publicationStatus: interactive.publicationStatus || "draft",
    labEnvironment: interactive.labEnvironment || "production",
    category: interactive.category || "",
    subCategory: interactive.subCategory || "",
    screenshot: interactive.screenshot || "",
  };
  if (interactive.aspectRatio) {
    meta.aspectRatio = interactive.aspectRatio
  }

  interactives.push(meta);
});

interactives.sort((a, b) => {
  return stringCompare(a.groupKey, b.groupKey) || stringCompare(a.path, b.path);
});

const finalJSON = JSON.stringify({
  interactives,
  groups
}, null, 2);

fs.writeFileSync(path.join(publicPath, 'interactives.json'), finalJSON);
