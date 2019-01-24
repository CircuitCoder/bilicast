'use strict';

var configure = require('request-promise-core/configure/request2');

// Load Request freshly - so that users can require an unaltered request instance!
const request = require('request');

configure({
    request: request,
    PromiseImpl: Promise,
    expose: [
        'then',
        'catch',
        'promise'
    ]
});


module.exports = request;
 
