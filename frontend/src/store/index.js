import { combineReducers, createStore, applyMiddleware } from 'redux';

import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';

import * as reducers from './reducers';
import { initRecents } from './actions';

import { artwork, saveRecents, loadRecents } from '../util';

const handlers = combineReducers(reducers);

// Disable logger when testing and on production
const hasLogger = !global.it && process.env.NODE_ENV === 'development';
const middlewares = !hasLogger ?
  applyMiddleware(thunk) :
  applyMiddleware(thunk, createLogger());

const store = createStore(handlers, middlewares);

store.subscribe(() => {
  const state = store.getState();

  saveRecents(state.recents);

  if(state.playing) {
    const id = state.playing.list.entries[state.playing.index];
    const inst = state.store.get(id);

    if(inst) {
      const title = inst.single ? inst.title : inst.subtitle;
      document.title = `${title} | ${state.playing.list.name} | Bilicast`;

      if('mediaSession' in navigator)
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title,
          artist: inst.uploader,
          album: state.playing.list.name,
          artwork: [{ src: artwork(id) }],
        });
      return;
    }
  }

  document.title = 'Bilicast';
});

loadRecents().then(recents => {
  store.dispatch(initRecents(recents));
});

export default store;
