/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

define(function (require, exports, module) {
  'use strict';
  var
    arrays = require('arrays'),

    RELAXATION_STEPS = 5;

  exports.makeHeatSolver = function (model) {
    var
      nx = model.getGridWidth(),
      ny = model.getGridHeight(),

      // Basic simulation parameters.
      model_options = model.getModelOptions(),
      timeStep = model_options.timeStep,
      boundary = model_options.boundary,

      deltaX = model_options.model_width / model.getGridWidth(),
      deltaY = model_options.model_height / model.getGridHeight(),

      relaxationSteps = RELAXATION_STEPS,

      // Simulation arrays provided by model.
      conductivity = model.getConductivityArray(),
      capacity     = model.getCapacityArray(),
      density      = model.getDensityArray(),
      u            = model.getUVelocityArray(),
      v            = model.getVVelocityArray(),
      tb           = model.getBoundaryTemperatureArray(),
      fluidity     = model.getFluidityArray(),

      // Internal array that stores the previous temperature results.
      t0 = arrays.create(nx * ny, 0, model.getArrayType()),

      // Convenience variables.
      nx1 = nx - 1,
      ny1 = ny - 1,
      nx2 = nx - 2,
      ny2 = ny - 2,

      //
      // Private methods
      //
      applyBoundary  = function (t) {
        var
          vN, vS, vW, vE,
          i, j, inx, inx_ny1;

        if (boundary.temperature_at_border) {
          vN = boundary.temperature_at_border.upper;
          vS = boundary.temperature_at_border.lower;
          vW = boundary.temperature_at_border.left;
          vE = boundary.temperature_at_border.right;
          for (i = 0; i < nx; i += 1) {
            inx = i * nx;
            t[inx] = vN;
            t[inx + ny1] = vS;
          }
          for (j = 0; j <  ny; j += 1) {
            t[j] = vW;
            t[nx1 * nx + j] = vE;
          }
        } else if (boundary.flux_at_border) {
          vN = boundary.flux_at_border.upper;
          vS = boundary.flux_at_border.lower;
          vW = boundary.flux_at_border.left;
          vE = boundary.flux_at_border.right;
          for (i = 0; i < nx; i += 1) {
            inx = i * nx;
            inx_ny1 = inx + ny1;
            t[inx] = t[inx + 1] + vN * deltaY / conductivity[inx];
            t[inx_ny1] = t[inx + ny2] - vS * deltaY / conductivity[inx_ny1];
          }
          for (j = 0; j < ny; j += 1) {
            t[j] = t[nx + j] - vW * deltaX / conductivity[j];
            t[nx1 * nx + j] = t[nx2 * nx + j] + vE * deltaX / conductivity[nx1 * nx + j];
          }
        } else {
          throw new Error("Heat solver: wrong boundary settings definition.");
        }
      },

      macCormack  = function (t) {
        var
          tx = 0.5 * timeStep / deltaX,
          ty = 0.5 * timeStep / deltaY,
          i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;
            if (fluidity[jinx]) {
              t0[jinx] = t[jinx]
                - tx * (u[jinx_plus_nx] * t[jinx_plus_nx] - u[jinx_minus_nx] * t[jinx_minus_nx])
                - ty * (v[jinx_plus_1] * t[jinx_plus_1] - v[jinx_minus_1] * t[jinx_minus_1]);
            }
          }
        }
        applyBoundary(t0);

        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              t[jinx] = 0.5 * (t[jinx] + t0[jinx]) - 0.5 * tx * u[jinx]
                * (t0[jinx_plus_nx] - t0[jinx_minus_nx]) - 0.5 * ty * v[jinx]
                * (t0[jinx_plus_1] - t0[jinx_minus_1]);
            }
          }
        }
        applyBoundary(t);
      };

    return {
      solve: function (convective, t, q) {
        var
          hx = 0.5 / (deltaX * deltaX),
          hy = 0.5 / (deltaY * deltaY),
          invTimeStep = 1.0 / timeStep,
          rij, sij, axij, bxij, ayij, byij,
          k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

        arrays.copy(t, t0);

        for (k = 0; k < relaxationSteps; k += 1) {
          for (i = 1; i < nx1; i += 1) {
            inx = i * nx;
            for (j = 1; j < ny1; j += 1) {
              jinx = inx + j;
              if (isNaN(tb[jinx])) {
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;

                sij = capacity[jinx] * density[jinx] * invTimeStep;
                rij = conductivity[jinx];
                axij = hx * (rij + conductivity[jinx_minus_nx]);
                bxij = hx * (rij + conductivity[jinx_plus_nx]);
                ayij = hy * (rij + conductivity[jinx_minus_1]);
                byij = hy * (rij + conductivity[jinx_plus_1]);
                t[jinx] = (t0[jinx] * sij + q[jinx] + axij * t[jinx_minus_nx] + bxij
                          * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1])
                          / (sij + axij + bxij + ayij + byij);
              } else {
                t[jinx] = tb[jinx];
              }
            }
          }
          applyBoundary(t);
        }
        if (convective) {
          // advect(t)
          macCormack(t);
        }
      }
    };
  };
});
