import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';


const redirect_uri = 'http://localhost:3000/';
const client_id = 'd2686e8e912a4591a9c0dd7a449bf456';
const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-private';

function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}


class App extends Component {
  constructor(props) {
    super(props);

    var params = getHashParams();

    this.state = {
      access_token: params.access_token || null
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

    const {access_token} = this.state;

    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + access_token);

    const result = await fetch('https://api.spotify.com/v1/me', {headers});

    console.log(result);

  }
  renderOptions() {

    return (
      <div>
        <button onClick={this.handleListPlaylists}>List playlists</button>
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
