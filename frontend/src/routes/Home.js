import React from 'react';

import { connect } from 'react-redux';

import { NavLink } from 'react-router-dom';

import Icon from '../Icon';

const Home = ({ login }) =>
  login ? (
    <NavLink to="/new" component="div" className="home">
      <Icon>playlist_add</Icon>
      <div className="splash-hint">Create Playlist</div>
    </NavLink>
  ) : (
    <NavLink to="/login" component="div" className="home">
      <Icon>person</Icon>
      <div className="splash-hint">Login</div>
    </NavLink>
  );

export default connect(state => ({
  login: state.login,
}))(Home);
