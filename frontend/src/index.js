import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();

// Register a service worker of my own
window.addEventListener('load', () => {
  navigator.serviceWorker.register(process.env.PUBLIC_URL + '/sw.js').then(reg => {
    reg.onupdatefound = () => {
      const worker = reg.installing;
      if(worker === null)
        return;
      worker.onstatechange = () => {
        if(worker.state === 'installed')
          worker.postMessage({
            type: 'setEnv',
            env: process.env.NODE_ENV
          });
      };
    };
  });;
});
