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
} from './routes';

import './Root.scss';

function findNext({ playing: { list: { entries }, index }, repeating }) {
  if(!repeating && index === entries.length - 1) return null;
  return (index + 1) % entries.length;
}

function findPrev({ playing: { list: { entries }, index }, repeating }) {
  if(!repeating && index === 0) return null;
  if(index === 0) return entries.length - 1;
  else return index - 1;
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

  componentDidUpdate(pp, ps) {
    if(!this.props.playingEntry)
      this.stop();

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
      this.next();
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
    if(this.props.next !== null)
      this.props.playEntry(this.props.playing.list, this.props.next);
  }

  updateProgress() {
    const audio = this.audio.current;
    const progress = audio.currentTime / audio.duration;

    this.setState({ progress });
  }

  render() {
    const { playing, repeating, setRepeat, playingEntry, playingEntryInst, prev, next } = this.props;
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
                    <Icon onClick={() => setRepeat(!repeating)}>{ repeating ? 'repeat' : 'trending_flat' }</Icon>
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
              <NavLink to="/new">
                <Icon>playlist_add</Icon>
              </NavLink>
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
