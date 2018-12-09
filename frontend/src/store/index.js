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

store.subscribe(() => {
  const state = store.getState();
  if(state.playing) {
    const id = state.playing.list.entries[state.playing.index];
    const inst = state.store.get(id);

    if(inst) {
      document.title = `${inst.title} | ${state.playing.list.name} | Bilicast`;
      return;
    }
  }

  document.title = 'Bilicast';
});

export default store;
