import React from 'react';

import { get } from '../util';

class List extends React.PureComponent {
  state = {
    list: null,
  }

  constructor(props) {
    super(props);

    this.reloadList();
  }

  async reloadList() {
    this.setState({ list: null });

    const list = await get(`/list/${this.props.match.params.id}`);

    this.setState({ list });
  }

  render() {
    const { list } = this.state;
    if(list === null)
      return <div className="loading"></div>;

    return <div className="list">
      <div className="list-name">{ list.name }</div>
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
