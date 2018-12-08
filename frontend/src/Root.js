import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import { artwork, music } from './util';

import {
  Home,
  New,
  List,
} from './routes';

import './Root.scss';

const mapS2P = state => ({
  playing: state.playing,
});

class Root extends React.PureComponent {
  state = {
    progress: 0,
  }

  constructor(props) {
    super(props);

    this.audio = React.createRef();
  }

  componentDidUpdate(pp, ps) {
    if(!this.props.playing)
      this.stop();

    if(pp.playing && this.props.playing.entry === pp.playing.entry)
      return;

    this.play();
  }

  stop() {
    // TODO: stop
  }

  async play() {
    const audio = this.audio.current;

    audio.src = music(this.props.playing.entry);
    await audio.load()
    // TODO: check if the track has changed
    // TODO: setup media notification

    this.setState({ progress: 0 });
    audio.play();
  }

  updateProgress() {
    const audio = this.audio.current;
    const progress = audio.currentTime / audio.duration;

    this.setState({ progress });
  }

  render() {
    const { playing } = this.props;
    const { progress } = this.state;

    return (
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
          { playing ? 
              <div className="playing">
                <div className="bottom-artwork" style={{backgroundImage: `url(${artwork(playing.entry)})`}}></div>
                <div className="control">
                  <div className="progress">
                    <div className="progress-inner" style={{}}></div>
                  </div>
                </div>
              </div>
              : null
          }
          <div className="progress">
            <div className="progress-inner" style={{
              transform: `translateX(-${playing ? (1 - progress) * 100 : 0}%)`,
            }}>
            </div>
          </div>
          <div className="actions">
          </div>

          <div className="audio">
            <audio ref={this.audio} onTimeUpdate={() => this.updateProgress()}></audio>
          </div>
        </nav>
      </div>
    );
  }
}

export default connect(mapS2P)(Root);
