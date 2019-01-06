This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

Below you will find some information on how to perform common tasks.<br>
You can find the most recent version of this guide [here](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md).

# Swing Dj

## Setup

* source playlists are called `swingdj` and `swingdj2X`
* spotify mostly recognize correct tempos, but in some cases it detects half of the actual tempo. You can check if tempos are correct [here](http://sortyourmusic.playlistmachinery.com). If there is song with half tempo (typically it indicates 90-120bpm for fast song), add such song _additionally_ to `swingdj2X` playlist, so swingdj can recognize that. Its necessary to do that always when adding new songs.

## Local files

Its also possible to add local files (which does not exist in spotify) to swingdj playlist. 

* Its necessary to manually measure bpm - for example using [http://www.beatsperminuteonline.com](http://www.beatsperminuteonline.com)
* Add bpm information to song name metadata. For example change name `There s Frost On The Moon` to `183 There s Frost On The Moon`. I usually use VLC to edit mp3 metadata (menu window->Media Information...).
* Add it to swingdj playlist
* Unfortunately Spotify API does not allow to add local files automatically to the new playlist. Therefore once playlist is created it provides information where you need to add local files. 

## Known Issues

* It can create playlist only up to 100 songs, which is about 5 hours. This can be improved if its needed.