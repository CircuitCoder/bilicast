import React from 'react';

import { connect } from 'react-redux';

import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';

import { setRepeat, playEntry, fetchEntry, login, logout } from './store/actions';

import { artwork, music, savedAuth, unauth } from './util';

import Icon from './Icon';

import {
  Home,
  New,
  List,
  Login,
  Storage,
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

function formatTimer(time, ref) {
  const hasHour = ref >= 3600;

  if(hasHour) {
    const refHourLen = Math.floor(ref / 3600).length;
    const hour = Math.floor(time / 3600).toString().padStart(refHourLen, '0');
    const min = (Math.floor(time / 60) % 60).toString().padStart(2, '0');
    const sec = Math.round(time % 60).toString().padStart(2, '0');
    return `${hour}:${min}:${sec}`;
  } else {
    const refMinLen = Math.floor(ref / 60).length;
    const min = Math.floor(time / 60).toString().padStart(refMinLen, '0');
    const sec = Math.round(time % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }
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
  doLogin: () => dispatch(login()),
  doLogout: () => dispatch(logout()),
});

class Root extends React.PureComponent {
  state = {
    progress: 0,
    phantomProgress: 0,
    timer: 'Loading...',
    paused: false,
    noauth: false,

    artwork: null,
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

    savedAuth().then(result => {
      if(result === null) {
        this.setState({ noauth: true });
        this.props.doLogin();
      } else if(result) this.props.doLogin();
    });
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

    if(navigator.mediaSession) {
      if(!this.props.playing)
        navigator.mediaSession.playbackState = 'none';
      else if(this.state.paused)
        navigator.mediaSession.playbackState = 'paused';
      else
        navigator.mediaSession.playbackState = 'playing';
    }

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
    this.setState({ timer: 'Loading...' });

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

    audio.src = await music(this.props.playingEntry);
    await audio.load()

    if(this.props.playingEntry !== entry) return;

    this.setState({ progress: 0 });
    if(Number.isNaN(audio.duration))
      this.setState({ timer: `${formatTimer(0, 0)}` });
    else
      this.setState({ timer: `${formatTimer(0, audio.duration)} - ${formatTimer(audio.duration, audio.duration)}` });
    audio.play();

    // Load artwork
    this.setState({ artwork: null });
    const art = await artwork(this.props.playingEntry);
    this.setState({ artwork: art });
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
    if(Number.isNaN(audio.duration))
      this.setState({ timer: `${formatTimer(audio.currentTime, 0)}` });
    else
      this.setState({ timer: `${formatTimer(audio.currentTime, audio.duration)} - ${formatTimer(audio.duration, audio.duration)}` });
  }

  async doLogout() {
    await unauth();
    this.props.doLogout();
  }

  updatePhantomProgress(ev) {
    const ratio = ev.clientX / ev.target.offsetWidth;
    this.setState({ phantomProgress: ratio });
  }

  seek(ev) {
    const ratio = ev.clientX / ev.target.offsetWidth;
    const audio = this.audio.current;
    if(!audio) return;

    console.log(audio.duration * ratio);

    audio.currentTime = audio.duration * ratio;
  }

  render() {
    const {
      playing,
      repeating,
      setRepeat,
      playingEntryInst,
      prev,
      next,
      login,
    } = this.props;

    const {
      progress,
      phantomProgress,
      timer,
      paused,
      noauth,
      artwork: art,
    } = this.state;

    return (
      <Router>
        <div className="frame">
          <div className="top">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route exact path="/new" component={New} />
              <Route exact path="/login" component={Login} />
              <Route exact path="/storage" component={Storage} />
              <Route exact path="/:id" component={List} />
            </Switch>
          </div>
          <nav className="bottom">
            { playing ? 
                <div className="playing">
                  <div className="artwork" style={{backgroundImage: `url(${art})`}}></div>
                  <div className="info">
                    <div className="playing-title">{ playingEntryInst ? playingEntryInst.title : '' }</div>
                    <div className="playing-author">{ playingEntryInst ? playingEntryInst.uploader : '' }</div>
                    <div className="playing-list">{ playing.list.name }</div>
                  </div>
                  <div className="dash">
                    <div className="timer">
                      { timer }
                    </div>
                    <div className="control">
                      <NavLink to={`/${playing.list._id}`}><Icon>queue_music</Icon></NavLink>
                      <div className="spacer"></div>
                      <Icon onClick={() => this.prev()} className={prev === null ? 'disabled' : ''}>skip_previous</Icon>
                      { paused ? 
                          <Icon onClick={() => this.play()}>play_arrow</Icon>
                          :
                          <Icon onClick={() => this.pause()}>pause</Icon>
                      }
                      <Icon onClick={() => this.next()} className={next === null ? 'disabled' : ''}>skip_next</Icon>
                      <div className="spacer"></div>
                      <Icon onClick={() => setRepeat(nextRepeatState(repeating))}>{ repeatIcon(repeating) }</Icon>
                    </div>
                  </div>
                </div>
                : null
            }
            <div
              className={playing ? "progress playing-progress" : "progress"}
              onMouseEnter={ev => this.updatePhantomProgress(ev)}
              onMouseMove={ev => this.updatePhantomProgress(ev)}
              onClick={ev => this.seek(ev)}
            >
              <div className="progress-inner" style={{
                transform: `translateX(-${playing ? (1 - progress) * 100 : 0}%)`,
              }}>
              </div>
              <div className="progress-phantom" style={{
                transform: `translateX(-${(1 - phantomProgress) * 100}%)`,
              }}>
              </div>
            </div>
            <div className="spanner"></div>
            <div className="actions">
              { login ? 
                  <React.Fragment>
                    <NavLink to="/new">
                      <Icon>playlist_add</Icon>
                    </NavLink>
                    { !noauth ? <Icon onClick={() => this.doLogout()}>power_settings_new</Icon> : null }
                  </React.Fragment>
                  :
                  <NavLink to="/login">
                    <Icon>build</Icon>
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
