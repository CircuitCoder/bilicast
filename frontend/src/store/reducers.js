import { TYPES } from './actions';

import { Map } from 'immutable';

export function playing(state = null, action) {
  if(action.type === TYPES.PLAY_ENTRY) {
    const { list, index } = action;
    return { list, index };
  }
  return state;
}

export function store(state = new Map(), action) {
  if(action.type === TYPES.CACHE_ENTRY)
    return state.set(action.entry._id, action.entry);
  return state;
}

export function repeating(state = null, action) {
  if(action.type === TYPES.SET_REPEAT)
    return action.repeat;
  return state;
}
