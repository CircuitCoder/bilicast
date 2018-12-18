import React from 'react';

import { connect } from 'react-redux';

import { get, post, artwork } from '../util';
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

class EntryImpl extends React.PureComponent {
  state = {
    lifted: false,
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
        <div className="loading"></div>
      </div>
    );

    let prefetchingIcon = <Icon onClick={onCache}>get_app</Icon>;
    if(prefetching) prefetchingIcon = <Icon className="disabled rotate">sync</Icon>;
    else if(entry.cached) prefetchingIcon = <Icon className="disabled">done</Icon>;

    return <div className={className} style={this.props.style}>
      <div
        className="entry-artwork"
        onDragStart={onArtDrag}
        draggable="true"
      >
        { entry.status !== 'preparing' ?
            <div style={{backgroundImage: `url(${artwork(entry._id)})`}} className="entry-artwork-internal" />
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
            <Icon className="disabled rotate">sync</Icon>
        }
      </div>
    </div>
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
  if(target.match(/^av\d+/))
    return target;

  const re = /^https?:\/\/(www\.)?bilibili\.com\/video\/(av\d+)\/?(\?.*)?$/;
  const match = target.match(re);

  if(match) return match[2];
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
  }

  constructor(props) {
    super(props);

    this.reloadList();
    this.stagedMove = null;
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

    console.log('listen');

    window.addEventListener('mousemove', this.moveListener);
    window.addEventListener('mouseup', this.upListener);
  }

  componentWillUnmount() {
    this._mounted = false;

    window.removeEventListener('mousemove', this.moveListener);
    window.removeEventListener('mouseup', this.upListener);
  }

  async reloadList(update = false) {
    if(this._mounted)
      this.setState({ loading: true });
    else
      this.state = { ...this.state, loading: true };

    const query = update ? 'update' : 'cache';
    let list;
    try {
      list = await get(`/list/${this.props.match.params.id}?${query}`);
    } catch(e) {
      list = null;
    }

    this.setState({ list, loading: false });

    if(list)
      this.props.requeueRecent(list.name);

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
    ev.preventDefault();
    this.startY = ev.clientY;
    this.setState({ moving: i, movingTo: i });
  }

  commitMove() {
    this.setState({ moving: null, movingTo: null });
  }

  processInput(ev) {
    if(this.state.moving === null)
      return;

    let diff = ev.clientY - this.startY;

    let neg = diff < 0;
    if(neg) diff = -diff;

    let incr = Math.floor(0.5 + diff / ENTRY_HEIGHT);
    if(neg) incr = -incr;
    let newPos = this.state.moving + incr;
    if(newPos < 0) newPos = 0;
    else if(newPos >= this.state.list.entries.length) newPos = this.state.list.entries.length-1;

    console.log(newPos);

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

  render() {
    const {
      isPlaying,
      playingIndex,
      store,
      prefetchEntry,
      login,
      prefetching,
      canInstall,
      doInstall,
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
    } = this.state;

    let importText = 'Import';
    if(importWorking === 0)
      importText = 'Fetching AV Numbers...';
    else if(importWorking !== null)
      importText = `${importWorking}/${importLength}...`;

    const navRegion = <React.Fragment>
      { canInstall ? 
          <div className="actions">
            <Icon onClick={doInstall}>widgets</Icon>
          </div>
          : null }
      <NavLink to="/">
        <Icon className="home-btn">home</Icon>
      </NavLink>
    </React.Fragment>


    if(loading && list === null)
      return <div className="loading"></div>;

    if(list === null)
      return <div className="list">
        <div className="title">
          &nbsp;
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
    let prefetchBtn = <Icon onClick={() => this.prefetchList()}>get_app</Icon>;
    if(prefetchingIcon) prefetchBtn = <Icon className="disabled rotate">sync</Icon>;
    else if(list.entries.length === 0) prefetchBtn = null;
    else if(list.cached && list.entries.every(e => {
      let inst = store.get(e);
      return !inst || inst.cached;
    })) prefetchBtn = <Icon onClick={() => this.reloadList(true)}>sync</Icon>;

    return <div className="list">
      <div className="title">
        <Icon>queue_music</Icon>
        { list.name }
        <div className="actions">
          { navRegion }

          { login ?
              <React.Fragment>
                <Icon onClick={() => this.setState({ adding: true })}>add</Icon>
                <Icon onClick={() => this.setState({ importing: true })}>subscriptions</Icon>
              </React.Fragment>
              : null }
              
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
          onCache={() => prefetchEntry(e)}
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

      <Dialog open={adding} onClose={() => this.setState({ adding: false })}>
        <div className="dialog-title">
          <Icon>add</Icon>
          Add Entry
        </div>

        <div className="input-hint">AV Number or URL</div>
        <input
          placeholder="av1234 or https://bilibili.com/video/av1234"
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
  requeueRecent: name => dispatch(queueRecent(props.match.params.id, name)),
  doInstall: () => dispatch(install()),
});
export default connect(mapS2P, mapD2P)(List);
