define(function() {

  var NumericOutputView = require('common/views/numeric-output-view'),
      viewState = require('common/views/view-state');

  return function(model, modelUrl) {

    // TODO use the formatter from the property description. Right now, it automatically adds
    // units to the returned string (which we don't want here).
    var format = d3.format('.2f');
    var sensorReadingView;
    var view;

    function setIsTaringState() {
      if (model.properties.isTaring) {
        view.$zeroButton.find('button').html("Zeroing...");
      } else {
        view.$zeroButton.find('button').html("Zero");
      }
    }

    function setCanTareState() {
      if (model.properties.canTare) {
        viewState.enableView(view.$zeroButton);
      } else {
        viewState.disableView(view.$zeroButton);
      }
    }

    function setMessageText() {
      view.$message.text(model.properties.message);
    }

    function setupModelObservers() {
      model.addObserver('isTaring', setIsTaringState);
      setIsTaringState();

      model.addObserver('canTare', setCanTareState);
      setCanTareState();

      model.addObserver('message', setMessageText);
      setMessageText();
    }

    return view = {
      $el: $("<div id='model-container' class='container sensor-model-container' />"),

      bindModel: function(newModel, newModelUrl) {
        modelUrl = newModelUrl || modelUrl;
        model = newModel || model;

        setupModelObservers();
      },

      getHeightForWidth: function() {
        return "2.6em";
      },

      // called once we're in the DOM
      setup: function() {

        this.$el.empty();

        this.$addressInput = $("<div class='address-input'><input type='text' name='address-input' placeholder='address of LabQuest2'></input></div>");
        sensorReadingView = new NumericOutputView({
          id: 'sensor-value-view',
          label: "Reading: ",
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });

        this.$connectButton = $("<div class='interactive-button'><button>Connect</button></div>");
        this.$zeroButton = $("<div class='interactive-button'><button>Zero</button></div>");
        this.$message = $("<div class='message'></div>");
        this.$sensorReading = sensorReadingView.render().addClass("horizontal");

        this.$el.css('zIndex', 4)
          .append(this.$addressInput)
          .append(this.$connectButton)
          .append(this.$sensorReading)
          .append(this.$zeroButton)
          .append(this.$message);

        this.$el.find('div').addClass('component component-spacing');
        sensorReadingView.resize();
        setupModelObservers();

        this.$connectButton.on('click', 'button', model.connect);
        this.$zeroButton.on('click', 'button', model.tare);
      },

      resize: function() {
        if (sensorReadingView) {
          sensorReadingView.resize();
        }
      },

      repaint: function() {},

      setFocus: function () {},

      updateUnits: function(units) {
        sensorReadingView.updateUnits(units);
        if (model.properties.sensorReading == null) {
          sensorReadingView.hideUnits();
        }
      },

      update: function() {
        if (model.properties.sensorReading == null) {
          sensorReadingView.update("");
          sensorReadingView.hideUnits();
        } else {
          sensorReadingView.update(format(model.properties.sensorReading));
          sensorReadingView.showUnits();
        }
      }
    };
  };
});
