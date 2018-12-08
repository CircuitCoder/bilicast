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
    const { entry, onPlay } = this.props;

    let className = 'entry';
    if(this.props.className) className += ' ' + this.props.className;
    if(!entry || entry.status !== 'ready') className += ' ' + 'entry-not-ready';

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
                { entry.source } - { entry.category }
            </div></a>
            :
            <div className="entry-hint">
              { entry.source } - { entry.category }
            </div>
        }
      </div>
      <div className="entry-actions">
        { entry.status === 'ready' ?
            <Icon className="primary" onClick={onPlay}>play_arrow</Icon>
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

  const re = /^https?:\/\/(www\.)?bilibili.com\/video\/(av\d+)(\?.*)?$/;
  const match = target.match(re);

  if(match) return match[2];
  return null;
}

class List extends React.PureComponent {
  state = {
    list: null,
    adding: false,
    importing: false,

    addTarget: '',
  }

  constructor(props) {
    super(props);

    this.reloadList();
  }

  async reloadList() {
    const list = await get(`/list/${this.props.match.params.id}`);

    this.setState({ list });
  }

  async handleAdd() {
    this.setState({ adding: false });
    const target = parseTarget(this.state.addTarget);
    if(!target) alert('Meow, check your input.');

    const { _id: eid } = await get(`/entry/download/${target}`);
    await post(`/list/${this.props.match.params.id}/entries`, [eid]);
    return this.reloadList();
  }

  playEntry(entry) {
    this.props.play(entry, this.state.list);
  }

  playList() {
    this.playEntry(this.state.list.entries[0]);
  }

  render() {
    const { list, adding, importing, addTarget } = this.state;
    if(list === null)
      return <div className="loading"></div>;

    return <div className="list">
      <div className="title">
        <Icon>queue_music</Icon>
        { list.name }
        <div className="actions">
          <Icon onClick={() => this.setState({ adding: true })}>add</Icon>
          <Icon>list</Icon>
          { list.entries.length > 0 ? <Icon className="primary" onClick={() => this.playList()}>play_arrow</Icon> : null }
        </div>
      </div>
      <div className="entries">
        { list.entries.map(e => <Entry key={e} id={e} onPlay={() => this.playEntry(e)} />)}
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
          <button onClick={() => this.handleAdd()}>Add</button>
        </div>
      </Dialog>
    </div>;
  }
};

const mapS2P = null;
const mapD2P = (dispatch, props) => ({
  play: (id, list) => dispatch(playEntry(id, list)),
});
export default connect(mapS2P, mapD2P)(List);
