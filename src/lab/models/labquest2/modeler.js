/*global define: false */

define(function(require) {

  var LabModelerMixin      = require('common/lab-modeler-mixin'),
      PropertyDescription  = require('common/property-description'),
      metadata             = require('./metadata'),
      StateMachine         = require('common/state-machine'),
      labquest2Interface   = require('labquest2-interface'),
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
      ExportController     = require('common/controllers/export-controller'),
      _ = require('underscore');

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
        timeColumn,
        dataColumn,
        stateMachine,
        isStopped,
        needsReload,
        time,
        rawSensorValue,
        stepCounter,
        isPlayable,
        didCollectData,
        canTare,
        isSensorTareable,
        initialTareValue,
        message,
        model;

    function setSensorReadingDescription() {
      // var description = new PropertyDescription(unitsDefinition, {
      //       label: sensorDefinition.measurementName,
      //       unitType: measurementType,
      //       min: sensorDefinition.minReading,
      //       max: sensorDefinition.maxReading
      //     });

      // propertySupport.setPropertyDescription('sensorReading', description);
    }

    function initializeStateVariables() {
      stepCounter = 0;
      time = 0;
      rawSensorValue = undefined;
      didCollectData = false;
      isSensorTareable = false;
    }

    function setColumn() {
      var dataset = labquest2Interface.datasets[0];
      var newDataColumn;

      timeColumn = _.find(dataset.columns, function(column) {
        return column.units === 's';
      });

      newDataColumn = _.find(dataset.columns, function(column) {
        return column.units !== 's';
      });

      if (dataColumn !== newDataColumn) {
        dataColumn = newDataColumn;
        setSensorReadingDescription();
      }
    }

    function handleData() {
      if (!timeColumn || !dataColumn) {
        return;
      }

      var numberOfValues = Math.min(timeColumn.data.length, dataColumn.data.length);
      for (; stepCounter < numberOfValues; stepCounter++) {
        time = timeColumn.data[stepCounter];
        rawSensorValue = dataColumn.data[stepCounter];
        model.updateAllOutputProperties();
        dispatch.tick();
      }
    }

    function isAllColumnDataReceieved(column) {
      return column.receivedValuesTimeStamp >= column.requestedValuesTimeStamp;
    }

    function isAllDataReceived() {
      return isAllColumnDataReceieved(timeColumn) && isAllColumnDataReceieved(dataColumn);
    }

    model = {

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      connect: function(address) {
        handle('connect', address);
      },

      start: function() {
        handle('start');
      },

      stop: function() {
        handle('stop');
      },

      tare: function() {
        handle('tare');
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


    stateMachine = new StateMachine({

      notConnected: {
        enterState: function() {
          message = "Not connected.";
        },

        connect: function(address) {
          labquest2Interface.startPolling(address);
          this.gotoState('connecting');
        }
      },

      connecting: {
        enterState: function() {
          message = "Connecting...";
          if (labquest2Interface.isConnected()) {
            this.gotoState('connected');
          }
        },

        statusErrored: function() {
          this.gotoState('initialConnectionFailure');
        },

        statusReceived: function() {
          this.gotoState('connected');
        }
      },

      initialConnectionFailure: {
        enterState: function() {
          labquest2Interface.stopPolling();
          message = "Connection failed.";
          simpleAlert("Could not connect to the LabQuest2. Please make sure the address is correct and that the LabQuest2 can be reached from this computer", {
            OK: function() {
              $(this).dialog("close");
              handle('dismiss');
            }
          });
        },

        dismiss: function() {
          this.gotoState('notConnected');
        }
      },

      connected: {
        enterState: function() {
          message = "Connected.";
          canTare = true;
          isPlayable = true;

          if (labquest2Interface.isCollecting()) {
            this.gotoState('collecting');
          }
        },

        leaveState: function() {
          canTare = false;
          isPlayable = false;
        },

        // Give some feedback on the currently selected column from which data will be collected.
        columnAdded: setColumn,
        columnRemoved: setColumn,
        columnTypeChanged: setColumn,
        columnMoved: setColumn,

        // User requests collection
        start: function() {
          // NOTE. Due to architecture switch mid-way, the labquest2Interface layer is turning the
          // start request into a promise, and we're turning it back to events. The lower layer
          // could just ditch promises and emit the corresponding events with no harm. (The state
          // machine prevents almost every practical scenario where we'd see an out-of-date
          // startRequestFailure event while in a state that would respond to it.)
          labquest2Interface.requestStart().catch(function() {
            handle('startRequestFailed');
          });
          this.gotoState('starting');
        },

        // Collection was started by a third party
        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      starting: {
        enterState: function() {
          message = "Starting data collection...";
        },

        startRequestFailed: function() {
          this.gotoState('errorStarting');
        },

        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      errorStarting: {
        enterState: function() {
          message = "Error starting data collection.";

          simpleAlert("Could not start data collection. Make sure that (remote starting) is enabled", {
            OK: function() {
              $(this).dialog("close");
              handle('dismissErrorStarting');
            }
          });
        },

        collectionStarted: function() {
          this.gotoState('started');
        },

        dismissErrorStarting: function() {
          this.gotoState('connected');
        }
      },

      started: {
        enterState: function() {
          message = "Collecting data.";
          isStopped = false;
          setColumn();

          // Check, just in case. Specifically, when errorStopping transitions here, collection
          // might have stopped in the meantime.
          if ( ! labquest2Interface.isCollecting() ) {
            this.gotoState('stopped');
          }
        },

        data: handleData,

        stop: function() {
          labquest2Interface.requestStop().catch(function() {
            handle('stopRequestFailed');
          });
          this.gotoState('stopping');
        },

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        }
      },

      stopping: {
        enterState: function() {
          message = "Stopping data collection...";
        },

        data: handleData,

        stopRequestFailed: function() {
          this.gotoState('errorStopping');
        },

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        }
      },

      errorStopping: {
        enterState: function() {
          message = "Error stopping data collection.";
          simpleAlert("Could not stop data collection. Make sure that (remote starting) is enabled", {
            OK: function() {
              $(this).dialog("close");
              handle('dismissErrorStopping');
            }
          });
        },

        data: handleData,

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        },

        dismissErrorStopping: function() {
          this.gotoState('started');
        }
      },

      // The device reports the stop of data collection before all data can be received.
      collectionStopped: {
        enterState: function() {
          message = "Data collection stopped.";

          isStopped = true;
          if (isAllDataReceived()) {
            this.gotoState('collectionComplete');
          }
        },

        data: function() {
          handleData();
          if (isAllDataReceived()) {
            this.gotoState('collectionComplete');
          }
        }
      },

      collectionComplete: {
        enterState: function() {
          message = "Data collection complete.";
        }
      },

      disconnected: {
        enterState: function() {
          message = "disconnected";
        }
      }
    });

    // Automatically wrap all event handlers invocations with makeInvalidatingChange so that
    // outputs update from closure variable state automatically.
    function handle(eventName) {
      var args = Array.prototype.slice.call(arguments, 0);

      model.makeInvalidatingChange(function() {
        // handle certain events specially, as our state machine is simple (no hierarchy, no global
        // events, etc)
        switch(eventName) {
          case 'connectionTimedOut':
            // force 'disconnected' state entry without using an event
            stateMachine.gotoState('disconnected');
            return;
        }

        // But just pass most events through to the state machine
        stateMachine.handleEvent.apply(stateMachine, args);
      });
    }

    // At least for now, dispatch every interface event to the state machine.
    labquest2Interface.on('*', function() {
      var args = Array.prototype.slice.call(arguments, 0);
      handle.apply(null, [this.event].concat(args));
    });

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

    initializeStateVariables();

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
      return isPlayable;
    });

    model.defineOutput('hasPlayed', {
      label: "Has successfully collected data?"
    }, function() {
      return didCollectData;
    });

    model.defineOutput('canTare', {
      label: "Can set a tare value?"
    }, function() {
      return canTare && isSensorTareable;
    });

    model.defineOutput('needsReload', {
      label: "Needs Reload?"
    }, function() {
      return needsReload;
    });

    model.defineOutput('message', {
      label: "User Message"
    }, function() {
      return message;
    });

    // Clean up state before we go
    // TODO
    model.on('willReset.model', function() {
      labquest2Interface.stopPolling();
      labquest2Interface.requestStop();
    });

    model.updateAllOutputProperties();
    stateMachine.gotoState('notConnected');

    return model;
  };
});
