import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import {
  Home,
  New,
} from './routes';

const mapS2P = state => ({
  list: state.list,
  entry: state.entry,
});

const Root = ({ list, entry }) => (
  <Router>
    <Switch>
      <Route exact path="/" component={Home} />
      <Route exact path="/new" component={New} />
      <Route exact path="/:id" component={Home} />
    </Switch>
  </Router>
)

export default connect(mapS2P)(Root);
