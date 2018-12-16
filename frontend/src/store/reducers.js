import { TYPES } from './actions';

import { Map, Set } from 'immutable';

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

export function login(state = false, action) {
  if(action.type === TYPES.LOGIN)
    return true;
  else if(action.type === TYPES.LOGOUT)
    return false;
  return state;
}

export function prefetching(state = new Set(), action) {
  if(action.type === TYPES.PREFETCH_STARTED)
    return state.add(action.id);
  else if(action.type === TYPES.PREFETCH_FINISHED)
    return state.delete(action.id);
  return state;
}
