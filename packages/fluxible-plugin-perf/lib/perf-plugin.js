/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';
var debug = require('debug')('Fluxible:PerfPlugin');
var GLOBAL_UUID_MAX = Math.pow(2, 53);
function generateUUID () {
    return Math.ceil(Math.random() * GLOBAL_UUID_MAX);
}

/**
 * Creates a new fetchr plugin instance with options
 * @param {Object} options configuration options
 * @returns {PerfPlugin}
 */
module.exports = function perfPlugin(options) {
    debug('initialized');
    /**
     * @class PerfPlugin
     */
    return {
        /**
         * @property {String} name Name of the plugin
         */
        name: 'fPerfPlugin',
        /**
         * Called to plug the FluxContext
         * @method plugContext
         * @param {Object} contextOptions options passed to the createContext method
         * @param {Object} contextOptions.debug if true, will enable debug mode and allow fluxible to collect metadata for debugging
         * @returns {Object}
         */
        plugContext: function plugContext(contextOptions, context) {
            debug('plugged', arguments);
            var enableDebug = typeof contextOptions.debug !== 'undefined' ? contextOptions.debug : false;
            var actionHistory = [];
            console.log('perf enabled', enableDebug);
            console.log(context);
            context.getActionHistory = function () {
                return actionHistory;
            };

            if (enableDebug) {
                context._createSubActionContext = function createSubActionContext(parentActionContext, action) {
                    var displayName = action.displayName || action.name;
                    var rootId = parentActionContext.rootId || generateUUID();
                    var newActionContext = Object.assign({}, context.getActionContext(), {
                        stack: (parentActionContext.stack || []).concat([displayName]),
                        rootId: rootId
                    });

                    // newActionContext.executeAction = newActionContext.executeAction.bind(newActionContext);
                    var actionReference = {
                        rootId: rootId,
                        name: displayName,
                        startTime: Date.now()
                    };
                    var ea = newActionContext.executeAction.bind(newActionContext);
                    newActionContext.executeAction = function timedExecuteAction(action, payload, callback) {
                        ea(action, payload, function timedCb(err, data) {
                            var endTime = Date.now();
                            var dur = endTime - actionReference.startTime;
                            actionReference.endTime = endTime;
                            actionReference.duration = dur;
                            actionReference.failed = !!err;
                            callback && callback(err, data);
                        });
                    };
                    if (!parentActionContext.__parentAction) {
                        // new top level action
                        actionReference.type = (typeof window === 'undefined') ? 'server' : 'client';
                        actionHistory.push(actionReference);
                    } else {
                        // append child action
                        var parent = parentActionContext.__parentAction;
                        parent.children = parent.children || [];
                        parent.children.push(actionReference);
                    }
                    newActionContext.__parentAction = actionReference;
                    return newActionContext;
                }
            }

            return {
                /**
                 * Adds the service CRUD and getServiceMeta methods to the action context
                 * @param actionContext
                 */
                plugActionContext: function plugActionContext(actionContext) {
                },
                /**
                 * Called to dehydrate plugin options
                 * @method dehydrate
                 * @returns {Object}
                 */
                dehydrate: function dehydrate() {
                    return {
                        actionHistory: actionHistory,
                        enableDebug: enableDebug
                    };
                },
                /**
                 * Called to rehydrate plugin options
                 * @method rehydrate
                 * @returns {Object}
                 */
                rehydrate: function rehydrate(state) {
                    actionHistory = state.actionHistory;
                    enableDebug = state.enableDebug;
                }
            };
        }
    };
};
