import React from 'react';

import { withRouter } from 'react-router-dom';

import { post } from '../util';

import Icon from '../Icon';

class New extends React.PureComponent {
  state = {
    title: '',
    id: '',
  }

  render() {
    return (
      <div className="new">
        <div className="title">
          <Icon>playlist_add</Icon>
          Create Playlist
        </div>

        <div className="input-hint">Title</div>
        <input
          value={this.state.title}
          onChange={ev => this.setState({ title: ev.target.value })}
        />

        <div className="input-hint">ID</div>
        <input
          value={this.state.id}
          onChange={ev => this.setState({ id: ev.target.value })}
        />
        <button onClick={() => this.handleNew()}>Create</button>
      </div>
    );
  }

  async handleNew() {
    const resp = await post('/list', {
      name: this.state.title,
      id: this.state.id,
    });

    this.props.history.push(`/${resp._id}`);
  }
};

export default withRouter(New);
