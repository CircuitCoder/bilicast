import React from 'react';

export default function({ className, backdropClassName, open, children, onClose, ...props }) {
  let backdropClass = 'dialog-backdrop';
  if(backdropClassName) backdropClass += ' ' + backdropClassName;
  if(open) backdropClass += ' dialog-active';

  let dialogClass = 'dialog';
  if(className) dialogClass += ' ' + className;
  return <div className={backdropClass} {...props} onClick={onClose}>
    <div className={dialogClass} onClick={ev => ev.stopPropagation()}>
      { children }
    </div>
  </div>
}
