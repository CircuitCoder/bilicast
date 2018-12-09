import React from 'react';

import { connect } from 'react-redux';

import { get, post, artwork } from '../util';
import { fetchEntry, playEntry } from '../store/actions';

import Icon from '../Icon';
import Dialog from '../Dialog';

class EntryImpl extends React.PureComponent {
  constructor(props) {
    super(props);

    if(!this.props.entry) this.props.reload();
  }

  render() {
    const { entry, onPlay, onDelete, isActive } = this.props;

    let className = 'entry';
    if(this.props.className) className += ' ' + this.props.className;
    if(!entry || entry.status !== 'ready') className += ' entry-not-ready';
    if(isActive) className += ' active';

    if(!entry) return (
      <div className={className}>
        <div className="loading"></div>
      </div>
    );

    return <div className={className}>
      <div className="entry-artwork">
        { entry.status !== 'preparing' ?
            <div style={{backgroundImage: `url(${artwork(entry._id)})`}} className="entry-artwork-internal" />
            :
            <div className="entry-artwork-internal entry-artwork-loading">
              <div className="loading"></div>
            </div>
        }
      </div>
      <div className="entry-info">
        <div className="entry-title">{ entry.title }</div>
        <div className="entry-author">{ entry.uploader }</div>
        { entry.ref ?
            <a href={entry.ref} target="_blank"><div className="entry-hint entry-hint-clickable">
                { entry.source } - P{entry.page} - { entry.category }
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
              <Icon>get_app</Icon>
              <Icon onClick={onDelete}>delete</Icon>
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
  console.log(url);
  const re = /^https?:\/\/space\.bilibili\.com\/(\d+)\/favlist\?fid=(\d+)$/;
  const match = url.match(re);
  console.log('wtf');

  if(match) return {
    uid: match[1],
    favid: match[2],
  };

  return null;
}

class List extends React.PureComponent {
  state = {
    list: null,
    adding: false,
    importing: false,

    addTarget: '',
    addWorking: false,

    importTarget: '',
    importWorking: null,
    importLength: 0,
  }

  constructor(props) {
    super(props);

    this.reloadList();
  }

  componentDidUpdate(pp) {
    if(pp.match.params.id !== this.props.match.params.id)
      this.reloadList();
  }

  async reloadList() {
    this.setState({ list: null });
    const list = await get(`/list/${this.props.match.params.id}`);

    this.setState({ list });
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
    return this.reloadList();
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

  async deleteEntry(e) {
    await get(`/list/${this.props.match.params.id}/entries/${e}`, 'DELETE');
    return this.reloadList();
  }

  render() {
    const { isPlaying, playingIndex, store } = this.props;
    const { list, adding, importing, addTarget, addWorking, importTarget, importWorking, importLength } = this.state;

    let importText = 'Import';
    if(importWorking === 0)
      importText = 'Fetching AV Numbers...';
    else if(importWorking !== null)
      importText = `${importWorking}/${importLength}...`;

    if(list === null)
      return <div className="loading"></div>;

    return <div className="list">
      <div className="title">
        <Icon>queue_music</Icon>
        { list.name }
        <div className="actions">
          <Icon onClick={() => this.setState({ adding: true })}>add</Icon>
          <Icon onClick={() => this.setState({ importing: true })}>subscriptions</Icon>
          { list.entries.map(e => store.get(e)).find(e => e && e.status === 'ready') !== undefined ?
              <Icon className="primary" onClick={() => this.playList()}>play_arrow</Icon> : null }
        </div>
      </div>
      <div className="entries">
        { list.entries.map((e, i) => <Entry
          key={e}
          id={e}
          onPlay={() => this.playIndex(i)}
          onDelete={() => this.deleteEntry(e)}
          isActive={isPlaying && playingIndex === i}
        />)}

        { list.entries.length === 0 ?
            <div className="list-empty" onClick={() => this.setState({ adding: true })}>
              <Icon>add</Icon>
              Add Entry
            </div>
            : null }
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
});

const mapD2P = (dispatch, props) => ({
  play: (list, index) => dispatch(playEntry(list, index)),
});
export default connect(mapS2P, mapD2P)(List);
