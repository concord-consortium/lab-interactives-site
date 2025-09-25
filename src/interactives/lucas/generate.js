const fs = require('fs');
const seedrandom = require('../../../vendor/seedrandom/seedrandom.js');

// Set a seed for the random number generator so we are consistent
Math.seedrandom("fixed seed");

// This template was taken from sun-on-co2-and-ground.json
// And then modified to be a base used by this script to generate new models
const originalModel = require('./models/wall-zoom-template.json');

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
const yPadding = 0.02;
const xPadding = 0.1;

// These control the temperature of the wall and gas
// But it is also based on the mass of the atoms and the number of atoms
const vWallMax = 0.0011;
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
function getRandomWallVelocity(vMax = vWallMax) {
  return Math.random() * (2 * vMax) - vMax;
}

function getRandomGasVelocity() {
  return Math.random() * (2 * vGasMax) - vGasMax;
}

/**
 * This supports drawing a grid of atoms. The grid has a spacing, and an offset from
 * 0 position. It is in the normal MW coordinate system where 0 is at the bottom.
 * The radius of the atom is taken into account so with a gridOffset of 0 the bottom of
 * the atom will be at 0.
 * @returns 
 */
function findYOfFirstAtomOnGrid(yGridOffset, yMin, yGridSpacing, radius) {
  // We want to adjust this so the circle's bottom edge is on the bottom if the yOffset is 0
  // This means building the radius into the offset
  yMin += radius;
  yGridOffset += radius;
  return Math.ceil((yMin - yGridOffset) / yGridSpacing) * yGridSpacing + yGridOffset;
}

function testFindOnGrid(yGridOffset, yMin, yGridSpacing, radius) {
  const result = findYOfFirstAtomOnGrid(yGridOffset, yMin, yGridSpacing, radius);
  console.log(`findYOnGrid(yGridOffset: ${yGridOffset}, yMin: ${yMin}, yGridSpacing: ${yGridSpacing}, radius: ${radius}) = ${result}`);
}

testFindOnGrid(0, 0, 1, 0.4);
testFindOnGrid(0, 0.5, 1, 0.4);
testFindOnGrid(0, 0.6, 1, 0.4);
testFindOnGrid(0, 0.61, 1, 0.4);
testFindOnGrid(0, 1, 1, 0.4);
testFindOnGrid(0.5, 0, 1, 0.4);
testFindOnGrid(0.5, 1, 1, 0.4);


const timeStepForRandomVelocity = 12; 

function generateColumnPart({model, yOffset, yStart, yEnd, x, element, vMax}) {
  // The size of the wall atoms seems to be roughly xSpacing
  const atomRadius = xSpacing / 2;
  // We add the yPadding to the yOffset so the bottom of the grid of atoms starts at yPadding.
  const firstY = findYOfFirstAtomOnGrid(yOffset + yPadding, yStart, ySpacing, atomRadius);
  for (let y = firstY; (y + atomRadius) < yEnd; y += ySpacing) {
    const vX = getRandomWallVelocity(vMax);
    const vY = getRandomWallVelocity(vMax);
    model.atoms.x.push(x + vX * timeStepForRandomVelocity);
    model.atoms.y.push(y + vY * timeStepForRandomVelocity);
    model.atoms.vx.push(vX);
    model.atoms.vy.push(vY);
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

let wallThickness = 2;

// Fudge factors to get the right number of atoms on the ceiling and floor
let floorInsidePadding = 0.1;
let ceilingInsidePadding = 0.15;
let roofPadding = 0.01;

let roofHeight = 0.5;
let leftWallInsideEdge = xPadding + originalSpacingY * wallThickness;
let floorInsideEdge = yPadding + ySpacing * wallThickness + floorInsidePadding;
let ceilingOutsideEdge = modelHeight - yPadding - roofHeight;
let ceilingInsideEdge = ceilingOutsideEdge - ySpacing * wallThickness - ceilingInsidePadding;
let rightWallInsideEdge = centerX - originalSpacingY;


function generateHouse({ model }) {
  // Generate left wall with lattice of element 3 atoms
  let column = 0;
  let xStart = xPadding;
  for (; column < wallThickness; column++, xStart += originalSpacingY) {
    let yOffset = column % 2 === 0 ? 0 : ySpacing / 2;
    generateColumnPart({
      model, 
      yOffset, 
      yStart: yPadding,
      yEnd: modelHeight - yPadding - roofHeight,
      x: xStart, 
      element: 3
    });
  }

  // Generate the roof, ceiling, and floor
  const rightEdgeOfFloorAndCeiling = centerX;  
  for (; xStart < rightEdgeOfFloorAndCeiling; column++, xStart += originalSpacingY) {
    let yOffset = column % 2 === 0 ? 0 : ySpacing / 2;

    // draw the bottom segment
    generateColumnPart({
      model, 
      yOffset,
      yStart: yPadding,
      yEnd: floorInsideEdge, 
      x: xStart, 
      element: 3
    });

    // draw the inside wall segment
    generateColumnPart({
      model, 
      yOffset,
      yStart: ceilingInsideEdge, 
      yEnd: ceilingOutsideEdge,
      x: xStart, 
      element: 3
    });
  }

  // This was discarded because it didn't behave properly
  // Add an insulating line for the top "wall"
  // model.lines = {
  //   x1: [leftWallInsideEdge],
  //   y1: [topWallInsideEdge],
  //   x2: [rightWallInsideEdge],
  //   y2: [topWallInsideEdge],
  //   beginStyle: [ "none" ],
  //   endStyle: [ "none" ],
  //   fence: [ 1 ],
  //   lineColor: [ "black" ],
  //   lineWeight: [ 1 ],
  //   lineDashes: [ "none" ],
  //   layer: [ 1 ],
  //   layerPosition: [ 1 ],
  //   // might want to make this invisible as long as it still works
  //   visible: [ 1 ]
  // }


  const rightWallFirstColumn = column;
  // We hack the outside wall so it is more insulated by spacing the columns of atoms apart
  // This lets the brick wall trap more heat in itself instead of passing it through to the air
  // inside
  const outsideWallSpacing = originalSpacingY * 1.3;
  for (; column < rightWallFirstColumn + wallThickness + 1; column++, xStart += outsideWallSpacing) {
    yOffset = column % 2 === 0 ? 0 : ySpacing / 2;
    generateColumnPart({
      model, 
      yOffset, 
      yStart: yPadding,
      yEnd: modelHeight - yPadding - roofHeight,
      x: xStart, 
      element: 1
    });
  }

  // Generate the roof
  let outsideOfOutsideWall = xStart;
  xStart = xPadding;
  for (; xStart < outsideOfOutsideWall; column++, xStart += originalSpacingY) {
    let yOffset = column % 2 === 0 ? 0 : ySpacing / 2;
    generateColumnPart({
      model, 
      yOffset, 
      yStart: modelHeight - roofHeight + roofPadding,
      yEnd: modelHeight - yPadding,
      x: xStart, 
      element: 4,
      vMax: vWallMax / 10
    });
  }
}

// This is just an approximation, we should use the element properties to figure it out for sure
const airAtomDiameter = xSpacing * 0.7;
const airAtomRadius = airAtomDiameter / 2;
function isOverlapping(model, element, x, y) {
  for (let i = 0; i < model.atoms.x.length; i++) {
    if (model.atoms.element[i] === element) {
      const dx = model.atoms.x[i] - x;
      const dy = model.atoms.y[i] - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < airAtomDiameter) {
        return true;
      }
    }
  }
  return false;
}

function generateAir({ model, xMin, xMax, yMin, yMax, numAtoms, element }) {
  // Add padding so the outside of the air atoms don't the boundaries
  xMin += airAtomRadius;
  xMax -= airAtomRadius;
  yMin += airAtomRadius;
  yMax -= airAtomRadius;

  for (let i = 0; i < numAtoms; i++) {
    // Need to make sure the new atom position doesn't overlap an existing atom
    let x, y;
    do {
      x = Math.random() * (xMax - xMin) + xMin;
      y = Math.random() * (yMax - yMin) + yMin;
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
  fs.writeFileSync(__dirname + `/models/${name}.json`, JSON.stringify(model, null, 2));
  console.log(`New model generated: ${name}.json`);
}

const glassInsideSurface = emptyModel();
glassInsideSurface.quantumDynamics.radiationlessEmissionProbability = radiationlessEmissionProbability;

generateHouse({ model: glassInsideSurface });
generateAir({
  model: glassInsideSurface,
  xMin: leftWallInsideEdge,
  xMax: rightWallInsideEdge,
  yMin: floorInsideEdge,
  yMax: ceilingInsideEdge,
  numAtoms: 100,
  element: 2
});

// Change the properties of the inside wall element to try to emulate brick
glassInsideSurface.elements.color[3] = "rgb(153, 56, 3)";
glassInsideSurface.quantumDynamics.elementEnergyLevels[3] = brickEnergyLevels();

// Change roof levels to absorb light like brick
glassInsideSurface.quantumDynamics.elementEnergyLevels[4] = brickEnergyLevels();

// Make the glass atoms look like glass
glassInsideSurface.elements.color[1] = "rgb(0, 229, 255)";
glassInsideSurface.quantumDynamics.elementEnergyLevels[1] = glassEnergyLevels();
// Write the new model to a file
writeOutModel('wall-zoom-glass', glassInsideSurface);


const brickInsideSurface = emptyModel();
brickInsideSurface.quantumDynamics.radiationlessEmissionProbability = radiationlessEmissionProbability;

generateHouse({ model: brickInsideSurface });
generateAir({
  model: brickInsideSurface,
  xMin: leftWallInsideEdge,
  xMax: rightWallInsideEdge,
  yMin: floorInsideEdge,
  yMax: ceilingInsideEdge,
  numAtoms: 100,
  element: 2
});

// Change the properties of the inside wall element to try to emulate brick
brickInsideSurface.elements.color[3] = "rgb(153, 56, 3)";
brickInsideSurface.quantumDynamics.elementEnergyLevels[3] = brickEnergyLevels();

// Change roof levels to absorb light like brick
brickInsideSurface.quantumDynamics.elementEnergyLevels[4] = brickEnergyLevels();

// Make the outside wall look like brick
brickInsideSurface.elements.color[1] = "rgb(153, 56, 3)";
brickInsideSurface.quantumDynamics.elementEnergyLevels[1] = brickEnergyLevels();

// Write the new model to a file
writeOutModel('wall-zoom-brick', brickInsideSurface);

// Make a second version of the interactive which removes the controls and hides 
// most of the walls.
const interactive = require('./wall-zoom-full.json');

interactive.models = interactive.models.map(m => {
  m.viewOptions["viewPortX"] = leftWallInsideEdge;
  m.viewOptions["viewPortY"] = floorInsideEdge;
  m.viewOptions["viewPortWidth"] = modelWidth - leftWallInsideEdge;
  m.viewOptions["viewPortHeight"] = ceilingInsideEdge - floorInsideEdge;
  // Not sure if we need to mess with the zoom
  return m;
})

interactive.components = interactive.components.filter(c => [
    "inside-air-thermometer",
    "outside-air-thermometer",
    "text-photon-key",
    "key-photon",
    "text-ke-shading-scale",
    "ke-shading-scale"
  ].includes(c.id)
);

interactive.template= [
    {
      "id": "left",
      "top": "model.top",
      "height": "model.height",
      "right": "model.left",
      "padding-right": "0.5em"
    }, 
    {
      "id": "right",
      "top": "model.top",
      "height": "model.height",
      "left": "model.right",
      "padding-left": "1em",
      "padding-right": "0.5em"
    }, 
    {
      "id": "bottom-left",
      "left": "model.left",
      "top": "model.bottom",
      "width": "model.width / 2",
      "height": "7em"
    },
    {
      "id": "bottom-right",
      "width": "model.width / 2",
      "top": "model.bottom",
      "right": "model.right",
      "height": "7em"
    },
  ]

interactive.layout = {
  left: [
    [
      "inside-air-thermometer",
    ]
  ],
  right: [
    [
      "outside-air-thermometer"
    ]
  ],
  "bottom-left": [
    [
      "text-ke-shading-scale"
    ],
    [
      "ke-shading-scale"
    ]
  ],
  "bottom-right": [
    [
      "text-photon-key"
    ],
    [
      "key-photon"
    ]
  ]
}
interactive.showTopBar = false;
interactive.showBottomBar = false;

fs.writeFileSync(__dirname + `/wall-zoom.json`, JSON.stringify(interactive, null, 2));

// Save a default brick glass version of the model to make it easier to start
// up that way
interactive.models = interactive.models.reverse();
fs.writeFileSync(__dirname + `/wall-zoom-glass.json`, JSON.stringify(interactive, null, 2));
