import { TYPES } from './actions';

import { Map } from 'immutable';

export function list(state = null, action) {
  return state;
}

export function entry(state = null, action) {
  return state;
}

export function store(state = new Map(), action) {
  if(action.type === TYPES.CACHE_ENTRY)
    return state.set(action.entry._id, action.entry);
  return state;
}
