import React from 'react';

import { connect } from 'react-redux';

const mapS2P = state => ({
  list: state.list,
  entry: state.entry,
});

const Root = ({ list, entry }) => (
  <div className="list">
    Hi
  </div>
)

export default connect(mapS2P)(Root);
