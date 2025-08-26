const fs = require('fs');
const seedrandom = require('../../../../../../../vendor/seedrandom/seedrandom.js');

// Set a seed for the random number generator so we are consistent
Math.seedrandom("fixed seed");

// This template was taken from sun-on-co2-and-ground.json
// And then modified to be a base used by this script to generate new models
const originalModel = require('./greenhouse-effect-template.json');

// Create a new model with one atom of each element
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

// Calculate the center x-coordinate
const centerX = originalModel.width / 2;
const ySpacing = 0.15714468676331222;
const xSpacing = 0.1360912908067766;
const yPadding = 0.15;
const xPadding = 0.15;

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

function generateColumn(startY, x) {
  for (let y = startY; y <= originalModel.height; y += ySpacing) {
    newModel.atoms.x.push(x);
    newModel.atoms.y.push(y);
    newModel.atoms.vx.push(getRandomWallVelocity());
    newModel.atoms.vy.push(getRandomWallVelocity());
    newModel.atoms.charge.push(0);
    newModel.atoms.friction.push(0);
    newModel.atoms.element.push(1);
    newModel.atoms.pinned.push(0);
    newModel.atoms.draggableWhenStopped.push(0);
    newModel.atoms.excitation.push(0);
  
    // Add restraints for each atom
    newModel.restraints.atomIndex.push(newModel.atoms.x.length - 1);
    newModel.restraints.k.push(1000);
    newModel.restraints.x0.push(x);
    newModel.restraints.y0.push(y);
  }      
}

function generateWall() {
  // Generate a lattice of element 1 atoms
  generateColumn(yPadding, centerX);
  generateColumn(yPadding + (ySpacing/2), centerX + originalSpacingY);
  generateColumn(yPadding, centerX + originalSpacingY*2);
  generateColumn(yPadding + (ySpacing/2), centerX + originalSpacingY*3);
}

function generateInsideGas() {
  const gasXMin = xPadding;
  const gasXMax = centerX - originalSpacingY;
  const gasYMin = yPadding;
  const gasYMax = originalModel.height - yPadding;

  // Add gas on the left
  for (let i = 0; i < 20; i++) {
    newModel.atoms.x.push(Math.random() * (gasXMax - gasXMin));
    newModel.atoms.y.push(Math.random() * (gasYMax - gasYMin));
    newModel.atoms.vx.push(getRandomGasVelocity());
    newModel.atoms.vy.push(getRandomGasVelocity());
    newModel.atoms.charge.push(0);
    newModel.atoms.friction.push(0);
    newModel.atoms.element.push(2);
    newModel.atoms.pinned.push(0);
    newModel.atoms.draggableWhenStopped.push(0);
    newModel.atoms.excitation.push(0);
  }
}

generateWall();
generateInsideGas();

newModel.elements.color[1] = "rgb(0, 229, 255)";

// Write the new model to a file
fs.writeFileSync(__dirname + '/greenhouse-effect-glass.json', JSON.stringify(newModel, null, 2));
console.log('New model generated: greenhouse-effect-glass.json');

const baseEnergyLevel = newModel.quantumDynamics.elementEnergyLevels[1][0];
// This is MW's special constant for converting between frequency and energy units
const PLANCK_CONSTANT = 0.000019297059992532557;

// Need to figure out the energy gap in frequency. So energy = freq * PLANCK_CONSTANT 
// We need to absorb frequencies from 2.5 to 14.5
const minFreq = 2.5;
const maxFreq = 14.5;
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
  energyDifference += PLANCK_CONSTANT / 2.1;
}

// Change the properties of the wall element to try to emulate brick
newModel.elements.color[1] = "rgb(153, 56, 3)";
newModel.quantumDynamics.elementEnergyLevels[1] = energyLevels;
newModel.quantumDynamics.radiationlessEmissionProbability = 0.9; // 0 to 1, 1 means it will always convert to heat
// Write the new model to a file
fs.writeFileSync(__dirname + '/greenhouse-effect-brick.json', JSON.stringify(newModel, null, 2));

console.log('New model generated: greenhouse-effect-brick.json');
