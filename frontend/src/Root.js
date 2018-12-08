import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';

import { artwork, music } from './util';

import Icon from './Icon';

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
    paused: false,
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

    this.newTrack();
  }

  stop() {
    // TODO: stop
  }

  pause() {
    if(this.state.paused) return;
    const audio = this.audio.current;
    audio.pause();
  }

  play() {
    if(!this.state.paused) return;
    const audio = this.audio.current;
    audio.play();
  }

  async newTrack() {
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
    const { progress, paused } = this.state;

    return (
      <Router>
        <div className="frame">
          <div className="top">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route exact path="/new" component={New} />
              <Route exact path="/:id" component={List} />
            </Switch>
          </div>
          <nav className="bottom">
            { playing ? 
                <div className="playing">
                  <div className="bottom-artwork" style={{backgroundImage: `url(${artwork(playing.entry)})`}}></div>
                  <div className="control">
                    <Icon>skip_previous</Icon>
                    { paused ? 
                        <Icon onClick={() => this.play()}>play_arrow</Icon>
                        :
                        <Icon onClick={() => this.pause()}>pause</Icon>
                    }
                    <Icon>skip_next</Icon>
                    <div className="spacer"></div>
                    <Icon>repeat</Icon>
                    <NavLink to={`/${playing.list._id}`}><Icon>queue_music</Icon></NavLink>
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
              <audio
                ref={this.audio}
                onTimeUpdate={() => this.updateProgress()}
                onPause={() => this.setState({ paused: true })}
                onPlay={() => this.setState({ paused: false })}
              />
            </div>
          </nav>
        </div>
      </Router>
    );
  }
}

export default connect(mapS2P)(Root);
