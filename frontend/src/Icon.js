import React from 'react';

export default function({ children, className }) {
  return <i className={(className || '') + ' material-icons'}>{ children }</i>
}
