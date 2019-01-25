import React from 'react';

import Icon from '../Icon';

import { NavLink } from 'react-router-dom';

import { storeStat, formatSize, deleteEntry } from '../util';

class Storage extends React.PureComponent {
  state = {
    stat: null,
    total: 0,
  }

  constructor(props) {
    super(props);

    this.reloadStat();
  }

  async reloadStat() {
    const stat = await storeStat();
    const total = stat.reduce((acc, e) => acc + e.size, 0);
    this.setState({ stat, total });
  }

  async deleteEntry(id) {
    await deleteEntry(id);
    await this.reloadStat();
  }

  render() {
    let content = <div className="storage-loading">
      <div className="loading"></div>
    </div>;

    if(this.state.stat)
      content = <div className="storage-entries">
        { this.state.stat.map(e => <div className="storage-entry" key={e._id}>
          <div className="storage-info">
            { e.single ? 
                <div className="storage-title">{ e.title }</div>
              :
                <React.Fragment>
                  <div className="storage-title-small">{ e.title }</div>
                  <div className="storage-title">{ e.subtitle }</div>
                </React.Fragment>
            }
            <div className="storage-size">{ formatSize(e.size) }</div>
          </div>
          <Icon onClick={() => this.deleteEntry(e._id)} className="storage-delete">delete</Icon>
        </div>) }
      </div>;

    return <div className="storage">
      <div className="title">
        <Icon>save</Icon>
        <div className="title-content">Storage statistic</div>
        <div className="actions">
          <NavLink to="/">
            <Icon>home</Icon>
          </NavLink>
        </div>
      </div>
      <div className="storage-entry">
        <div className="storage-title">Total: { formatSize(this.state.total) }</div>
      </div>
      { content }
    </div>;
  }
}

export default Storage;
