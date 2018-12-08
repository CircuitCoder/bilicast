import React from 'react';

import { connect } from 'react-redux';

import { NavLink } from 'react-router-dom';

import { get, post, artwork } from '../util';
import { fetchEntry } from '../store/actions';

import Icon from '../Icon';

class EntryImpl extends React.PureComponent {
  constructor(props) {
    super(props);

    if(!this.props.entry) this.props.reload();
  }

  render() {
    const entry = this.props.entry;
    if(!entry) return (
      <div className={this.props.className}>
        <div className="loading"></div>
      </div>
    );

    return <div className={this.props.className}>
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
        <div className="entry-hint">{ entry.source } - { entry.category }</div>
      </div>
      <div className="entry-actions">
        { entry.ref ? <a href={entry.ref} target="_blank"><Icon>open_in_browser</Icon></a> : null }
        <Icon className="primary">play_arrow</Icon>
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

class List extends React.PureComponent {
  state = {
    list: null,
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
    const adding = prompt("AV?");

    const { _id: eid } = await get(`/entry/download/${adding}`);
    console.log(eid);

    await post(`/list/${this.props.match.params.id}/entries`, [eid]);
    return this.reloadList();
  }

  render() {
    const { list } = this.state;
    if(list === null)
      return <div className="loading"></div>;

    return <div className="list">
      <div className="title">
        <Icon>queue_music</Icon>
        { list.name }
        <div className="actions">
          <Icon onClick={() => this.handleAdd()}>add</Icon>
          <Icon>list</Icon>
          <Icon className="primary">play_arrow</Icon>
        </div>
      </div>
      <div className="entries">
        { list.entries.map(e => <Entry key={e} className="entry" id={e} />)}
        { list.entries.length === 0 ?
            <div className="list-empty" onClick={() => this.handleAdd()}>
              <Icon>add</Icon>
              Add Entry
            </div>
            : null }
      </div>
    </div>;
  }
};

export default List;
