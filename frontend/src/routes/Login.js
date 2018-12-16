import React from 'react';

import { connect } from 'react-redux';

import { withRouter } from 'react-router-dom';

import Icon from '../Icon';

import { auth } from '../util';

import { login } from '../store/actions';

class Login extends React.PureComponent {
  state = {
    passphrase: '',
    working: false,
  }

  render() {
    return (
      <div className="login">
        <div className="title">
          <Icon>person</Icon>
          Login
        </div>

        <div className="input-hint">Passphrase</div>
        <input
          value={this.state.passphrase}
          onChange={ev => this.setState({ passphrase: ev.target.value })}
          type="password"
        />
        <button
          onClick={() => this.handleLogin()}
          disabled={this.state.passphrase === '' || this.state.working}
        >Login</button>
      </div>
    );
  }

  async handleLogin() {
    this.setState({ working: true });
    const ok = await auth(this.state.passphrase);
    this.setState({ working: false });
    if(ok) {
      this.props.doLogin();
      this.props.history.goBack();
    } else {
      alert('Try again!');
    }
  }
}

export default connect(
  null,
  dispatch => ({
    doLogin: () => dispatch(login()),
  }),
)(withRouter(Login));
