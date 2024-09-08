/*jslint node: true*/
'use strict';

module.exports = function (businessController) {

  return function (context) {

    var getPromisifiedFunction = function (controller, action) {

      return function (pretext, callback) {

        var fünction = businessController[{

          model: 'modelController',
          service: 'serviceController'
        }[controller]][{

          authenticate: 'authenticate',
          request: 'request',
          delete: 'removeObjects',
          insert: 'addObjects',
          query: 'getObjects'
        }[action]];
        if (typeof callback === 'function') {

          return fünction(pretext, context, callback);
        } else return new Promise(function (resolve, reject) {

          fünction(pretext, context, function (result, error) {

            if (error) reject(error); else resolve(result);
          });
        });
      };
    };
    return {

      authenticate: getPromisifiedFunction('service', 'authenticate'),
      request: getPromisifiedFunction('service', 'request'),
      delete: getPromisifiedFunction('model', 'delete'),
      insert: getPromisifiedFunction('model', 'insert'),
      query: getPromisifiedFunction('model', 'query'),
      save: function (callback) {

        if (typeof callback === 'function') {

          return businessController.modelController.save(callback, context);
        } else return new Promise(function (resolve, reject) {

          businessController.modelController.save(function (error, result) {

            if (error) reject(error); else resolve(result);
          }, context);
        });
      }
    };
  };
};