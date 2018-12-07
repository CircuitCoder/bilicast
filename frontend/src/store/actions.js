import { get } from '../util';

export const TYPES = {
  CACHE_ENTRY: 'CACHE_ENTRY',
};

Object.freeze(TYPES);

export const cacheEntry = entry => ({
  type: TYPES.CACHE_ENTRY,
  entry,
});

// Async actions
const fetchQueue = new Set();
export const fetchEntry = eid =>
  async dispatch => {
    if(fetchQueue.has(eid)) return;

    fetchQueue.add(eid);
    const entry = await get(`/entry/${eid}`);
    dispatch(cacheEntry(entry));
    fetchQueue.delete(eid);
  };
