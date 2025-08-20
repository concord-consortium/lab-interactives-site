const fs = require('fs');
const seedrandom = require('../../../../../../../vendor/seedrandom/seedrandom.js');

// Set a seed for the random number generator so we are consistent
Math.seedrandom("fixed seed");

// Read the existing JSON file
const originalModel = require('./sun-on-co2-and-ground.json');

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
const vMax = 0.0001;

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
function getRandomVelocity() {
  return Math.random() * (2 * vMax) - vMax;
}

function generateColumn(startY, x) {
    for (let y = startY; y <= originalModel.height; y += ySpacing) {
        newModel.atoms.x.push(x);
        newModel.atoms.y.push(y);
        // Note: We might want to just use the original vx and vy values so this is consistent
        // or maybe use a seed so that it is always the same
        newModel.atoms.vx.push(getRandomVelocity());
        newModel.atoms.vy.push(getRandomVelocity());
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
// Generate a lattice of element 1 atoms
generateColumn(yPadding, centerX);
generateColumn(yPadding + (ySpacing/2), centerX + originalSpacingY);

// Write the new model to a file
fs.writeFileSync(__dirname + '/greenhouse-effect.json', JSON.stringify(newModel, null, 2));

console.log('New model generated: greenhouse-effect.json');
