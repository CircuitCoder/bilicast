import React from 'react';

export default function({ children, className, ...props }) {
  return <i className={(className || '') + ' material-icons'} {...props}>{ children }</i>
}
