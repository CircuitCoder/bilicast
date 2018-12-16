import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';

import { setRepeat, playEntry, fetchEntry } from './store/actions';

import { artwork, music } from './util';

import Icon from './Icon';

import {
  Home,
  New,
  List,
  Login,
} from './routes';

import './Root.scss';

function findNext({ playing: { list: { entries }, index }, repeating }) {
  if(repeating === null && index === entries.length - 1) return null;
  if(repeating === 'SHUFFLE') return -1;
  return (index + 1) % entries.length;
}

function findPrev({ playing: { list: { entries }, index }, repeating }) {
  if(repeating === null && index === 0) return null;
  if(repeating === 'SHUFFLE') return null;

  if(index === 0) return entries.length - 1;
  return index - 1;
}

function nextRepeatState(cur) {
  if(cur === null) return 'REPEAT';
  if(cur === 'REPEAT') return 'SHUFFLE';
  return null;
}

function repeatIcon(cur) {
  if(cur === null) return 'trending_flat';
  if(cur === 'SHUFFLE') return 'shuffle';
  return 'repeat';
}

const mapS2P = state => {
  const playingEntry = state.playing ? state.playing.list.entries[state.playing.index] : null;
  return {
    playing: state.playing,
    playingEntry,
    playingEntryInst: playingEntry ? state.store.get(playingEntry) : null,
    repeating: state.repeating,

    next: state.playing ? findNext(state) : null,
    prev: state.playing ? findPrev(state) : null,

    login: state.login,
  };
};

const mapD2P = dispatch => ({
  setRepeat: repeat => dispatch(setRepeat(repeat)),
  playEntry: (list, index) => dispatch(playEntry(list, index)),
  fetchEntry: id => dispatch(fetchEntry(id)),
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

  componentDidMount() {
    if('mediaSession' in window.navigator) {
      const session = window.navigator.mediaSession;
      session.setActionHandler('play', () => {
        this.play();
      });

      session.setActionHandler('pause', () => {
        this.pause();
      });

      this.setupPrevHandler();
      this.setupNextHandler();
    }
  }

  componentWillUnmount() {
    console.log('unmount');
  }

  setupPrevHandler() {
    if(!('mediaSession' in window.navigator)) return;
    const session = window.navigator.mediaSession;
    if(this.props.prev)
      session.setActionHandler('previoustrack', () => {
        this.prev();
      });
    else
      session.setActionHandler('previoustrack', null);
  }

  setupNextHandler() {
    if(!('mediaSession' in window.navigator)) return;
    const session = window.navigator.mediaSession;
    if(this.props.next)
      session.setActionHandler('nexttrack', () => {
        this.next();
      });
    else
      session.setActionHandler('nexttrack', null);
  }

  componentDidUpdate(pp, ps) {
    this.setupPrevHandler();
    this.setupNextHandler();

    if(!this.props.playing)
      navigator.mediaSession.playbackState = 'none';
    else if(this.state.paused)
      navigator.mediaSession.playbackState = 'paused';
    else
      navigator.mediaSession.playbackState = 'playing';

    if(!this.props.playingEntry) {
      this.stop();
      return;
    }

    if(pp.playingEntry && this.props.playingEntry === pp.playingEntry)
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

    const entry = this.props.playingEntry;

    let inst = this.props.playingEntryInst;
    if(!inst || inst.status !== 'ready') {
      if(this.props.next)
        this.next();
      else this.props.playEntry(this.props.playing.list, 0);

      return;
      // Looping around is highly unprobably, because we've already blocked list play when no entry is known to be ready
      // and non-ready entries can't be played directly either
    }

    audio.src = music(this.props.playingEntry);
    await audio.load()
    // TODO: setup media notification

    if(this.props.playingEntry !== entry) return;

    this.setState({ progress: 0 });
    audio.play();
  }

  prev() {
    if(this.props.prev !== null)
      this.props.playEntry(this.props.playing.list, this.props.prev);
  }

  next() {
    if(this.props.next === null)
      return
    let next = this.props.next;
    if(next === -1) {
      // Randomize
      const len = this.props.playing.list.entries.length;
      const cur = this.props.playing.index;

      let pick = Math.floor(Math.random() * (len-1));

      if(pick >= cur) ++pick;
      next = pick;
    }

    this.props.playEntry(this.props.playing.list, next);
  }

  updateProgress() {
    const audio = this.audio.current;
    const progress = audio.currentTime / audio.duration;

    this.setState({ progress });
  }

  render() {
    const {
      playing,
      repeating,
      setRepeat,
      playingEntry,
      playingEntryInst,
      prev,
      next,
      login,
    } = this.props;

    const { progress, paused } = this.state;

    return (
      <Router>
        <div className="frame">
          <div className="top">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route exact path="/new" component={New} />
              <Route exact path="/login" component={Login} />
              <Route exact path="/:id" component={List} />
            </Switch>
          </div>
          <nav className="bottom">
            { playing ? 
                <div className="playing">
                  <div className="artwork" style={{backgroundImage: `url(${artwork(playingEntry)})`}}></div>
                  <div className="info">
                    <div className="playing-title">{ playingEntryInst ? playingEntryInst.title : '' }</div>
                    <div className="playing-author">{ playingEntryInst ? playingEntryInst.uploader : '' }</div>
                    <div className="playing-list">{ playing.list.name }</div>
                  </div>
                  <div className="control">
                    <Icon onClick={() => this.prev()} className={prev === null ? 'disabled' : ''}>skip_previous</Icon>
                    { paused ? 
                        <Icon onClick={() => this.play()}>play_arrow</Icon>
                        :
                        <Icon onClick={() => this.pause()}>pause</Icon>
                    }
                    <Icon onClick={() => this.next()} className={next === null ? 'disabled' : ''}>skip_next</Icon>
                    <div className="spacer"></div>
                    <Icon onClick={() => setRepeat(nextRepeatState(repeating))}>{ repeatIcon(repeating) }</Icon>
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
            <div className="spanner"></div>
            <div className="actions">
              { login ? 
                  <NavLink to="/new">
                    <Icon>playlist_add</Icon>
                  </NavLink>
                  :
                  <NavLink to="/login">
                    <Icon>person</Icon>
                  </NavLink>
              }
            </div>

            <div className="audio">
              <audio
                ref={this.audio}
                onTimeUpdate={() => this.updateProgress()}
                onPause={() => this.setState({ paused: true })}
                onPlay={() => this.setState({ paused: false })}
                onEnded={() => this.next()}
              />
            </div>
          </nav>
        </div>
      </Router>
    );
  }
}

export default connect(mapS2P, mapD2P)(Root);
