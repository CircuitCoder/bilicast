import React from 'react';

import { connect } from 'react-redux';

import { get, post, artwork, matchList, storeList } from '../util';
import { fetchEntry, playEntry, prefetchEntry, queueRecent, install } from '../store/actions';

import { NavLink } from 'react-router-dom';

import Icon from '../Icon';
import Dialog from '../Dialog';

function getEntryHint(entry) {
  let category = entry.category || 'Loading...';
  if(entry.single)
    return `${entry.source} - ${category}`;
  else
    return `${entry.source} - P${entry.page} - ${category}`;
}

const ENTRY_HEIGHT = 100 + 10;
const SCROLL_ZONE_WIDTH = 200;
const FAST_SCROLL_ZONE_WIDTH = 75;
const SCROLL_SPEED = 5;
const FAST_SCROLL_SPEED = 10;

class EntryImpl extends React.Component {
  state = {
    lifted: false,
    artwork: null,
  }

  constructor(props) {
    super(props);

    if(!this.props.entry) this.props.reload();

    this.moveTimeout = false;
  }

  render() {
    const {
      entry,
      onPlay,
      onDelete,
      onCache,
      onArtDrag,
      isActive,
      login,
      prefetching
    } = this.props;

    let className = 'entry';
    if(this.props.className) className += ' ' + this.props.className;
    if(!entry || entry.status !== 'ready') className += ' entry-not-ready';
    if(isActive) className += ' active';

    if(!entry) return (
      <div className={className} style={this.props.style}>
        <div className="entry-border" />
        <div
          className="entry-artwork"
          onDragStart={onArtDrag}
          draggable="true"
        >
          <div className="entry-artwork-internal entry-artwork-loading">
            <div className="loading"></div>
          </div>
        </div>
        <div className="entry-desc-loading">
          <div className="loading"></div>
        </div>
      </div>
    );

    let prefetchingIcon = <Icon onClick={onCache}>get_app</Icon>;
    if(prefetching) prefetchingIcon = <Icon className="disabled rotate">sync</Icon>;
    else if(entry.cached) prefetchingIcon = <Icon className="disabled">done</Icon>;

    if(entry.status !== 'preparing' && (
      this.state.artwork === null || this.state.artwork.id !== entry._id
    )) this.fetchArtwork();

    return <div className={className} style={this.props.style}>
      <div className="entry-border" />
      <div
        className="entry-artwork"
        onDragStart={onArtDrag}
        draggable="true"
      >
        { this.state.artwork !== null ?
            <div style={{backgroundImage: `url(${this.state.artwork.uri})`}} className="entry-artwork-internal" />
            :
            <div className="entry-artwork-internal entry-artwork-loading">
              <div className="loading"></div>
            </div>
        }
      </div>
      <div className="entry-info">
        { entry.single ?
            <div className="entry-title">{ entry.title }</div>
            :
            <div className="entry-title-group">
              <div className="entry-title-hint">
                { entry.title }
              </div>

              <div className="entry-title-main">
                { entry.subtitle }
              </div>
            </div>
        }
        <div className="entry-author"><Icon>person</Icon> { entry.uploader }</div>
        { entry.ref ?
            <a href={entry.ref} target="_blank"><div className="entry-hint">
              <Icon>link</Icon> <div className="entry-link-text">{ getEntryHint(entry) }</div>
            </div></a>
            :
            <div className="entry-hint">
              { entry.source } - { entry.category }
            </div>
        }
      </div>
      <div className="entry-actions">
        { entry.status === 'ready' ?
            <React.Fragment>
              <Icon className="primary" onClick={onPlay}>play_arrow</Icon>
              { prefetchingIcon }
              { login ? <Icon onClick={onDelete}>delete</Icon> : null }
            </React.Fragment>
            :
            <React.Fragment>
              <Icon className="disabled rotate">sync</Icon>
              { login ? <Icon onClick={onDelete}>delete</Icon> : null }
            </React.Fragment>
        }
      </div>
    </div>
  }

  fetchArtwork() {
    let id = this.props.entry._id;
    artwork(id).then(uri => {
      if(this.props.entry._id === id) this.setState({ artwork: { id, uri }})
    });
  }
}

const Entry = connect(
  (state, props) => ({
    entry: state.store.get(props.id),
    login: state.login,
    prefetching: state.prefetching.has(props.id),
  }),
  (dispatch, props) => ({
    reload: () => dispatch(fetchEntry(props.id)),
  }),
)(EntryImpl);

function parseTarget(target) {
  // Matching bilibili
  if(target.match(/^av\d+/))
    return target;

  const biliUri = /^https?:\/\/(www\.)?bilibili\.com\/video\/(av\d+)\/?(\?.*)?$/;
  const biliMatch = target.match(biliUri);

  if(biliMatch) return biliMatch[2];

  // Matching nico
  if(target.match(/^sm\d+/))
    return target;

  const nicoUri = /^https?:\/\/(www\.)?nicovideo\.jp\/watch\/(sm\d+)$/;
  const nicoMatch = target.match(nicoUri);

  if(nicoMatch) return nicoMatch[2];

  // Matching Youtube
  const longYtbUri = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=(.*)$/;
  const shortYtbUri = /^https?:\/\/(www\.)?youtu\.be\/(.*)($|\?)/;
  const longYtbMatch = target.match(longYtbUri);
  if(longYtbMatch) return longYtbMatch[2];
  const shortYtbMatch = target.match(shortYtbUri);
  if(shortYtbMatch) return shortYtbMatch[2];

  return null;
}

function parseFavlist(url) {
  const re = /^https?:\/\/space\.bilibili\.com\/(\d+)\/favlist\?fid=(\d+)$/;
  const match = url.match(re);

  if(match) return {
    uid: match[1],
    favid: match[2],
  };

  return null;
}

class List extends React.PureComponent {
  static initial = null

  state = {
    loading: false,
    list: null,
    adding: false,
    importing: false,

    addTarget: '',
    addWorking: false,

    importTarget: '',
    importWorking: null,
    importLength: 0,

    prefetchingList: false,

    moving: null,
    movingTo: null,
    updating: false,
  }

  constructor(props) {
    super(props);

    if(props.match.params.init) {
      console.log('Setting initial...');
      List.initial = props.match.params.init;
      props.history.replace(`/${props.match.params.id}`);
    }

    this.reloadList();
    this.scrolling = null;
  }

  componentDidUpdate(pp) {
    if(pp.match.params.id !== this.props.match.params.id)
      this.reloadList();
  }

  componentDidMount() {
    this._mounted = true;

    this.moveListener = ev => {
      this.processInput(ev);
    };

    this.upListener = ev => {
      this.commitMove();
    };

    this.scrollListener = ev => {
      this.recalcMovingTarget();
    };

    window.addEventListener('mousemove', this.moveListener);
    window.addEventListener('mouseup', this.upListener);
    window.addEventListener('scroll', this.scrollListener);

    const frame = () => {
      if(!this._mounted) return;
      this.scroll();
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  componentWillUnmount() {
    this._mounted = false;

    window.removeEventListener('mousemove', this.moveListener);
    window.removeEventListener('mouseup', this.upListener);
    window.removeEventListener('scroll', this.scrollListener);
  }

  async reloadList(update = false, set = true) {
    if(this._mounted)
      this.setState({ loading: true });
    else
      this.state = { ...this.state, loading: true };

    const id = this.props.match.params.id;

    let list = null;
    if(!update) {
      list = await matchList(id);
      if(list) list.cached = true;
    }

    if(list === null)
      try {
        list = await get(`/list/${id}`);
      } catch(e) {}

    if(list) {
      this.props.requeueRecent(list.name);

      if(update) {
        await storeList(id, list);
        list.cached = true;
        console.log('Cached');
      }
    }

    if(set) {
      this.setState({ list, loading: false });

      if(List.initial) {
        // Find initial in list
        const index = list.entries.findIndex(e => e === List.initial);

        if(index >= 0) {
          // Fetch entry first
          await this.props.fetchEntry(List.initial);
          this.playIndex(index);
        }

        List.initial = false;
      }
    }

    return list;
  }

  async handleAdd() {
    this.setState({ addWorking: true });
    const target = parseTarget(this.state.addTarget);
    if(!target) {
      alert('Meow, check your input.');
      this.setState({ addWorking: false });
      return;
    }

    const ids = await get(`/entry/download/${target}`);
    await post(`/list/${this.props.match.params.id}/entries`, ids);

    this.setState({ adding: false, addWorking: false });
    return this.reloadList(true);
  }

  async handleImport() {
    this.setState({ importWorking: 0 });
    const target = parseFavlist(this.state.importTarget);
    if(!target) {
      alert('Meow, check your input.');
      this.setState({ importWorking: null });
      return;
    }

    const { uid, favid } = target;

    const avs = await get(`/helper/playlist/${uid}/${favid}`);
    this.setState({ importLength: avs.length });

    const mapped = avs.map((e, i) => [e, i]);
    for(const [av, index] of mapped) {
      this.setState({ importWorking: index+1 });
      const ids = await get(`/entry/download/${av}`);
      await post(`/list/${this.props.match.params.id}/entries`, ids);
    }

    this.setState({ importWorking: null, importing: false });
  }

  playIndex(index) {
    this.props.play(this.state.list, index);
  }

  playList() {
    if(this.props.isPlaying) // No-op, don't play the first track to mess everyone up
      return;
    const index = this.state.list.entries.findIndex(e => e === this.props.playingId);
    if(index !== -1)
      this.playIndex(index);
    else
      this.playIndex(0);
  }

  async prefetchList() {
    this.setState({ prefetchingList: true });
    const promises = [];
    for(const id of this.state.list.entries) {
      const inst = this.props.store.get(id);
      if(inst && inst.status === 'ready' && !inst.cached)
        promises.push(this.props.prefetchEntry(id));
    }
    await Promise.all([this.reloadList(true), ...promises]);
    this.setState({ prefetchingList: false });
  }

  async deleteEntry(e) {
    await get(`/list/${this.props.match.params.id}/entries/${e}`, 'DELETE');
    return this.reloadList(true);
  }

  // Moving
  startMove(i, ev) {
    if(!this.props.login) return;

    ev.preventDefault();
    this.startY = ev.clientY;
    this.diffY = 0;
    this.setState({ moving: i, movingTo: i });
  }

  async commitMove() {
    if(this.state.moving === null) return;
    const { movingTo } = this.state;

    this.setState({ updating: true });

    await post(`/list/${this.props.match.params.id}/entries/move`, {
      from: this.state.moving,
      to: movingTo,
    });

    const list = await this.reloadList(true, false);
    // await this.reloadList(true);

    this.setState({ list, loading: false, movingTo, moving: movingTo });

    setTimeout(() => {
      this.setState({ updating: false });
      this.setState({ movingTo: null, moving: null });
    });
  }

  processInput(ev) {
    if(this.state.moving === null) {
      this.scrolling = null;
      return;
    } else if(this.state.updating) {
      this.scolling = null;
      return;
    }

    // Calculate newPos
    this.curY = ev.clientY;

    let scrolling = null;
    if(ev.clientY <= FAST_SCROLL_ZONE_WIDTH)
      scrolling = 'fast-up';
    else if(ev.clientY >= window.innerHeight - FAST_SCROLL_ZONE_WIDTH)
      scrolling = 'fast-down';
    else if(ev.clientY <= SCROLL_ZONE_WIDTH)
      scrolling = 'up';
    else if(ev.clientY >= window.innerHeight - SCROLL_ZONE_WIDTH)
      scrolling = 'down';

    this.scrolling = scrolling;

    this.recalcMovingTarget();
  }

  scroll() {
    if(this.scrolling === null) return;
    const original = window.scrollY;

    if(this.scrolling === 'fast-up')
      window.scrollBy(0, -FAST_SCROLL_SPEED);
    else if(this.scrolling === 'fast-down')
      window.scrollBy(0, FAST_SCROLL_SPEED);
    else if(this.scrolling === 'up')
      window.scrollBy(0, -SCROLL_SPEED);
    else
      window.scrollBy(0, SCROLL_SPEED);

    const diff = window.scrollY - original;
    this.diffY += diff;
  }

  recalcMovingTarget() {
    if(this.state.moving === null) return;

    let diff = this.curY + this.diffY - this.startY;

    let neg = diff < 0;
    if(neg) diff = -diff;

    let incr = Math.floor(0.5 + diff / ENTRY_HEIGHT);
    if(neg) incr = -incr;
    let newPos = this.state.moving + incr;
    if(newPos < 0) newPos = 0;
    else if(newPos >= this.state.list.entries.length) newPos = this.state.list.entries.length-1;

    this.setState({ movingTo: newPos });
  }

  getEntryStyles(i) {
    if(this.state.moving === null) return {};

    if(i === this.state.moving) return { transform: this.getMovingTransform() };
    else return { transform: this.getOthersTransform(i) };
  }

  getMovingTransform() {
    return `translateY(${(this.state.movingTo - this.state.moving) * ENTRY_HEIGHT}px)`;
  }

  getOthersTransform(i) {
    if(i < this.state.moving && i < this.state.movingTo) return 'translateY(0)';
    if(i > this.state.moving && i > this.state.movingTo) return 'translateY(0)';

    if(i < this.state.moving)
      return `translateY(${ENTRY_HEIGHT}px)`
    else
      return `translateY(-${ENTRY_HEIGHT}px)`
  }

  shouldComponentUpdate(nextProps, nextState) {
    for(const k in nextState)
      if(nextState[k] !== this.state[k])
        return true;

    for(const k in nextProps)
      if(nextProps[k] !== this.props[k]) {
        if(typeof nextProps[k] === 'function') continue;
        if(k === 'match') {
          if(nextProps.match.params.id !== this.props.match.params.id)
            return true;
        } else return true;
      }

    return false;
  }

  render() {
    const {
      isPlaying,
      playingIndex,
      store,
      login,
      prefetching,
      canInstall,
    } = this.props;

    const {
      loading,
      list,
      adding,
      importing,
      addTarget,
      addWorking,
      importTarget,
      importWorking,
      importLength,
      prefetchingList,
      moving,
      updating,
    } = this.state;

    let importText = 'Import';
    if(importWorking === 0)
      importText = 'Fetching AV Numbers...';
    else if(importWorking !== null)
      importText = `${importWorking}/${importLength}...`;

    const navRegion = <React.Fragment>
      { canInstall ? 
          <div className="actions">
            <Icon onClick={() => this.props.doInstall}>widgets</Icon>
          </div>
          : null }
      <NavLink to="/">
        <Icon className="home-btn">home</Icon>
      </NavLink>
    </React.Fragment>


    if(loading && list === null)
      return <div className="list">
        <div className="list-loading">
          <div className="loading"></div>
        </div>
      </div>

    if(list === null)
      return <div className="list">
        <div className="title">
          <div className="title-content"></div>
          B
          <div className="actions">
            { navRegion }
          </div>
        </div>
        <div className="list-empty list-empty-disabled">
          <Icon>cloud_off</Icon>
          Not Found!
        </div>
      </div>

    const prefetchingIcon = prefetchingList || list.entries.some(e => prefetching.has(e));
    let downloadBtn = <Icon onClick={() => this.prefetchList()}>get_app</Icon>;
    let prefetchBtn = <Icon onClick={() => this.reloadList(true)}>sync</Icon>;

    if(this.state.loading || prefetchingList) {
      prefetchBtn = <Icon className="disabled rotate">sync</Icon>;
    } else if(list.entries.length === 0) {
      prefetchBtn = null;
    }

    if(prefetchingIcon) {
      downloadBtn = null;
    } else if(list.entries.length === 0) {
      downloadBtn = null;
    } else if(list.cached && list.entries.every(e => {
      let inst = store.get(e);
      if(inst && !inst.cached) console.log(inst);
      return !inst || inst.cached;
    })) {
      downloadBtn = null;
    }

    let className = 'list';
    if(updating) className += ' updating';
    if(login) className += ' can-drag';

    return <div className={className}>
      <div className="title">
        <Icon>queue_music</Icon>
        <div className="title-content">{ list.name }</div>
        <div className="actions">
          { navRegion }

          { login ?
              <React.Fragment>
                <Icon onClick={() => this.setState({ adding: true })}>add</Icon>
                <Icon onClick={() => this.setState({ importing: true })}>subscriptions</Icon>
              </React.Fragment>
              : null }
              
          { downloadBtn }
          { prefetchBtn }
          { list.entries.map(e => store.get(e)).find(e => e && e.status === 'ready') !== undefined ?
              <Icon className="primary" onClick={() => this.playList()}>play_arrow</Icon> : null }
        </div>
      </div>
      <div className="entries">
        { list.entries.map((e, i) => <Entry
          key={e}
          id={e}
          className={i === moving ? 'moving' : ''}
          style={this.getEntryStyles(i)}
          onPlay={() => this.playIndex(i)}
          onDelete={() => this.deleteEntry(e)}
          onCache={() => this.props.prefetchEntry(e)}
          isActive={isPlaying && playingIndex === i}
          onArtDrag={ev => this.startMove(i, ev)}
        />)}

        { /* Not login */ }
        { list.entries.length === 0 ? (
          login ?
          <div className="list-empty" onClick={() => this.setState({ adding: true })}>
            <Icon>add</Icon>
            Add Entry
          </div>
          :
          <div className="list-empty list-empty-disabled">
            <Icon>signal_cellular_no_sim</Icon>
            Cats Have Gone, Nothing's Here
          </div>
        ) : null }
      </div>

      <Dialog open={adding} onClose={() => this.setState({ adding: false, addWorking: null })}>
        <div className="dialog-title">
          <Icon>add</Icon>
          Add Entry
        </div>

        <div className="input-hint">AV Number or URL</div>
        <input
          placeholder="av, sm or full URL"
          value={addTarget}
          onChange={ev => this.setState({ addTarget: ev.target.value })}
        />

        <div className="dialog-actions">
          <button onClick={() => this.handleAdd()} disabled={addWorking}>{ addWorking ? 'Working...' : 'Add'}</button>
        </div>
      </Dialog>

      <Dialog open={importing} onClose={() => this.setState({ importing: false })}>
        <div className="dialog-title">
          <Icon>subscriptions</Icon>
          Import Favlist
        </div>

        <div className="input-hint">Favlist URL (Public)</div>
        <input
          placeholder="https://space.bilibili.com/123/favlist?fid=456"
          value={importTarget}
          onChange={ev => this.setState({ importTarget: ev.target.value })}
        />

        <div className="dialog-actions">
          <button onClick={() => this.handleImport()} disabled={importWorking !== null}>{ importText }</button>
        </div>
      </Dialog>
    </div>;
  }
};

const mapS2P = (state, props) => ({
  isPlaying: state.playing && state.playing.list._id === props.match.params.id,
  playingIndex: state.playing && state.playing.index,
  playingId: state.playing && state.playing.list.entries[state.playing.index],
  store: state.store,
  login: state.login,
  prefetching: state.prefetching,
  canInstall: state.installer !== null,
});

const mapD2P = (dispatch, props) => ({
  play: (list, index) => dispatch(playEntry(list, index)),
  prefetchEntry: id => dispatch(prefetchEntry(id)),
  fetchEntry: id => dispatch(fetchEntry(id)),
  requeueRecent: name => dispatch(queueRecent(props.match.params.id, name)),
  doInstall: () => dispatch(install()),
});
export default connect(mapS2P, mapD2P)(List);
