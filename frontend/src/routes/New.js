import React from 'react';

import { NavLink, withRouter } from 'react-router-dom';

import { post } from '../util';

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
        <button onClick={() => this.handleNew()}>Create</button>
      </div>
    );
  }

  async handleNew() {
    const resp = await post('/list', { name: this.state.title });
    this.props.history.push(`/${resp._id}`);
  }
};

export default withRouter(New);
