import React from 'react';

import { compose } from 'redux';
import { connect } from 'react-redux';

import { NavLink, withRouter } from 'react-router-dom';

import Icon from '../Icon';

const Home = ({ recents, history }) => (
  <div className="home">
    <div className="title">
      <Icon>home</Icon>
      Welcome!
    </div>

    <div className="input-hint">Jump to List (Enter)</div>
    <input className="jump-input" onKeyDown={ev => {
      if(ev.key === 'Enter')
        if(ev.target.value !== '')
          history.push(`/${ev.target.value}`);
    }}/>

    { recents.map(e => (
      <NavLink to={`/${e.id}`} key={e.id}>
        <div className="recent">
          <div className="recent-name">
            { e.name }
          </div>
          <div className="recent-id">
            { e.id }
          </div>
        </div>
      </NavLink>
    )) }
  </div>
);

export default compose(
  connect(state => ({ recents: state.recents, })),
  withRouter,
)(Home);
