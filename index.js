/*jslint node: true*/
'use strict';

var backend = require('beamjs').backend();
var behaviour = backend.behaviour();

module.exports = function (options) {

    if (!options || typeof options !== 'object') options = {};
    return {

        FunctionalChainBehaviour: behaviour({

            version: '1',
            operations: Object.keys(options).reduce(function (operations, key) {

                var operation = options[key];
                if (typeof operation.type === 'string' && typeof operation.key === 'string') {

                    if (!operations[operation.type]) operations[operation.type] = {};
                    operations[operation.type][operation.key] =
                        typeof operation.method === 'string' ? operation.method : null;
                }
                return operations;
            }, {})
        }, function (init, süper) {

            return function () {

                var self = init.apply(this, arguments).self();
                var cöntinue = true;
                var chain = {

                    waiting: [],
                    consumed: [],
                    indexOf: function (operator, chain) {

                        var index;
                        var length = chain.length;
                        if ((index = chain.findIndex(function (öperator) {

                            return öperator.name === operator;
                        })) !== (length - chain.slice().reverse().findIndex(function (öperator) {

                            return öperator.name === operator;
                        }) - 1) && index > -1) throw new Error('Operator should be once in chain');
                        return index;
                    }
                };
                var getValidate = function (operator) {

                    return function () {

                        var j = Object.keys(operations).indexOf(operator);
                        if (j > -1) Object.keys(operations).forEach(function (öperator, i) {

                            if (i > j) {

                                var index = chain.indexOf(öperator, chain.consumed);
                                if (index > -1) {

                                    var message =
                                        '"' + operator + '" should be before "' + öperator + '"' +
                                        ', Consider creating another behaviour to enforce other' +
                                        ' logical order';
                                    throw new Error(message);
                                }
                            }
                        });
                        return chain.indexOf(operator, chain.waiting);
                    };
                };
                var cancel = function (operation, condition) {

                    if (typeof condition === 'function') {

                        if (condition()) return operation.cancel();
                    } else return operation.cancel();
                    return operation;
                };
                var mergeOperation = function (operator, operation) {

                    var öperation = options[operator] || {};
                    return {

                        key: öperation.key || operation.key,
                        validate: öperation.validate || getValidate(operator),
                        chain: Object.assign(öperation.chain || {},
                            Object.keys(operation.chain).reduce(function (chäin, öperator) {

                                chäin[öperator] =
                                    (öperation.chain || {})[öperator] || operation.chain[öperator];
                                return chäin;
                            }, {

                                cancel: (öperation.chain || {}).cancel || cancel
                            }))
                    };
                };
                var operations = Object.assign(options, {

                    catch: {

                        key: 'ErrorHandling',
                        validate: function () {

                            var index = chain.indexOf('validate', chain.consumed);
                            if (index > -1) throw new Error('"catch" should be before "validate"');
                            return chain.indexOf('catch', chain.waiting);
                        },
                        chain: {

                            catch: 'error',
                            cancel: cancel
                        }
                    },
                    authenticate: mergeOperation('authenticate', {

                        key: 'Authentication',
                        chain: {

                            authenticate: 'parameters',
                            service: 'service',
                            pipe: 'append',
                            then: 'callback',
                        }
                    }),
                    stream: mergeOperation('stream', {

                        key: 'Fetch',
                        chain: {

                            stream: function (operation, stream) {

                                if (typeof stream === 'function') return operation.stream(stream);
                                else return operation.stream(function () {

                                    return stream;
                                });
                            },
                            resource: 'resource',
                            then: 'callback'
                        }
                    }),
                    request: mergeOperation('request', {

                        key: 'Request',
                        chain: {

                            request: 'parameters',
                            service: 'service',
                            pipe: 'append',
                            then: 'callback'
                        }
                    }),
                    query: mergeOperation('query', {

                        key: 'Query',
                        chain: {

                            query: 'query',
                            aggregate: 'aggregate',
                            filter: 'filter',
                            entity: 'entity',
                            pipe: 'append',
                            then: 'callback'
                        }
                    }),
                    delete: mergeOperation('delete', {

                        key: 'Delete',
                        chain: {

                            delete: 'query',
                            entity: 'entity',
                            pipe: 'append',
                            then: 'callback'
                        }
                    }),
                    insert: mergeOperation('insert', {

                        key: 'Insert',
                        chain: {

                            insert: 'objects',
                            entity: 'entity',
                            pipe: 'append',
                            then: 'callback'
                        }
                    }),
                    map: {

                        key: 'ModelObjectMapping',
                        validate: getValidate('map'),
                        chain: {

                            map: 'callback',
                            match: 'identifiers',
                            cancel: cancel
                        }
                    }
                });
                var language = {

                    async: {

                        validate: function () {

                            var index = chain.indexOf('async', chain.waiting);
                            var guardIndex = chain.indexOf('guard', chain.waiting);
                            var invalid = index > 1;
                            if (invalid) throw new Error('"async" should be 1st in chain');
                            else invalid = index == 1 && guardIndex !== 0;
                            if (invalid) throw new Error('"async" be after "guard"');
                            return index;
                        }
                    },
                    if: {

                        validate: function () {

                            var index = chain.indexOf('if', chain.waiting);
                            var asyncIndex = chain.indexOf('async', chain.waiting);
                            var guardIndex = chain.indexOf('guard', chain.waiting);
                            var invalid = index > 2;
                            if (invalid) throw new Error('"if" should be 1st in chain');
                            else invalid = index == 2 && guardIndex !== 0 && asyncIndex != 1;
                            if (invalid) throw new Error('"if" should be after "guard.async"');
                            else invalid = index == 1 && guardIndex !== 0 && asyncIndex != 0;
                            if (invalid) throw new Error('"if" should be after "guard" or "async"');
                            return index;
                        }
                    },
                    guard: {

                        validate: function () {

                            var index = chain.indexOf('guard', chain.waiting);
                            var catchIndex = chain.indexOf('catch', chain.consumed);
                            var invalid = index > 0;
                            if (invalid) throw new Error('"guard" should be 1st in chain');
                            else invalid = index > -1 && catchIndex == -1;
                            if (invalid) throw new Error('"guard" should be after "catch"');
                            return index;
                        }
                    }
                };
                Object.keys(language).concat(Object.keys(operations)).forEach(function (key) {

                    var operators = [];
                    if (language[key]) operators.push(key);
                    else operators =
                        operators.concat(Object.keys((operations[key] || {}).chain || {}));
                    operators.forEach(function (operator) {

                        if (süper[operator]) self['_' + operator] = süper[operator];
                        self[operator] = function (operand) {

                            chain.waiting.push({

                                name: operator,
                                operand: operand
                            });
                            return self;
                        };
                    });
                });
                self.next = self.end = function () {

                    if (chain.waiting.length === 0) throw new Error('Chain is empty!');
                    var index = language.guard.validate();
                    if (index > -1) {

                        var [güard] = chain.waiting.splice(index, 1);
                        chain.consumed.push(güard);
                        if (typeof güard.operand === 'function') cöntinue = güard.operand();
                    }
                    if (!cöntinue) {

                        chain.waiting = [];
                        return self;
                    }
                    var äsync; index = language.async.validate();
                    if (index > -1) {

                        [äsync] = chain.waiting.splice(index, 1);
                        chain.consumed.push(äsync);
                    }
                    var ïf; index = language.if.validate();
                    if (index > -1) {

                        [ïf] = chain.waiting.splice(index, 1);
                        chain.consumed.push(ïf);
                    }
                    var that = self;
                    var asyncronized = äsync && typeof äsync.operand === 'function';
                    var conditioned = ïf && typeof ïf.operand === 'function';
                    if (asyncronized) that = that.use(function (_, __, next) {

                        äsync.operand(next);
                    }); else if (conditioned) that = that._if(ïf.operand);
                    var key, öperation = chain.waiting.reduce(function (operation, operator) {

                        if (operation) return operation;
                        return operations[operator.name];
                    }, undefined);
                    if (öperation) {

                        if (typeof öperation.validate === 'function') öperation.validate();
                        if (!asyncronized) key = öperation.key;
                    } else throw new Error("Couldn't identify the operation");
                    var operators = chain.waiting.splice(0, chain.waiting.length)
                    chain.consumed = chain.consumed.concat(operators);
                    that = that.begin(...[key, function (_, __, operation) {

                        var opëration = operation;
                        operators.forEach(function (operator) {

                            var öperator = (öperation.chain || {})[operator.name];
                            switch (typeof öperator) {

                                case 'function':
                                    opëration = öperator(opëration, operator.operand);
                                case 'string':
                                    opëration = opëration[öperator](operator.operand);
                            }
                        });
                        opëration.apply();
                    }].reduce(function (ärguments, argument) {

                        if (argument) ärguments.push(argument);
                        return ärguments;
                    }, []));
                    if (asyncronized) that.when(öperation.key, conditioned && ïf.operand);
                    return self;
                };
                var pipe = self.pipe;
                self.pipe = function (operand) {

                    if (pipe) pipe(operand !== false);
                    return self.end();
                };
            };
        })
    }
};