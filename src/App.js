
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';


const redirect_uri = 'http://localhost:3000/';
const client_id = 'd2686e8e912a4591a9c0dd7a449bf456';
const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private';

const bpmRanges=[
    {min: 110, max:120, rate: 0.1},
    {min: 120, max:140, rate: 0.7},
    {min: 140, max:160, rate: 0.1},
    {min: 160, max:180, rate: 0.1},
   // {min: 180, max:200, rate: 0.05},
   // {min: 200, max:230, rate: 0.05},
]

const playlistDuration = 1* 60 * 60 * 1000;


function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}


async function spotifyGet(url, access_token) {

    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + access_token);

    const response = await fetch(url, {headers});
    return response.json();
}


async function spotifyPost(url, payload, access_token) {

    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + access_token);
    headers.append( 'Content-Type', 'application/json');

    const response = await fetch(url,
        {
            headers,
            method: "POST",
            body: JSON.stringify( payload )
        })

    return response.json();
}


async function fetchAll(url, itemField = 'items', access_token) {

  const items = [];

  let urlToFetch = url;

  while(1) {
      const result = await spotifyGet(urlToFetch, access_token);
      Array.prototype.push.apply(items, result[itemField]);

      if (result.next) {
        urlToFetch = result.next;
      }
      else {
        break;
      }
  }

  return items;
}

async function fetchIds(url, _ids, itemField, limit=100, access_token) {

  const items = [];
  const ids = _ids.slice();

  while(ids.length) {
    const idsToFetch = ids.splice(0, Math.min(100, ids.length));
    const result = await spotifyGet(`${url}${idsToFetch.join(',')}`, access_token);
    Array.prototype.push.apply(items, result[itemField]);
  }

  return items;

}

class App extends Component {
  constructor(props) {
    super(props);

    var params = getHashParams();

    this.state = {
      access_token: params.access_token || null,
      instructions: []
    }
  }

  handleLogin() {


    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += '&client_id=' + encodeURIComponent(client_id);
    url += '&scope=' + encodeURIComponent(scope);
    url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    window.location = url;

  }

  handleListPlaylists = async () => {

    const { access_token } = this.state;


    const playlists = await fetchAll(`https://api.spotify.com/v1/me/playlists?limit=50`, 'items', access_token);
    // find swingdj playlist

    const mainPlaylist = playlists.find(p => p.name === 'swingdj');
    const main2XPlaylist = playlists.find(p => p.name === 'swingdj2X');

    const mpTracksAll = await fetchAll(`${mainPlaylist.tracks.href}`, 'items', access_token);
    const mpTracks = mpTracksAll.filter(t => !t.is_local);
    const mpTracksLocal = mpTracksAll.filter(t => t.is_local);
    const mpTracks2X = await fetchAll(`${main2XPlaylist.tracks.href}`, 'items', access_token);

    const track2XIds = mpTracks2X.map(t => t.track.id);

    const mpTrackIds = mpTracks.map(s => s.track.id);
    const mpFeatures = await fetchIds(
        'https://api.spotify.com/v1/audio-features/?ids=',
        mpTrackIds,
        'audio_features',
        100,
        access_token);

    const tracks = mpFeatures.map(af => {

        const tempo = track2XIds.includes(af.id) ? af.tempo * 2 : af.tempo;

        if (track2XIds.includes(af.id)) {

          console.log(af.tempo, tempo)
        }

        const trackObject = mpTracksAll.find(t => t.track.id === af.id);
        return {
            id: af.id,
            tempo,
            duration: af.duration_ms,
            uri: af.uri,
            name: trackObject.track.name,
            isLocal: false
        }
    });

    // add local tracks
    mpTracksLocal.forEach(t => {

      const name = t.track.name;
      const tempo = parseFloat(name.split(' ')[0]);
      if (isNaN(tempo) || tempo < 80 || tempo > 300) {
        alert(`Missing tempo for: ${name}`);
      }
      tracks.push({
          id: null,
          tempo: tempo,
          duration: t.track.duration_ms,
          uri: t.track.uri,
          name: t.track.name,
          isLocal: true
      })
    })

    const tracksInBands = bpmRanges.map(() => []);

    tracks.forEach(songInfo => {

      const index = bpmRanges.findIndex(br =>
          songInfo.tempo >= br.min && songInfo.tempo < br.max)
      ;

      if (index > -1) {
        tracksInBands[index].push(songInfo);
      }
    });

    let currentPlaylistDuration = 0;
    let currentTrackCount = 0;
    const tracksSelected = bpmRanges.map(() => []);

    // pick the songs
    while(currentPlaylistDuration < playlistDuration) {
      // find which band needs more songs
      const rateDiffs = bpmRanges.map((br, i) =>
          currentTrackCount === 0 ? 1 : br.rate - tracksSelected[i].length / currentTrackCount
      );

      let rangeIndexToBeUsed = -1;
      bpmRanges.forEach((br, i) => {

        if (rateDiffs[i] >= 0 && (rangeIndexToBeUsed === -1 || bpmRanges[rangeIndexToBeUsed].rate > br.rate)) {
            rangeIndexToBeUsed = i;
        }
      });

      const trackIndexToAdd = Math.floor(Math.random() * tracksInBands[rangeIndexToBeUsed].length);

      const trackToAdd = tracksInBands[rangeIndexToBeUsed][trackIndexToAdd]
      tracksSelected[rangeIndexToBeUsed].push(trackToAdd);
      tracksInBands[rangeIndexToBeUsed].splice(trackIndexToAdd, 1);
      currentTrackCount++;
      currentPlaylistDuration += trackToAdd.duration;

    };

    const trackSlots = [];

    const bpmRangesSorted = bpmRanges.map((br, i) => Object.assign({}, br, {index: i})).sort((br1, br2) => {
      return br1.rate > br2.rate
    });


    // fill slots with equal distribution
    bpmRangesSorted.forEach(br => {

      const bandTrackCount = tracksSelected[br.index].length;
      tracksSelected[br.index].forEach((track, j) => {

        const segmentWidth = currentTrackCount / bandTrackCount;
        const targetIndex = Math.round(j * segmentWidth + segmentWidth / 2);

        let shootRange = 0;
        while(1) {

          const leftShoot = Math.max(0, targetIndex - shootRange);
          const rightShot = Math.min(currentTrackCount - 1, targetIndex + shootRange);

          if (!trackSlots[leftShoot]) {
            trackSlots[leftShoot] = track;
            break;
          }

          if (!trackSlots[rightShot]) {
              trackSlots[rightShot] = track;
              break;
          }
          shootRange++;
        }
      })
    });



    // create new playlist

    const userMe = await spotifyGet('https://api.spotify.com/v1/me', access_token);
    const createPlaylist = await spotifyPost(`https://api.spotify.com/v1/users/${userMe.id}/playlists`,
        {name: 'swingdj NEW', public: false},
        access_token);

    const newPlaylistId = createPlaylist.id;


    const instructions = [];
    trackSlots.forEach((t,i) => {

      if (t.isLocal) {
        let afterPart = '';
        if (i > 0) {
          afterPart = `${trackSlots[i-1].name}`
        }
        let beforePart = '';
        if (i < trackSlots.length - 1) {
          beforePart = `${trackSlots[i+1].name}`;
        }
        instructions.push(`Put "${t.name}" between "${afterPart}" AND "${beforePart}"`)
      }
    })

      console.log(instructions)
    this.setState({
        instructions
    })


    const addTracks = await spotifyPost(`https://api.spotify.com/v1/users/${userMe.id}/playlists/${newPlaylistId}/tracks`,
        {
          uris: trackSlots.filter(t => !t.isLocal).map(t => t.uri)
        },
        access_token)
    //console.log(trackSlots)

    //console.log(tracksSelected)
  }
  renderOptions() {

    const { instructions } = this.state;
    return (
      <div>
        <button onClick={this.handleListPlaylists}>Create new playlist</button>
          {instructions.map(instruction => <div><p>{instruction}</p></div>)}
      </div>
    )
  }
  renderLogin() {

    return (
      <div>
        <button onClick={this.handleLogin}>Log in</button>
      </div>
    )
  }
  render() {

    const { access_token } = this.state;


    const content = access_token ? this.renderOptions() : this.renderLogin();

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        {content}
      </div>
    );
  }
}

export default App;
