import React from 'react';

import { NavLink } from 'react-router-dom';

class New extends React.PureComponent {
  state = {
    title: "",
  }

  render() {
    return (
      <div>
        <input
          value={this.state.title}
          onChange={ev => this.setState({ title: ev.target.value })}
        />
      </div>
    );
  }
};

export default New;
