const fs = require('fs');
const seedrandom = require('../../../../../../../vendor/seedrandom/seedrandom.js');

// Set a seed for the random number generator so we are consistent
Math.seedrandom("fixed seed");

// This template was taken from sun-on-co2-and-ground.json
// And then modified to be a base used by this script to generate new models
const originalModel = require('./greenhouse-effect-template.json');

const modelWidth = 6;
const modelHeight = 4;

const radiationlessEmissionProbability = 0.90; // 0 to 1, 1 means it will always convert to heat

function emptyModel() {
  const newModel = JSON.parse(JSON.stringify(originalModel));

  // Clear existing atoms
  newModel.atoms.x = [];
  newModel.atoms.y = [];
  newModel.atoms.vx = [];
  newModel.atoms.vy = [];
  newModel.atoms.charge = [];
  newModel.atoms.friction = [];
  newModel.atoms.element = [];
  newModel.atoms.pinned = [];
  newModel.atoms.draggableWhenStopped = [];
  newModel.atoms.excitation = [];

  // Clear existing restraints
  newModel.restraints.atomIndex = [];
  newModel.restraints.k = [];
  newModel.restraints.x0 = [];
  newModel.restraints.y0 = [];

  // Adjust the width and height
  newModel.width = modelWidth;
  newModel.height = modelHeight;
  newModel.viewOptions.viewPortWidth = modelWidth;
  newModel.viewOptions.viewPortHeight = modelHeight;
  // Adjust the sun position
  newModel.viewOptions.images[0].imageX = modelWidth - 0.7;
  newModel.viewOptions.images[0].imageY = modelHeight + 0.5;

  newModel.quantumDynamics.radiationlessEmissionProbability = radiationlessEmissionProbability;
  newModel.quantumDynamics.lightSource.monochromatic = true;
  newModel.quantumDynamics.lightSource.frequency = lightFrequency; // This is in the middle of the visible spectrum
  return newModel;
}

// Calculate the center x-coordinate
const centerX = modelWidth / 2;
const ySpacing = 0.15714468676331222;
const xSpacing = 0.1360912908067766;
const yPadding = 0.1;
const xPadding = 0.1;

// These control the temperature of the wall and gas
// But it is also based on the mass of the atoms and the number of atoms
const vWallMax = 0.0001;
const vGasMax = 0.0003;

// Calculate the spacing based on the original model
// for now we are just looking at the x spacing
const originalSpacingX = originalModel.atoms.x[1] - originalModel.atoms.x[0];
const originalSpacingY = originalModel.atoms.y[0] - originalModel.atoms.y[30];
console.log({originalSpacingX, originalSpacingY});

// Calculate the range of vx and vy for element 1
const element1Indices = originalModel.atoms.element.reduce((indices, element, index) => {
  if (element === 1) indices.push(index);
  return indices;
}, []);

const vxValues = element1Indices.map(index => originalModel.atoms.vx[index]);
const vyValues = element1Indices.map(index => originalModel.atoms.vy[index]);

const vxRange = { min: Math.min(...vxValues), max: Math.max(...vxValues) };
const vyRange = { min: Math.min(...vyValues), max: Math.max(...vyValues) };

console.log('Element 1 vx range:', vxRange);
console.log('Element 1 vy range:', vyRange);

// Function to generate a random vx value
function getRandomWallVelocity() {
  return Math.random() * (2 * vWallMax) - vWallMax;
}

function getRandomGasVelocity() {
  return Math.random() * (2 * vGasMax) - vGasMax;
}

function generateColumn(model, startY, x, element) {
  for (let y = startY; y <= modelHeight - originalSpacingY/2; y += ySpacing) {
    model.atoms.x.push(x);
    model.atoms.y.push(y);
    model.atoms.vx.push(getRandomWallVelocity());
    model.atoms.vy.push(getRandomWallVelocity());
    model.atoms.charge.push(0);
    model.atoms.friction.push(0);
    model.atoms.element.push(element);
    model.atoms.pinned.push(0);
    model.atoms.draggableWhenStopped.push(0);
    model.atoms.excitation.push(0);

    // Add restraints for each atom
    model.restraints.atomIndex.push(model.atoms.x.length - 1);
    model.restraints.k.push(1000);
    model.restraints.x0.push(x);
    model.restraints.y0.push(y);
  }
}

function generateWall({ model, startX, element }) {
  console.log("addingWall", { element, startX, endX: startX + originalSpacingY * 3 })
  // Generate a lattice of element 1 atoms
  generateColumn(model, yPadding, startX, element);
  generateColumn(model, yPadding + (ySpacing/2), startX + originalSpacingY, element);
  generateColumn(model, yPadding, startX + originalSpacingY*2, element);
  generateColumn(model, yPadding + (ySpacing/2), startX + originalSpacingY*3, element);
}

const gasMinDistance = originalSpacingX / 2
function isOverlapping(model, element, x, y) {
  for (let i = 0; i < model.atoms.x.length; i++) {
    if (model.atoms.element[i] === element) {
      const dx = model.atoms.x[i] - x;
      const dy = model.atoms.y[i] - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < gasMinDistance) {
        return true;
      }
    }
  }
  return false;
}

const numGasAtoms = 200;
function generateAir({ model, xMin, xMax, element }) {
  const gasYMin = yPadding;
  const gasYMax = modelHeight - yPadding;

  // Add gas on the left
  for (let i = 0; i < numGasAtoms; i++) {
    // Need to make sure the new atom position doesn't overlap an existing atom
    let x, y;
    do {
      x = Math.random() * (xMax - xMin) + xMin;
      y = Math.random() * (gasYMax - gasYMin) + gasYMin;
    } while (isOverlapping(model, element, x, y));
    model.atoms.x.push(x);
    model.atoms.y.push(y);
    model.atoms.vx.push(getRandomGasVelocity());
    model.atoms.vy.push(getRandomGasVelocity());
    model.atoms.charge.push(0);
    model.atoms.friction.push(0);
    model.atoms.element.push(element);
    model.atoms.pinned.push(0);
    model.atoms.draggableWhenStopped.push(0);
    model.atoms.excitation.push(0);
  }
}

// This is MW's special constant for converting between frequency and energy units
const PLANCK_CONSTANT = 0.000019297059992532557;
// MD2D compares the energy of the incoming photon with a tolerance of about PLANCK_CONSTANT / 4
// in either direction. So if we space the energy levels by a little less than PLANCK_CONSTANT / 2, 
// we should be able to absorb all frequencies.
const energyGap = PLANCK_CONSTANT / 2.01;
const minFreqEmitted = energyGap / PLANCK_CONSTANT;
const mwMinFreq = 2.5;
const maxIRFreq = mwMinFreq + 2;
const mwMaxFreq = 14.5;

/**
 * This uses the energyLevel of element 1 of the original one, and adds energy levels
 * to cover every possible photon frequency. Because the absorption code includes a
 * tolerance gap, this is finite number of energy levels.
 * @returns 
 */
function absorbingEnergyLevels(minFreq, maxFreq) {
  const baseEnergyLevel = originalModel.quantumDynamics.elementEnergyLevels[1][0];

  // Need to figure out the energy gap in frequency. So energy = freq * PLANCK_CONSTANT 
  // We need to absorb frequencies from 2.5 to 14.5
  const minEnergy = minFreq * PLANCK_CONSTANT;
  const maxEnergy = maxFreq * PLANCK_CONSTANT;

  // NOTE: we might need to optimize this so there are not so many energy levels
  // Also if the brick atom has already absorbed a photon it will not absorb another until
  // it has emitted or converted that energy to heat. If the wall is multiple atoms thick
  // this won't matter because the photon will pass through the first atom and then be absorbed
  // by the next one. But if is a problem, we might need to add extra energy levels.
  let energyDifference = minEnergy;
  let currentLevel = 0;
  const energyLevels = [baseEnergyLevel];
  while (energyDifference < maxEnergy) {
    energyLevels.push(baseEnergyLevel + energyDifference);
    // MD2D compares the energy of the incoming photon with a tolerance of about PLANCK_CONSTANT / 4
    // in either direction. So if we space the energy levels by a little less than PLANCK_CONSTANT / 2, 
    // we should be able to absorb all frequencies.
    energyDifference += energyGap;
  }

  return energyLevels;
}

const modelIRFreq = mwMinFreq + 0.4;
const lightFrequency = modelIRFreq * 2;
const modelIREnergy = modelIRFreq * PLANCK_CONSTANT;

function brickEnergyLevels() {
  const baseEnergyLevel = originalModel.quantumDynamics.elementEnergyLevels[1][0];

  return [
    baseEnergyLevel,
    baseEnergyLevel + modelIREnergy,
    baseEnergyLevel + modelIREnergy * 2
  ]
}

function glassEnergyLevels() {
  const baseEnergyLevel = originalModel.quantumDynamics.elementEnergyLevels[1][0];

  return [
    baseEnergyLevel,
    baseEnergyLevel + modelIREnergy
  ]
}

function writeOutModel(name, model) {
  fs.writeFileSync(__dirname + `/${name}.json`, JSON.stringify(model, null, 2));
  console.log(`New model generated: ${name}.json`);
}

const glassNoInsideSurface = emptyModel();
glassNoInsideSurface.quantumDynamics.radiationlessEmissionProbability = radiationlessEmissionProbability;

generateWall({
  model: glassNoInsideSurface,
  startX: centerX,
  element: 1
});
generateAir({
  model: glassNoInsideSurface, 
  xMin: xPadding, 
  xMax: centerX - originalSpacingY,
  element: 2
});

glassNoInsideSurface.elements.color[1] = "rgb(0, 229, 255)";
glassNoInsideSurface.quantumDynamics.elementEnergyLevels[1] = glassEnergyLevels();

// Write the new model to a file
writeOutModel('greenhouse-effect-glass', glassNoInsideSurface);

// Change the properties of the outside wall element to try to emulate brick
const brickNoInsideSurface = JSON.parse(JSON.stringify(glassNoInsideSurface));
brickNoInsideSurface.elements.color[1] = "rgb(153, 56, 3)";
brickNoInsideSurface.quantumDynamics.elementEnergyLevels[1] = brickEnergyLevels();

// Write the new model to a file
writeOutModel('greenhouse-effect-brick', brickNoInsideSurface);

const glassInsideSurface = emptyModel();
glassInsideSurface.quantumDynamics.radiationlessEmissionProbability = radiationlessEmissionProbability;

generateWall({
  model: glassInsideSurface,
  startX: xPadding,
  element: 3
});
const wallWidth = originalSpacingY * 4;
generateAir({
  model: glassInsideSurface,
  xMin: xPadding + wallWidth,
  xMax: centerX - originalSpacingY,
  element: 2
});
generateWall({
  model: glassInsideSurface,
  startX: centerX,
  element: 1
});
generateAir({
  model: glassInsideSurface,
  xMin: centerX + wallWidth,
  xMax: modelWidth,
  element: 2
});
// Change the properties of the inside wall element to try to emulate brick
glassInsideSurface.elements.color[3] = "rgb(153, 56, 3)";
glassInsideSurface.quantumDynamics.elementEnergyLevels[3] = brickEnergyLevels();

// Make the glass atoms look like glass
glassInsideSurface.elements.color[1] = "rgb(0, 229, 255)";
glassInsideSurface.quantumDynamics.elementEnergyLevels[1] = glassEnergyLevels();
// Write the new model to a file
writeOutModel('greenhouse-effect-glass-inside', glassInsideSurface);

// Change the properties of the outside wall element to try to emulate brick
const brickInsideSurface = JSON.parse(JSON.stringify(glassInsideSurface));
brickInsideSurface.elements.color[1] = "rgb(153, 56, 3)";
brickInsideSurface.quantumDynamics.elementEnergyLevels[1] = brickEnergyLevels();

// Write the new model to a file
writeOutModel('greenhouse-effect-brick-inside', brickInsideSurface);
