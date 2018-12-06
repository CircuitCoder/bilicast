import React from 'react';

import { NavLink } from 'react-router-dom';

const Home = () => (
  <div>
    <NavLink to="/new" className="button">Create List</NavLink>
  </div>
);

export default Home;
