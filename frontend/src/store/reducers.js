import { TYPES } from './actions';

import { Map } from 'immutable';

export function playing(state = null, action) {
  if(action.type === TYPES.PLAY_ENTRY) {
    const { list, entry } = action;
    return { list, entry };
  }
  return state;
}

export function store(state = new Map(), action) {
  if(action.type === TYPES.CACHE_ENTRY)
    return state.set(action.entry._id, action.entry);
  return state;
}
