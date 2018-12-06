import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, NavLink, Switch } from 'react-router-dom';

const mapS2P = state => ({
  list: state.list,
  entry: state.entry,
});

const Root = ({ list, entry }) => (
  <Router>
  </Router>
)

export default connect(mapS2P)(Root);
