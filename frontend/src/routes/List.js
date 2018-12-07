import React from 'react';

import { connect } from 'react-redux';

import { get, post } from '../util';
import { fetchEntry } from '../store/actions';

class EntryImpl extends React.PureComponent {
  constructor(props) {
    super(props);

    if(!props.entry) this.props.reload();
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
      <div className="list-name">{ list.name }</div>
      <button onClick={() => this.handleAdd()}>Add</button>
      <div className="entries">
        { list.entries.map(e =>
          <div className="entry">
            {JSON.stringify(e)}
          </div>
        )}
        { list.entries.length === 0 ?
          <div className="entry-empty">Empty</div>
          : null }
      </div>
    </div>;
  }
};

export default List;
