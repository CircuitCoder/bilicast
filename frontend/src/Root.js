import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import {
  Home,
  New,
  List,
} from './routes';

import './Root.scss';

const mapS2P = state => ({
  list: state.list,
  entry: state.entry,
});

const Root = ({ list, entry }) => (
  <div className="frame">
    <div className="top">
      <Router>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/new" component={New} />
          <Route exact path="/:id" component={List} />
        </Switch>
      </Router>
    </div>
    <nav className="bottom">
      <div className="playing">
      </div>
      <div className="actions">
      </div>
    </nav>
  </div>
)

export default connect(mapS2P)(Root);
