import { get, artwork, storeArtwork, music, storeMusic, storeEntry, matchEntry } from '../util';

export const TYPES = {
  CACHE_ENTRY: 'CACHE_ENTRY',
  UNCACHE_ENTRY: 'UNCACHE_ENTRY',
  PLAY_ENTRY: 'PLAY_ENTRY',
  SET_REPEAT: 'SET_REPEAT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',

  PREFETCH_STARTED: 'PREFETCH_STARTED',
  PREFETCH_FINISHED: 'PREFETCH_FINISHED',

  QUEUE_RECENT: 'QUEUE_RECENT',
  INIT_RECENTS: 'INIT_RECENTS',

  SET_INSTALLER: 'SET_INSTALLER',
};

Object.freeze(TYPES);

export const cacheEntry = entry => ({
  type: TYPES.CACHE_ENTRY,
  entry,
});

export const uncacheEntry = id => ({
  type: TYPES.UNCACHE_ENTRY,
  id,
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

export const logout = () => ({
  type: TYPES.LOGOUT,
});

export const prefetchStarted = id => ({
  type: TYPES.PREFETCH_STARTED,
  id,
});

export const prefetchFinished = id => ({
  type: TYPES.PREFETCH_FINISHED,
  id,
});

export const queueRecent = (id, name) => ({
  type: TYPES.QUEUE_RECENT,
  id,
  name,
});

export const initRecents = recents => ({
  type: TYPES.INIT_RECENTS,
  recents,
});

export const setInstaller = installer => ({
  type: TYPES.SET_INSTALLER,
  installer,
});

// Async actions
const fetchQueue = new Set();
const POLL_INTERVAL = 1000;
let polling = false;

export const fetchEntry = (eid, prefetch = false) =>
  async dispatch => {
    if(fetchQueue.has(eid)) return;

    fetchQueue.add(eid);

    if(prefetch) {
      dispatch(prefetchStarted(eid));
      const artStore = artwork(eid)
        .then(url => get(url))
        .then(blob => storeArtwork(eid, blob));
      const contentStore = music(eid)
        .then(url => get(url))
        .then(blob => storeMusic(eid, blob));
      await Promise.all([artStore, contentStore]);
    }

    let entry = null;
    if(!prefetch) {
      console.log(matchEntry);
      entry = await matchEntry(eid);
      if(entry) entry.cached = true;
    }

    if(entry === null)
      entry = await get(`/entry/${eid}`);

    dispatch(cacheEntry(entry));
    fetchQueue.delete(eid);

    if(entry.status !== 'ready' && !polling)
      setTimeout(() => dispatch(pollEntry()), POLL_INTERVAL);

    if(prefetch) {
      if(entry) {
        await storeEntry(eid, entry);
        entry.cached = true;
      }
      dispatch(prefetchFinished(eid));
    }

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
    await dispatch(fetchEntry(eid, true));
  };

export const install = () =>
  (dispatch, getState) => {
    const installer = getState().installer;
    dispatch(setInstaller(null));
    installer.prompt();
  };
