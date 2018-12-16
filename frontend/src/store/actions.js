import { get } from '../util';

export const TYPES = {
  CACHE_ENTRY: 'CACHE_ENTRY',
  PLAY_ENTRY: 'PLAY_ENTRY',
  SET_REPEAT: 'SET_REPEAT',
  LOGIN: 'LOGIN',

  PREFETCH_STARTED: 'PREFETCH_STARTED',
  PREFETCH_FINISHED: 'PREFETCH_FINISHED',
};

Object.freeze(TYPES);

export const cacheEntry = entry => ({
  type: TYPES.CACHE_ENTRY,
  entry,
});

export const playEntry = (list, index) => ({
  type: TYPES.PLAY_ENTRY,
  list,
  index,
});

export const setRepeat = repeat => ({
  type: TYPES.SET_REPEAT,
  repeat,
});

export const login = () => ({
  type: TYPES.LOGIN,
});

export const prefetchStarted = id => ({
  type: TYPES.PREFETCH_STARTED,
  id,
});

export const prefetchFinished = id => ({
  type: TYPES.PREFETCH_FINISHED,
  id,
});

// Async actions
const fetchQueue = new Set();
const POLL_INTERVAL = 1000;
let polling = false;

export const fetchEntry = (eid, prefetch = false) =>
  async dispatch => {
    if(fetchQueue.has(eid)) return;

    if(prefetch)
      dispatch(prefetchStarted(eid));

    fetchQueue.add(eid);
    const query = prefetch ? 'update' : 'cache';
    const entry = await get(`/entry/${eid}?${query}`);
    dispatch(cacheEntry(entry));
    fetchQueue.delete(eid);

    if(entry.status !== 'ready' && !polling)
      setTimeout(() => dispatch(pollEntry()), POLL_INTERVAL);

    if(prefetch)
      dispatch(prefetchFinished(eid));

    return entry;
  };

const pollEntry = () =>
  async (dispatch, getState) => {
    polling = true;
    const keys = Array.from(getState()
      .store
      .filter(e => e.status !== 'ready')
      .keys())

    if(keys.length === 0) {
      polling = false;
      return;
    }

    const promises = keys.map(e => dispatch(fetchEntry(e)));
    await Promise.all(promises);
    setTimeout(() => dispatch(pollEntry()), POLL_INTERVAL);
  };

export const prefetchEntry = eid =>
  async dispatch => {
    const art = get(`/store/${eid}/art.jpg?update`);
    const content = get(`/store/${eid}/content.m4a?update`);
    await Promise.all([art, content]);

    await dispatch(fetchEntry(eid, true));
  };
