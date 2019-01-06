import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import { cacheFirst } from "sw-toolbox";

// const redirect_uri = "http://localhost:4000/";
const redirect_uri = "https://jardakotesovec.github.io/swingdj/";

const client_id = "d2686e8e912a4591a9c0dd7a449bf456";
const scope =
  "user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private";

const defaultBpmRanges = [
  { min: 110, max: 120, rate: 5 },
  { min: 120, max: 140, rate: 58 },
  { min: 140, max: 160, rate: 27 },
  { min: 160, max: 180, rate: 3 },
  { min: 180, max: 200, rate: 5 },
  { min: 200, max: 230, rate: 2 }

  /*{ min: 130, max: 140, rate: 0.16 },
  { min: 140, max: 150, rate: 0.14 },
  { min: 150, max: 160, rate: 0.14 },
  { min: 160, max: 170, rate: 0.14 },
  { min: 170, max: 180, rate: 0.14 },
  { min: 180, max: 190, rate: 0.14 },
  { min: 190, max: 200, rate: 0.14 }*/
];

const defaultPlaylistDuration = 3 * 60 * 60 * 1000;

function getHashParams() {
  var hashParams = {};
  var e,
    r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while ((e = r.exec(q))) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

async function spotifyGet(url, access_token) {
  let headers = new Headers();
  headers.append("Authorization", "Bearer " + access_token);

  const response = await fetch(url, { headers });
  return response.json();
}

async function spotifyPost(url, payload, access_token) {
  let headers = new Headers();
  headers.append("Authorization", "Bearer " + access_token);
  headers.append("Content-Type", "application/json");

  const response = await fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function fetchAll(url, itemField = "items", access_token) {
  const items = [];

  let urlToFetch = url;

  while (1) {
    const result = await spotifyGet(urlToFetch, access_token);
    Array.prototype.push.apply(items, result[itemField]);

    if (result.next) {
      urlToFetch = result.next;
    } else {
      break;
    }
  }

  return items;
}

async function fetchIds(url, _ids, itemField, limit = 100, access_token) {
  const items = [];
  const ids = _ids.slice();

  while (ids.length) {
    const idsToFetch = ids.splice(0, Math.min(100, ids.length));
    const result = await spotifyGet(
      `${url}${idsToFetch.join(",")}`,
      access_token
    );
    Array.prototype.push.apply(items, result[itemField]);
  }

  return items;
}

class App extends Component {
  constructor(props) {
    super(props);

    var params = getHashParams();

    const presetsString = localStorage.getItem("presets");
    let presetsLoaded = presetsString ? JSON.parse(presetsString) : null;

    if (!presetsLoaded) {
      presetsLoaded = [
        {
          name: "default",
          bpmRanges: defaultBpmRanges,
          playlistDuration: defaultPlaylistDuration,
          sourcePlaylistName: "swingdj",
          sourcePlaylist2XName: "swingdj2X"
        }
      ];
    } else {
      // set new defaults
      presetsLoaded = presetsLoaded.map(p => ({
        sourcePlaylistName: "swingdj",
        sourcePlaylist2XName: "swingdj2X",
        ...p
      }));
    }

    this.state = {
      errorMessage: null,
      access_token: params.access_token || null,
      instructions: [],
      selectedPresetIndex: 0,
      presets: presetsLoaded
    };
  }
  saveToLocalStorage = () => {
    const { presets } = this.state;
    localStorage.setItem("presets", JSON.stringify(presets));
  };

  handleLogin() {
    var url = "https://accounts.spotify.com/authorize";
    url += "?response_type=token";
    url += "&client_id=" + encodeURIComponent(client_id);
    url += "&scope=" + encodeURIComponent(scope);
    url += "&redirect_uri=" + encodeURIComponent(redirect_uri);
    window.location = url;
  }

  handleUpdateBpmInput(property, rangeIndex, value) {
    const { presets, selectedPresetIndex } = this.state;
    const preset = presets[selectedPresetIndex];
    const { bpmRanges } = preset;
    // would be nicer to do it in immutable way.. but too much hussle
    bpmRanges[rangeIndex][property] = value;

    this.setState(
      {
        presets
      },
      () => {
        this.saveToLocalStorage();
      }
    );
  }

  handleAddRange(rangeIndex) {
    const { presets, selectedPresetIndex } = this.state;
    const preset = presets[selectedPresetIndex];
    const { bpmRanges } = preset;
    const bpmRange = bpmRanges[rangeIndex];
    bpmRanges.splice(rangeIndex + 1, 0, {
      min: bpmRange.max,
      max: bpmRange.max,
      rate: 0
    });

    this.setState({ presets }, () => {
      this.saveToLocalStorage();
    });
  }

  handleRemoveRange = rangeIndex => {
    const { presets, selectedPresetIndex } = this.state;
    const preset = presets[selectedPresetIndex];
    const { bpmRanges } = preset;
    const bpmRange = bpmRanges[rangeIndex];
    bpmRanges.splice(rangeIndex, 1);
    this.setState({ presets }, () => {
      this.saveToLocalStorage();
    });
  };

  handleDuplicatePreset = () => {
    const { presets, selectedPresetIndex } = this.state;
    const duplicatedPreset = JSON.parse(
      JSON.stringify(presets[selectedPresetIndex])
    );
    duplicatedPreset.name += " copy";
    presets.push(duplicatedPreset);

    this.setState(
      {
        presets
      },
      () => {
        this.saveToLocalStorage();
      }
    );
  };
  handleDeletePreset = () => {
    const { presets, selectedPresetIndex } = this.state;
    if (presets.length === 1) {
      return;
    }
    presets.splice(selectedPresetIndex, 1);
    this.setState({ presets, selectedPresetIndex: 0 }, () => {
      this.saveToLocalStorage();
    });
  };
  handleListPlaylists = async () => {
    const { access_token, presets, selectedPresetIndex } = this.state;

    const preset = presets[selectedPresetIndex];
    const { playlistDuration, bpmRanges } = preset;
    const sourcePlaylistName = preset.sourcePlaylistName;
    const sourcePlaylist2XName = preset.sourcePlaylist2XName;
    const playlists = await fetchAll(
      `https://api.spotify.com/v1/me/playlists?limit=50`,
      "items",
      access_token
    );
    // find swingdj playlist

    const mainPlaylist = playlists.find(p => p.name === sourcePlaylistName);
    const main2XPlaylist = playlists.find(p => p.name === sourcePlaylist2XName);

    const mpTracksAll = await fetchAll(
      `${mainPlaylist.tracks.href}`,
      "items",
      access_token
    );
    const mpTracks = mpTracksAll.filter(t => !t.is_local);
    const mpTracksLocal = mpTracksAll.filter(t => t.is_local);
    const mpTracks2X = await fetchAll(
      `${main2XPlaylist.tracks.href}`,
      "items",
      access_token
    );

    const track2XIds = mpTracks2X.map(t => t.track.id);

    const mpTrackIds = mpTracks.map(s => s.track.id);
    const mpFeatures = await fetchIds(
      "https://api.spotify.com/v1/audio-features/?ids=",
      mpTrackIds,
      "audio_features",
      100,
      access_token
    );

    const tracks = mpFeatures.map(af => {
      const tempo = track2XIds.includes(af.id) ? af.tempo * 2 : af.tempo;

      if (track2XIds.includes(af.id)) {
        console.log(af.tempo, tempo);
      }

      const trackObject = mpTracksAll.find(t => t.track.id === af.id);
      return {
        id: af.id,
        tempo,
        duration: af.duration_ms,
        uri: af.uri,
        name: trackObject.track.name,
        isLocal: false
      };
    });

    const instructions = [];

    // add local tracks
    mpTracksLocal.forEach(t => {
      const name = t.track.name;
      const tempo = parseFloat(name.split(" ")[0]);
      if (isNaN(tempo) || tempo < 80 || tempo > 300) {
        instructions.push(`Missing tempo for: ${name}`);
      }
      tracks.push({
        id: null,
        tempo: tempo,
        duration: t.track.duration_ms,
        uri: t.track.uri,
        name: t.track.name,
        isLocal: true
      });
    });

    if (instructions.length) {
      this.setState({
        instructions
      });
      return;
    }

    const tracksInBands = bpmRanges.map(() => []);

    tracks.forEach(songInfo => {
      const index = bpmRanges.findIndex(
        br => songInfo.tempo >= br.min && songInfo.tempo < br.max
      );

      if (index > -1) {
        tracksInBands[index].push(songInfo);
      }
    });

    let currentPlaylistDuration = 0;
    let currentTrackCount = 0;
    const tracksSelected = bpmRanges.map(() => []);

    // pick the songs
    while (currentPlaylistDuration < playlistDuration) {
      // find which band needs more songs
      const rateDiffs = bpmRanges.map((br, i) =>
        currentTrackCount === 0
          ? 1
          : br.rate / 100 - tracksSelected[i].length / currentTrackCount
      );

      let rangeIndexToBeUsed = -1;
      bpmRanges.forEach((br, i) => {
        if (
          rateDiffs[i] >= 0 &&
          (rangeIndexToBeUsed === -1 ||
            bpmRanges[rangeIndexToBeUsed].rate > br.rate)
        ) {
          rangeIndexToBeUsed = i;
        }
      });

      const trackIndexToAdd = Math.floor(
        Math.random() * tracksInBands[rangeIndexToBeUsed].length
      );

      if (tracksInBands[rangeIndexToBeUsed].length === 0) {
        this.setState({
          errorMessage: `Not enough songs in bpmRange: ${
            bpmRanges[rangeIndexToBeUsed].min
          }-${bpmRanges[rangeIndexToBeUsed].max}`
        });
        return;
      }
      const trackToAdd = tracksInBands[rangeIndexToBeUsed][trackIndexToAdd];
      tracksSelected[rangeIndexToBeUsed].push(trackToAdd);
      tracksInBands[rangeIndexToBeUsed].splice(trackIndexToAdd, 1);
      currentTrackCount++;
      currentPlaylistDuration += trackToAdd.duration;
    }

    const trackSlots = [];

    const bpmRangesSorted = bpmRanges
      .map((br, i) => Object.assign({}, br, { index: i }))
      .sort((br1, br2) => {
        return br1.rate > br2.rate;
      });

    // fill slots with equal distribution
    bpmRangesSorted.forEach(br => {
      const bandTrackCount = tracksSelected[br.index].length;
      tracksSelected[br.index].forEach((track, j) => {
        const segmentWidth = currentTrackCount / bandTrackCount;
        const targetIndex = Math.round(j * segmentWidth + segmentWidth / 2);

        let shootRange = 0;
        while (1) {
          const leftShoot = Math.max(0, targetIndex - shootRange);
          const rightShot = Math.min(
            currentTrackCount - 1,
            targetIndex + shootRange
          );

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
      });
    });

    // create new playlist

    const userMe = await spotifyGet(
      "https://api.spotify.com/v1/me",
      access_token
    );
    const createPlaylist = await spotifyPost(
      `https://api.spotify.com/v1/users/${userMe.id}/playlists`,
      { name: "swingdj NEW", public: false },
      access_token
    );

    const newPlaylistId = createPlaylist.id;

    trackSlots.forEach((t, i) => {
      if (t.isLocal) {
        let afterPart = "";
        if (i > 0) {
          afterPart = `${trackSlots[i - 1].name}`;
        }
        let beforePart = "";
        if (i < trackSlots.length - 1) {
          beforePart = `${trackSlots[i + 1].name}`;
        }
        instructions.push(
          `Put "${t.name}" between "${afterPart}" AND "${beforePart}"`
        );
      }
    });

    this.setState({
      instructions,
      errorMessage: null
    });

    console.log(trackSlots.length);
    const addTracks = await spotifyPost(
      `https://api.spotify.com/v1/users/${
        userMe.id
      }/playlists/${newPlaylistId}/tracks`,
      {
        uris: trackSlots.filter(t => !t.isLocal).map(t => t.uri)
      },
      access_token
    );
    //console.log(trackSlots)

    //console.log(tracksSelected)
  };
  renderPresetsList() {
    const { presets, selectedPresetIndex } = this.state;

    return (
      <div>
        <div>
          {presets.map((preset, i) => (
            <button
              style={{
                backgroundColor:
                  i === selectedPresetIndex ? "#F0E68C" : "#ffffff"
              }}
              onClick={() => {
                this.setState({
                  selectedPresetIndex: i
                });
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    );
  }
  renderPresetControls() {
    const { presets, selectedPresetIndex } = this.state;
    const preset = presets[selectedPresetIndex];
    const { bpmRanges } = preset;
    let totalRate = 0;
    bpmRanges.forEach(bpmRange => (totalRate += bpmRange.rate));
    return (
      <div>
        <div style={{ textAlign: "left" }}>
          <div>
            Preset Name:{" "}
            <input
              value={preset.name}
              onChange={e => {
                preset.name = e.target.value;
                this.setState({ presets }, () => {
                  this.saveToLocalStorage();
                });
              }}
            />
          </div>
          <div>
            Playlist duration:{" "}
            <input
              value={Math.round(preset.playlistDuration / 60000)}
              onChange={e => {
                preset.playlistDuration = parseInt(e.target.value) * 60000;
                this.setState({ presets }, () => this.saveToLocalStorage());
              }}
            />
            min
          </div>
          <div>
            Source Playlist:
            <input
              value={preset.sourcePlaylistName}
              onChange={e => {
                preset.sourcePlaylistName = e.target.value;
                this.setState({ presets }, () => this.saveToLocalStorage());
              }}
            />
          </div>
          <div>
            Source 2X Playlist:
            <input
              value={preset.sourcePlaylist2XName}
              onChange={e => {
                preset.sourcePlaylist2XName = e.target.value;
                this.setState({ presets }, () => this.saveToLocalStorage());
              }}
            />
          </div>
        </div>
        <table>
          {bpmRanges.map((bpmRange, i) => (
            <tr>
              <td>
                <input
                  value={bpmRange.min}
                  onChange={e => {
                    this.handleUpdateBpmInput(
                      "min",
                      i,
                      parseInt(e.target.value)
                    );
                  }}
                />
              </td>
              <td>
                <input
                  value={bpmRange.max}
                  onChange={e => {
                    this.handleUpdateBpmInput(
                      "max",
                      i,
                      parseInt(e.target.value)
                    );
                  }}
                />
              </td>
              <td>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bpmRange.rate}
                  onChange={e => {
                    this.handleUpdateBpmInput(
                      "rate",
                      i,
                      parseInt(e.target.value)
                    );
                  }}
                />
              </td>
              <td>{Math.round(bpmRange.rate)}%</td>
              <td>
                <button onClick={() => this.handleAddRange(i)}>
                  Add Range
                </button>
              </td>
              <td>
                <button onClick={() => this.handleRemoveRange(i)}>
                  Remove Range
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td />
            <td />
            <td style={{ backgroundColor: totalRate == 100 ? "white" : "red" }}>
              {totalRate}%
            </td>
            <td />
            <td />
            <td />
          </tr>
        </table>
        <div>
          {" "}
          <div style={{ textAlign: "left" }}>
            <button onClick={this.handleDuplicatePreset}>
              Duplicate Preset
            </button>
            <button onClick={this.handleDeletePreset}>Delete Preset</button>
          </div>
        </div>
      </div>
    );
  }
  renderOptions() {
    const { instructions, errorMessage } = this.state;
    return (
      <div>
        <div>{this.renderPresetsList()}</div>
        <div>{this.renderPresetControls()}</div>
        <div>
          <div>
            <button onClick={this.handleListPlaylists}>
              Create new playlist
            </button>
          </div>
          <div>
            {errorMessage ? (
              <span style={{ color: "red" }}>{errorMessage}</span>
            ) : null}
          </div>
          {instructions.map(instruction => (
            <div>
              <p>{instruction}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  renderLogin() {
    return (
      <div>
        <button onClick={this.handleLogin}>Log in</button>
      </div>
    );
  }
  render() {
    const { access_token } = this.state;

    const content = access_token ? this.renderOptions() : this.renderLogin();

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">SwingDj</h1>
          <a href="https://github.com/jardakotesovec/swingdj/blob/master/README.md">
            documentation
          </a>
        </header>
        {content}
      </div>
    );
  }
}

export default App;
