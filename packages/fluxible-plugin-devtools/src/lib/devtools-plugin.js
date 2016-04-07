/**
 * Copyright 2016, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';
import debugLib from 'debug';
const debug = debugLib('Fluxible:DevToolsPlugin');

/**
 * Creates a new devtools plugin instance
 * @returns {PerfPlugin}
 */
export default function devToolsPlugin() {
    /**
     * @class DevToolsPlugin
     */
    return {
        /**
         * @property {String} name Name of the plugin
         */
        name: 'DevToolsPlugin',
        /**
         * Called to plug the FluxContext
         * @method plugContext
         * @param {Object} contextOptions options passed to the createContext method
         * @param {Object} contextOptions.debug if true, will enable debug mode and allow fluxible to collect metadata for debugging
         * @returns {Object}
         */
        plugContext: function plugContext(contextOptions, context) {
            let enableDebug = typeof contextOptions.debug !== 'undefined' ? contextOptions.debug : false;
            let actionHistory = [];
            /**
             * extends the input object with a `devtools` namespace which has
             * debugging methods available to it.
             * @method provideDevTools
             * @param {Object} obj arbitrary input object
             * @return {void}
             */
            function provideDevTools (obj) {
                obj.devtools = {
                    /**
                    * Action history is preserved in a tree structure which maintains parent->child relationships.
                    * Top level actions are actions that kick off the app (i.e. navigateAction) or actions executed by components.
                    * All other actions will be under the `children` property of other actions.
                    * This action history tree allows us to trace and even visualize actions for debugging.
                    * @method getActionHistory
                    * @return {Object} Array of top level actions.
                    */
                    getActionHistory: function getActionHistory () {
                        return actionHistory;
                    }
                }
            }
            extendWithDevTools(context);
            /**
             * If the debug flag was set to true, this funcion will override some functions
             * within fluxible and collect metadata that is useful for debugging.
             * @method overridectx
             * @return {void}
             */
            function overrideCtx() {
                debug('devtools plugin %s', enableDebug ? 'enabled' : 'disabled')
                if(!enableDebug) {
                    return;
                }
                /**
                 * Override the _createSubActionContext method so we can track "parent" actions
                 * for each executed action. We can later use this to graph our the dependencies.
                 */
                const createSubActionContext = context._createSubActionContext.bind(context);
                context._createSubActionContext = function createDevSubActionContext(parentActionContext, action) {
                    let subActionContext = createSubActionContext(parentActionContext, action);
                    const executeAction = subActionContext.executeAction;
                    let actionReference = {
                        rootId: subActionContext.rootId,
                        name: subActionContext.displayName,
                        startTime: Date.now()
                    };
                    /**
                     * Override the executeAction method with a wrapper function that times
                     * how long it takes for each action to execute
                     */
                    subActionContext.executeAction = function timedExecuteAction(action, payload, callback) {
                        executeAction(action, payload, function timedCallback(err, data) {
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
                        const parent = parentActionContext.__parentAction;
                        parent.children = parent.children || [];
                        parent.children.push(actionReference);
                    }
                    subActionContext.__parentAction = actionReference;
                    return subActionContext;
                }
            }
            overrideCtx();

            return {
                /**
                 * Adds devtools methods to the component context
                 * @param componentContext
                 */
                plugComponentContext: function plugComponentContext (componentContext) {
                    provideDevTools(componentContext);
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
                    overrideCtx();
                }
            };
        }
    };
};
