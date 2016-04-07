/**
 * Copyright 2016, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
console.log('perf-plugin');
module.exports = require('./dest/lib/devtools-plugin').default;
module.exports.Actions = require('./dest/components/Actions').default;
module.exports.ActionTree = require('./dest/components/ActionTree').default;
