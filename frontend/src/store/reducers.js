import { TYPES } from './actions';

import { Map, Set } from 'immutable';

const RECENT_LEN = 10;

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

export function recents(state = [], action) {
  if(action.type === TYPES.QUEUE_RECENT) {
    const filtered = state.filter(e => e.id !== action.id);
    return [{ name: action.name, id: action.id }, ...filtered].slice(0, RECENT_LEN);
  } else if(action.type === TYPES.INIT_RECENTS) {
    const dedup = action.recents.filter(e => state.findIndex(s => s.id === e.id) === -1);
    return [...state, ...dedup].slice(0, RECENT_LEN);
  }
  return state;
}
