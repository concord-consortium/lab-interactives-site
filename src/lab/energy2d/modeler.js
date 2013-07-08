/*global define: false, d3: false */

define(function (require) {
  'use strict';
  var alert           = require('common/alert'),
      console         = require('common/console'),
      validator       = require('common/validator'),
      LabModelerMixin = require('common/lab-modeler-mixin'),
      metadata        = require('energy2d/metadata'),
      coremodel       = require('energy2d/models/core-model'),
      Part            = require('energy2d/models/part').Part,

      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s"
          },
          temperature: {
            name: "degree Celsius",
            pluralName: "degrees Celsius",
            symbol: "°C"
          },
          length: {
            name: "meter",
            pluralName: "meters",
            symbol: "m"
          },
          velocity: {
            name: "meter per second",
            pluralName: "meters per second",
            symbol: "m/s"
          }
        }
      };

  return function Modeler(initialProperties) {
    var model,
        coreModel,

        labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          unitsDefinition: unitsDefinition,
          initialProperties: initialProperties,
          setters: {
            use_WebGL: function (v) {
              if (coreModel) {
                setWebGLEnabled(v);
              }
              ticksToGPUSync = model.properties.ticksPerGPUSync;
            },
            ticksPerGPUSync: function (v) {
              if (coreModel) syncGPU();
              ticksToGPUSync = Number(v); // support "Infinity" value
            }
          }
        }),
        propertySupport = labModelerMixin.propertySupport,
        dispatch = labModelerMixin.dispatchSupport,

        ticksToGPUSync = 0,

        // Sensors are modeler-level objects, they only define outputs
        // and have nothing to do with physics calculations.
        sensors = [],

        cache = {};

    function setWebGLEnabled(v) {
      try {
        coreModel.useWebGL(v);
      } catch (e) {
        console.warn("WebGL initialization failed. CPU solvers and rendering will be used.");
        console.warn(e.message);
      }
    }

    function syncGPU() {
      // In theory we should also call:
      // coreModel.syncVelocity();
      // However velocity array isn't used by any CPU-only visualization
      // (velocity arrows can be rendered using WebGL) and it isn't exposed
      // to the Scripting API. So for now there is no need to sync it.
      coreModel.syncTemperature();
    }

    function hasDiverged() {
      var t = model.getTemperatureArray(),
          i, len;

      for (i = 0, len = t.length; i < len; i++) {
        if (isNaN(t[i]) || Math.abs(t[i]) > 1e10) {
          model.stop();
          coreModel.reset();
          return true;
        }
      }
      return false;
    }

    function createSensors(sensorsSpec) {
      var sensorValue = {
            thermometer: function () {
              return model.getTemperatureAt(this.x, this.y);
            },
            anemometer: function () {
              return model.getSpeedAt(this.x, this.y) * (model.getVorticityAt(this.x, this.y) < 0 ? -1 : 1);
            }
          },
          sensorOutputDesc = {
            thermometer: {
              label: "Temperature",
              unitType: 'temperature',
              format: '.1f'
            },
            anemometer: {
              label: "Fluid Speed x Vorticity Signum",
              format: '.1f'
            }
          };

      sensors = [];
      sensorsSpec.forEach(function (s, idx) {
        s = validator.validateCompleteness(metadata.sensor, s);
        Object.defineProperty(s, "value", {
          enumerable: true,
          get: sensorValue[s.type]
        });
        sensors.push(s);

        model.defineOutput("sensor-" + idx, sensorOutputDesc[s.type], function() {
          return s.value;
        });
      });
    }

    model = {
      tick: function () {
        var i, len, diverged;
        for (i = 0, len = model.properties.timeStepsPerTick; i < len; i++) {
          coreModel.nextStep();
        }
        if (coreModel.isWebGLActive()) {
          if (ticksToGPUSync > 0) {
            ticksToGPUSync--;
          } else {
            syncGPU();
            ticksToGPUSync = Number(model.properties.ticksPerGPUSync); // support "Infinity" value
            diverged = hasDiverged();
          }
        } else {
          diverged = hasDiverged();
        }
        model.updateAllOutputProperties();
        dispatch.tick();

        if (diverged) {
          alert("The model has diverged and has been reset!\n\nTry changing its parameters " +
                "(e.g. 'timeStep', positions of parts etc.) or reload it to restore the initial configuration.");
        }
      },

      syncTemperature: function () {
        propertySupport.invalidatingChangePreHook();
        coreModel.syncTemperature();
        propertySupport.invalidatingChangePostHook();
      },
      syncVelocity: function () {
        propertySupport.invalidatingChangePreHook();
        coreModel.syncVelocity();
        propertySupport.invalidatingChangePostHook();
      },

      addPart: function (props) {
        var WebGLOrg = model.properties.use_WebGL,
            part;

        // This will update CPU array.
        model.properties.use_WebGL = false;

        props = validator.validateCompleteness(metadata.part, props);
        part = new Part(props);

        propertySupport.invalidatingChangePreHook();

        coreModel.addPart(part);
        cache.parts = null;

        propertySupport.invalidatingChangePostHook();

        // Restore original WebGL option value. It will
        // copy CPU arrays to GPU in case of need.
        model.properties.use_WebGL = WebGLOrg;
        dispatch.partsChanged();
      },

      removePart: function (i) {
        var WebGLOrg = model.properties.use_WebGL;

        // This will update CPU array.
        model.properties.use_WebGL = false;

        propertySupport.invalidatingChangePreHook();

        coreModel.removePart(i);

        propertySupport.invalidatingChangePostHook();

        // Restore original WebGL option value. It will
        // copy CPU arrays to GPU in case of need.
        model.properties.use_WebGL = WebGLOrg;
        dispatch.partsChanged();
      },

      getTime: function () {
        return model.properties.timeStep * coreModel.getIndexOfStep();
      },
      isWebGLActive: function () {
        return coreModel.isWebGLActive();
      },
      isWebGLCompatible: function() {
        return coreModel.isWebGLCompatible();
      },
      getWebGLError: function () {
        return coreModel.getWebGLError();
      },
      getIndexOfStep: function () {
        return coreModel.getIndexOfStep();
      },
      getTemperatureAt: function (x, y) {
        return coreModel.getTemperatureAt(x, y);
      },
      getAverageTemperatureAt: function (x, y) {
        return coreModel.getAverageTemperatureAt(x, y);
      },
      getVorticityAt: function (x, y) {
        return coreModel.getVorticityAt(x, y);
      },
      getAverageVorticityAt: function (x, y) {
        return coreModel.getAverageVorticityAt(x, y);
      },
      getSpeedAt: function (x, y) {
        return coreModel.getSpeedAt(x, y);
      },
      getTemperatureArray: function () {
        return coreModel.getTemperatureArray();
      },
      getTemperatureTexture: function () {
        return coreModel.getTemperatureTexture();
      },
      getUVelocityArray: function () {
        return coreModel.getUVelocityArray();
      },
      getVVelocityArray: function () {
        return coreModel.getVVelocityArray();
      },
      getVelocityTexture: function () {
        return coreModel.getVelocityTexture();
      },
      getPhotonsArray: function () {
        return coreModel.getPhotonsArray();
      },

      getPartsArray: (function () {
        function PartWrapper(rawPart) {
          Object.defineProperty(this, '_rawPart', {
            enumerable: false,
            get: function () {
              return rawPart;
            }
          });
        }
        Object.keys(metadata.part).forEach(function (key) {
          Object.defineProperty(PartWrapper.prototype, key, {
            enumerable: true,
            get: function () {
              return this._rawPart[key];
            },
            set: function (v) {
              var WebGLOrg = model.properties.use_WebGL;
              // This will update CPU array.
              model.properties.use_WebGL = false;

              propertySupport.invalidatingChangePreHook();

              // Update raw part object.
              this._rawPart[key] = validator.validateSingleProperty(metadata.part[key], key, v);
              // Update core model arrays based on part's properties.
              coreModel.partsChanged(this._rawPart, key);

              propertySupport.invalidatingChangePostHook();

              // Restore original WebGL option value. It will
              // copy CPU arrays to GPU in case of need.
              model.properties.use_WebGL = WebGLOrg;
              dispatch.partsChanged();
            }
          });
        });
        PartWrapper.prototype.computeLabel = function() {
          return this._rawPart.getLabel();
        };

        return function () {
          if (!cache.parts) {
            var rawParts = coreModel.getPartsArray(),
                result = [],
                i, len;
            for (i = 0, len = rawParts.length; i < len; i++) {
              result.push(new PartWrapper(rawParts[i]));
            }
            cache.parts = result;
          }
          return cache.parts;
        };
      }()),

      getSensorsArray: (function () {
        function SensorWrapper(rawObj) {
          Object.defineProperty(this, '_rawObj', {
            enumerable: false,
            get: function () {
              return rawObj;
            }
          });
        }
        var constraint = {
          x: function (v) { return Math.max(0, Math.min(model.properties.model_width, v)); },
          y: function (v) { return Math.max(0, Math.min(model.properties.model_height, v)); }
        };
        Object.keys(metadata.sensor).forEach(function (key) {
          Object.defineProperty(SensorWrapper.prototype, key, {
            enumerable: true,
            get: function () {
              return this._rawObj[key];
            },
            set: function (v) {
              propertySupport.invalidatingChangePreHook();
              v = constraint[key] ? constraint[key](v) : v;
              this._rawObj[key] = validator.validateSingleProperty(metadata.sensor[key], key, v);
              propertySupport.invalidatingChangePostHook();
              dispatch.thermometersChanged();
            }
          });
        });

        return function () {
          if (!cache.sensors) {
            var result = [],
                i, len;
            for (i = 0, len = sensors.length; i < len; i++) {
              result.push(new SensorWrapper(sensors[i]));
            }
            cache.sensors = result;
          }
          return cache.sensors;
        };
      }()),

      setPerformanceTools: function () {
        return coreModel.setPerformanceTools();
      }
    };

    (function () {
      labModelerMixin.mixInto(model);
      dispatch.addEventTypes("tick", "partsChanged", "thermometersChanged");

      coreModel = coremodel.makeCoreModel(model.properties);
      setWebGLEnabled(model.properties.use_WebGL);

      if (initialProperties.sensors) {
        createSensors(initialProperties.sensors);
      }

      // Temporal workaround. In fact width and height should
      // be outputs based on min / max.
      model.defineOutput('minX', {}, function() {
        return 0;
      });
      model.defineOutput('minY', {}, function() {
        return 0;
      });
      model.defineOutput('maxX', {}, function() {
        return model.properties.model_width;
      });
      model.defineOutput('maxY', {}, function() {
        return model.properties.model_height;
      });

      model.defineOutput('time', {
        label: "Time",
        unitType: 'time',
        format: '.2f'
      }, function() {
        return model.getTime();
      });

      model.defineOutput('displayTime', {
        label: "Time"
      }, (function() {
        var f = d3.format("02d");
        return function() {
          var time = model.getTime(),
              seconds, minutes, hours, days;
          time = Math.floor(time);
          seconds = time % 60;
          time = Math.floor(time / 60);
          minutes = time % 60;
          time = Math.floor(time / 60);
          hours = time % 24;
          time = Math.floor(time / 24);
          days = time;
          return days + ':' + f(hours) + ':' + f(minutes)  + ':' + f(seconds);
        };
      }()));
    }());

    return model;
  };
});
