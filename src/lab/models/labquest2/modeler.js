/*global define: false */

define(function(require) {

  var LabModelerMixin      = require('common/lab-modeler-mixin'),
      PropertyDescription  = require('common/property-description'),
      metadata             = require('./metadata'),
      // TODO
      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s"
          }
        }
      },
      // TODO
      sensorDefinitions,
      BasicDialog          = require('common/controllers/basic-dialog'),
      ExportController     = require('common/controllers/export-controller');

  // TODO move to view
  function simpleAlert(message, buttons) {
    var dialog = new BasicDialog({
          width: "60%",
          buttons: buttons
        });

    dialog.setContent(message);
    dialog.open();
  }

  var defaultSensorReadingDescription = {
      label: "Sensor Reading",
      unitAbbreviation: "-",
      format: '.2f',
      min: 0,
      max: 1
    };

  return function Model(initialProperties) {
    var labModelerMixin,
        propertySupport,
        dispatch,
        isStopped = true,
        needsReload = false,
        time,
        rawSensorValue,
        stepCounter,
        didCollectData,
        isTaring,
        isSensorTareable,
        initialTareValue,
        model;

    function updatePropertyRange(property, min, max) {
      var descriptionHash;
      var description;

      descriptionHash = model.getPropertyDescription(property).getHash();
      descriptionHash.min = min;
      descriptionHash.max = max;

      description = new PropertyDescription(unitsDefinition, descriptionHash);
      propertySupport.setPropertyDescription(property, description);
    }

    function initializeStateVariables() {
      stepCounter = 0;
      time = 0;
      rawSensorValue = undefined;
      didCollectData = false;
      isSensorTareable = false;
      isTaring = false;
    }

    function setSensorReadingDescription() {
      // var description = new PropertyDescription(unitsDefinition, {
      //       label: sensorDefinition.measurementName,
      //       unitType: measurementType,
      //       min: sensorDefinition.minReading,
      //       max: sensorDefinition.maxReading
      //     });

      // propertySupport.setPropertyDescription('sensorReading', description);
    }

    model = {

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      connect: function() {
      },

      start: function() {
      },

      stop: function() {
      },

      tare: function() {
      },

      willReset: function() {
        dispatch.willReset();
      },

      reset: function() {
      },

      reload: function() {
        model.stop();
        model.makeInvalidatingChange(function() {
          needsReload = true;
        });
      },

      isStopped: function() {
        return isStopped;
      },

      stepCounter: function() {
        return stepCounter;
      },

      serialize: function () { return ""; }
    };

    initializeStateVariables();

    labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      setters: {},
      unitsDefinition: unitsDefinition,
      initialProperties: initialProperties,
      usePlaybackSupport: false
    });

    labModelerMixin.mixInto(model);
    propertySupport = labModelerMixin.propertySupport;
    dispatch = labModelerMixin.dispatchSupport;
    dispatch.addEventTypes("tick", "play", "stop", "tickStart", "tickEnd");

    initialTareValue = model.properties.tareValue;

    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('displayTime', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('sensorReading', defaultSensorReadingDescription, function() {
      if (rawSensorValue == null) {
        return rawSensorValue;
      }
      return rawSensorValue - model.properties.tareValue;
    });

    model.defineOutput('sensorName', {
      label: "Sensor Name"
    }, function() {
      // TODO
    });

    model.defineOutput('isStopped', {
      label: "Stopped?"
    }, function() {
      return isStopped;
    });

    // TODO. We need a way to make "model-writable" read only properties.
    model.defineOutput('isPlayable', {
      label: "Startable?"
    }, function() {
      // TODO
    });

    model.defineOutput('hasPlayed', {
      label: "Has successfully collected data?"
    }, function() {
      return didCollectData;
    });

    model.defineOutput('canTare', {
      label: "Can set a tare value?"
    }, function() {
      return isStopped && !didCollectData && isSensorTareable && !isTaring;
    });

    model.defineOutput('needsReload', {
      label: "Needs Reload?"
    }, function() {
      return needsReload;
    });

    // Clean up state before we go
    // TODO
    model.on('willReset.model', function() {});

    return model;
  };
});
