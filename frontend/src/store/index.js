import { combineReducers, createStore, applyMiddleware } from 'redux';

import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';

import * as reducers from './reducers';

const handlers = combineReducers(reducers);

// Disable logger when testing and on production
const hasLogger = !global.it && process.env.NODE_ENV === 'development';
const middlewares = !hasLogger ?
  applyMiddleware(thunk) :
  applyMiddleware(thunk, createLogger());

const store = createStore(handlers, middlewares);

export default store;
