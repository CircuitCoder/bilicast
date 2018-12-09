import { get } from '../util';

export const TYPES = {
  CACHE_ENTRY: 'CACHE_ENTRY',
  PLAY_ENTRY: 'PLAY_ENTRY',
  SET_REPEAT: 'SET_REPEAT',
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

// Async actions
const fetchQueue = new Set();
let polling = false;

export const fetchEntry = eid =>
  async dispatch => {
    if(fetchQueue.has(eid)) return;

    fetchQueue.add(eid);
    const entry = await get(`/entry/${eid}`);
    dispatch(cacheEntry(entry));
    fetchQueue.delete(eid);

    if(!polling)
      dispatch(pollEntry());

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
    setTimeout(() => dispatch(pollEntry()), 1000);
  }