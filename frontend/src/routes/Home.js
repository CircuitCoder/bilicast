import React from 'react';

import { NavLink } from 'react-router-dom';

import Icon from '../Icon';

const Home = () => (
  <NavLink to="/new" component="div" className="home">
    <Icon>playlist_add</Icon>
    <div className="splash-hint">Create Playlist</div>
  </NavLink>
);

export default Home;
