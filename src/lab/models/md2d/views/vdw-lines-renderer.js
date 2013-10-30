define(function(require) {
  'use strict';

  var PIXI     = require('pixi');
  var canvg    = require('canvg');
  var mustache = require('mustache');

  /*jshint -W043 */
  var LINE_TEMPLATE =
    '<svg x="0px" y="0px" width="{{ width }}px" height="{{ height }}px"> \
       <line x1="{{ x1 }}" \
             y1="{{ y1 }}" \
             x2="{{ x2 }}" \
             y2="{{ y2 }}" \
             style="stroke: #aaa; \
                    stroke-width: {{ strokeWidth }}px; \
                    stroke-dasharray: {{ dashArrayLong }}px, {{ dashArrayShort }}px;"> \
      </line> \
    </svg>';
  /*jshint +W043*/

  return function VdwLinesRenderer(modelView, model, pixiContainer) {

    // Pixi container where our sprites go.
    var container;

    // Pixi texture consisting of the longest possible line
    var texture;

    // Width of VdW lines in pixels
    var strokeWidth;

    // Pixi sprites for each line
    var sprites = [];

    var mask;

    // Maximum value of sigma (=== 0.5 * radius) of atoms actually in the model (be sure to exlude
    // any predefined elements not actually in the model, to prevent unnecessarily large values)
    function getMaxSigma() {
      var atoms = model.getAtoms();
      return 0.5 * atoms.reduce(function(prev, cur) {
        return cur.radius > prev ? cur.radius : prev;
      }, 0);
    }

    function getLineTexture() {
      var canvas = document.createElement('canvas');

      // VdW lines are drawn when 2 uncharged, nonbonded atoms are within
      //   r_ij < vdwLinesRatio * (sigma_i + sigma_j) / 2
      // and the maximum value of vdwLinesRatio is 2.0 (corresponding to
      // model.properties.VDWLinesCutoff === 'long')
      var maxLength   = 5 * modelView.model2canvas(2 * getMaxSigma());

      var halfStroke  = strokeWidth / 2;

      var templateData = {
        width: maxLength,
        height: strokeWidth,
        x1: 0,
        x2: maxLength,
        y1: halfStroke,
        y2: halfStroke,
        strokeWidth: strokeWidth,
        dashArrayShort: modelView.model2canvas(0.02),
        dashArrayLong:  modelView.model2canvas(0.03),
      };

      canvg(canvas, mustache.render(LINE_TEMPLATE, templateData));
      return PIXI.Texture.fromCanvas(canvas);
    }

    function setup() {
      // var i;

      if (container) {
        // for (i = 0; i < sprites.length; i++) {
        //   // must clear mask even on sprites we're removing, or else, empirically, the entire canvas
        //   // blanks after repaint (as if all graphics in all layers are masked)
        //   // presumed cause: https://github.com/GoodBoyDigital/pixi.js/issues/323
        //   sprites[i].mask = null;
        // }
        container.mask = null;
        pixiContainer.removeChild(container);
        container = null;
      }

      if ( ! model.properties.showVDWLines ) {
        return;
      }

      strokeWidth = modelView.model2canvas(0.02);
      texture = getLineTexture();
      sprites = [];

      container = new PIXI.DisplayObjectContainer();
      pixiContainer.addChild(container);

      mask = new PIXI.Graphics();
      container.addChild(mask);
      container.mask = mask;

      update();
    }

    function update() {
      var vdwPairs = model.get_vdw_pairs();
      var atoms = model.getAtoms();
      var i;
      var atom1, atom2;
      var dx, dy, length;
      var angle;
      var x1, y1, x2, y2;
      var halfStroke = strokeWidth / 2;

      mask.clear();
      mask.lineStyle(strokeWidth, 0, 1);

      // make sure we have enough sprites...
      for (i = sprites.length; i < vdwPairs.count; i++) {
        sprites[i] = new PIXI.Sprite(texture);
        sprites[i].pivot.x = strokeWidth / 2;
        container.addChild(sprites[i]);
      }

      for (i = 0; i < vdwPairs.count; i++) {
        atom1 = atoms[vdwPairs.atom1[i]];
        atom2 = atoms[vdwPairs.atom2[i]];

        x1 = modelView.model2canvas(atom1.x);
        y1 = modelView.model2canvasInv(atom1.y);
        x2 = modelView.model2canvas(atom2.x);
        y2 = modelView.model2canvasInv(atom2.y);

        dx = x2 - x1;
        dy = y2 - y1;

        length = Math.ceil(Math.sqrt(dx * dx + dy * dy));
        angle = Math.atan2(dy, dx);

        // mask off the underlying line texture to the correct length (aka width)

        mask.beginFill();
        mask.moveTo(x1, y1);
        mask.lineTo(x2, y2);
        mask.endFill();

        //sprites[i].mask = mask;
        sprites[i].rotation = angle;
        sprites[i].visible = true;
        sprites[i].position.x = x1 + halfStroke * Math.sin(angle);
        sprites[i].position.y = y1 - halfStroke * Math.cos(angle);
      }

      // hide unused sprites, but don't delete them -- VdW lines come and go on each tick!
      for (; i < sprites.length; i++) {
        // must remove mask on hidden sprites! see
        // https://github.com/GoodBoyDigital/pixi.js/issues/323
        // sprites[i].mask = null;
        sprites[i].visible = false;
        // also prevent the mask (which is just a filled rect) from becoming visible
        //masks[i].clear();
      }
    }

    function bindModel(_model) {
      model = _model;
    }

    return {
      setup: setup,
      update: update,
      bindModel: bindModel
    };
  };
});
