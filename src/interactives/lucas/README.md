# High Level

This set of interactives and models were created during a contract with the Lucas Education group. 

The main goal is for the interactive to be like a cutaway of a wall inside of another larger application. This application lets users build houses in different locations on the Earth. The users can choose walls that are glass or some opaque material. The user can then zoom into the wall to understand why they want glass or not glass. Essentially it is to briefly demonstrate the greenhouse effect that happens with glass. 

The initial interactive the user sees just shows the wall and the inside air. The outside application will adjust the sun angle and intensity. This is implemented by a more complex interactive of which we only show part of. Hopefully in the future the student will have the option to dig into the model if they are interested.

The essence of the greenhouse effect is that a house with glass will be hotter inside than a house without glass. This happens because radiant energy from the sun passes through the glass and heats up solid objects inside the house. Then inside air of the house acts as an insulator keeping these hot objects from cooling down with the outside air. There is also some effect from the glass trapping the IR that is being radiated by the hot objects. When there is no glass then the outside of the house absorbs the radiant energy and is cooled down by the outside air as well as emitting IR. 

The interactive doesn't really model the greenhouse effect properly. It currently has a house box with a separated roof to somewhat block light from hitting the top of the box. The light source is configured to emit a single wavelength of light. The glass element in the model has energy levels configured so it won't absorb this wavelength of light but it will absorb a specific IR wavelength. The brick element's energy levels are configured to absorb both the visible wavelength and the IR wavelength. The missing part is the cooling effect from the outside air. The model does cool down via IR radiation though. However we can't configure the emission properties of the elements differently so the glass and brick elements emit the same amount of IR. So if the model is run long enough both the glass and brick houses end up being the same temperature.

To improve the model we should add outside air which is held a roughly a constant temperature, this should keep the brick cooling down so all of the energy it absorbs from the sun isn't transferred to inside of the house. We did try modeling this, but we were not able to get enough energy transferred from the brick to the outside air to cause a visible difference in the temperature. Additionally all of these extra air atoms and the code to keep them at a constant temperature slowed the model down. The speed problem might have been because we were finding the outside air atoms based on their location. That could be improved by having two separate air elements so it is possible to have a fixed set of atom indices that we want to cool down. The energy transfer problem is more unknown. It would be best to make a simplified model that explores the transfer of heat from a solid wall to air. Making the wall surface "rough" might help it transfer more energy because it would reduce the number of "glancing" collisions which don't transfer much energy. Additionally, allowing at least the outside wall atoms move more (reducing the spring force that is restraining them) might allow them bounce more out than in which should transfer more energy. And finally it might help to adjust the LJ properties between the air and wall atoms. If the air is partially attracted to the wall it will be able to pick up more energy. All of these effects though require adding a flow to the air atoms. We need to get this hotter air away from the wall, just relying on diffusion of the hot atoms or their KE is supposed to be too slow. We need to experiment with this though, perhaps at the scale of Lab the "diffusion" of the KE will be enough. 

A good way to experiment with this air cooling effect is to have a wall, outside air, and a light source. If the `radiationlessEmissionProbability` is set to 1, no IR should come shooting off of the wall atoms. So the only way to prevent the model from having run away temperature is through the air cooling. The outside air needs to be cooled somehow. The temperature of air atoms could be constantly be reset to a fixed amount. This should be similar to a heat bath but it only affects one set of atoms. Another way to do it is by just setting the temperature of the wall to be higher than the air and then see how long it takes for the temperature to equalize. 

Using monochromatic is kind of OK. At the surface of the Earth most of the sun's energy is in visible light, it emits much less energy in IR and a lot of it is absorbed/filtered by the atmosphere.

# Interactive and Model generation
The models and some interactives in this folder are generated by the `generate.js` script. This was done so multiple similar models and interactives could be created and updated without having to manually keep them in sync with each other. The script also has utilities for creating walls and gases. 

# Notes

## Missing Lab Features

To model this more accurately and implement what the designers want Lab needs some new features:
- **rain-like photons** there should be a way to make the photons emitted by the light source be random like rain. This could be built into Lab, or Lab could expose a way for the interactive script to add photons itself. This would let the script add photons in any location with any direction. 
- **thermal radiation**: it'd be better if the model had a way to model IR emission and absorption that wasn't tied to energy levels of the element. This would require a per-element emissivity. It isn't clear if it should be related to the atom's KE or if that would naturally fallout since an atom with more KE is more likely to collide with other atoms which will then trigger the emission.
Currently an atom can only absorb IR if it has an energy level difference about equal to the energy of the photon. But this also means that it will emit this IR when it is bumped. This is very close to the behavior thermal radiation, but there isn't enough control of it. There has to be small energy level gaps so bumps always have a chance to emit, but these small energy level gaps cause problems described in then Non-monochromatic light section. Thermal radiation should have a similar effect of creating a maximum temperature for a set of atoms given a constant stream of photons. But this temperature equilibrium should be more controlled by the emissivity of the element instead based on the number and gap size the energy levels of the element. See the "Thermal Radiation" section for more details.
- **customized polychromatic light**: if we want to use non-monochromatic light then the light source should allow setting some probability curve for the wavelength's it emits. Or the if Lab allowed the interactive to "create" photons, the interactive could handle this wavelength distribution itself.
- **photon reflection**: some photons are just directly reflected by surfaces. Lab doesn't have a way to model this. It needs away to know the angle the photon should be reflected at, and that is based on a "surface" of atoms. Lab does have fake "walls" which can reflect atoms. One approach is to have fake "walls" that can reflect photons too. A more complex approach would be to have a way to designate a set of constrained atoms as an "object". Then lab could compute the surfaces of the object to calculate the reflection angle. And perhaps even more complex would be to model this completely from base principles. So then atoms of the surface would need to be bonded and we'd need a way for the photon to resonate with these bonded atoms in a way that would cause the photon to be instantly be re-emitted in a direction related to the outside "edge" of the bonded atoms.

## Non-monochromatic light
Initially the interactive was created with a non-monochromatic light source. Many (~30) energy levels were configured on the brick element so that it could absorb every wavelength of light. This approach didn't work because all of these energy levels were closely spaced to each other. This had two effects:
- small collisions were enough for the atoms to increase their energy level. This meant that atoms would get excited and basically be storing lots of energy in these excited states. 
- will all of these excited states and atoms it was very likely that atoms would emit IR, so then there was an IR bath through out the model. This meant the brick wall caused its inside air atoms to heat up quickly because it was basically transfering all of the energy the wall absorbed from the sun quickly inside the house (much like glass does).
- the other more confusing effect was that these small energy level gaps essentially limited the temperature of the wall. Once an atom started moving too fast it would transfer this energy into an excited state of itself or another atom. So the atoms could never move very fast.

It took some research into Lab to see that there is a "ENERGY_TOLERANCE_GAP" that allows an atom to absorb a photon even if the photon's energy doesn't exactly match the gap in the atom's energy levels.

## PLANK_CONSTANT

To convert a wavelength to a Lab element energy level an internal PLANCK_CONSTANT is needed. This value is not directly declared in the Lab code, instead it is computed 

When figuring out if a photon will be absorbed the frequency of the photon is multiplied by PLANCK_CONSTANT to get an energy level. If this amount matches the difference of moving an electron to a higher energy level, then the photon is absorbed.  

This is done with the following code is from Lab:
```js
  PLANCK_CONSTANT = constants.convert(0.2, {
    from: constants.unit.EV,
    to: constants.unit.MW_ENERGY_UNIT
  }),

  // MW uses a "tolerance band" to decide if a photon's energy matches an energy level gap.
  // Reference: https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/PhotonicExcitor.java#L28
  ENERGY_GAP_TOLERANCE = constants.convert(0.05, {
    from: constants.unit.EV,
    to: constants.unit.MW_ENERGY_UNIT
  }),

  EV: {
    name: "electron volt",
    value: KILOGRAMS_PER_DALTON *
      METERS_PER_NANOMETER * METERS_PER_NANOMETER *
      (1 / SECONDS_PER_FEMTOSECOND) * (1 / SECONDS_PER_FEMTOSECOND) *
      (1 / JOULES_PER_EV),
    type: types.ENERGY
  },

  MW_ENERGY_UNIT: {
    name: "MW Energy Unit (Dalton * nm^2 / fs^2)",
    value: 1,
    type: types.ENERGY
  },
```

This code and its dependencies was copied to the `scripts/units` folder so it could be used to compute the actual PLANK_CONSTANT value: 
`PLANCK_CONSTANT = 0.000019297059992532557`

The tolerance gap is about 1/4 of the PLANK_CONSTANT.

## Changing the KE of a set of atoms

Here an example of changing the the KE of all of the atoms by iterating over them:
`interactives/building-models/latent-heat-PE-KE.json`

There is a script function `atomsWithinRect` which gets all of the atoms within a rect. and it can also take an argument with an element id like: `atomsWithinRect(0,0,get('width'),get('height'),0)`.

There is another function: `atomsKe(...)` which returns the KE of a set of atoms. 

There are also api methods `getTemperatureOfAtoms` and `setTemperatureOfAtoms`. 

The "Conduction Between Two Solids" interactive has an example of do all of this to change the temperature of some atoms.

Example of model level heating. Same approach can be used to cool atoms. 
```
        "setComponentDisabled('start-heating', true);",
        "callEvery(200, function() {",
        "  if (get('experimentRunning')) {",
        "    var numAtoms, i, props, newVx, newVy, ratio, vXConstant, vYConstant;",
        "    batch(function(){",
        "      numAtoms = getNumberOfAtoms()",
        "      for(i=0; i<numAtoms; i++){",
        "        // The idea here is to add the same amount of KE to every atom, and to keep",
        "        // the direction of the velocity the same",
        "        props = getAtomProperties(i);",
        "        ratio = props.vx*props.vx/(props.vy*props.vy);",
        "        vXConstant = 0.000000002*ratio/(1+ratio);",
        "        vYConstant = 0.000000002 - vXConstant;",
        "        if(props.vx >= 0) newVx =  Math.sqrt(vXConstant+props.vx*props.vx);",
        "        if(props.vx < 0) newVx = - Math.sqrt(vXConstant+props.vx*props.vx);",
        "        if(props.vy >= 0) newVy =  Math.sqrt(vYConstant+props.vy*props.vy);",
        "        if(props.vy < 0) newVy = - Math.sqrt(vYConstant+props.vy*props.vy);",
        "        setAtomProperties(i, {vx:newVx, vy:newVy});",
        "      }",
        "    });",
        "    var runningTime = get('time') - get('timeExperimentStarted');",
        "    set('experimentTime', runningTime);",
        "    if (runningTime > 150000) stop();",
        "  }",
        "});"
```

## Thermal radiation
In metals, free electrons dominate the response → they radiate differently (more reflective, less emissive).

In insulators like brick, electrons are bound, so vibrations of the lattice and local bonds dominate the IR emission.

Lattice vibration happen around ~10¹²–10¹³ Hz → wavelengths of a few to tens of microns (mid to far IR).

Metal: Very low emissivity in the visible and near-IR (that’s why metals look shiny). It gradually rises in the far-IR where the free electrons can’t keep up with the slow oscillations, so emission improves.

Insulator: High emissivity almost everywhere in the IR (close to a perfect radiator), but with distinct dips/peaks around certain wavelengths. Those features are tied to phonon resonance bands in the lattice.

So if we are modeling this generally, we'd look at the free electrons in a structure to determine its emissivity. MW could compute that since it figures out bonding of different elements. However I don't know if it has any concept of treating a structure generally like this. That would be needed for reflection too.

A very simple approach might be to just give a element some amount of emissivity and it always emits IR. It would do this randomly as it vibrates. We could do this during collisions (I don't know if that is an event). Or perhaps to be more accurate we could look at the motion over time to identify the oscillation frequency and then use that with a function for each element. 
