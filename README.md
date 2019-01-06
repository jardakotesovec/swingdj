# Swing Dj

## Setup

* Source playlists have to be named `swingdj` and `swingdj2X`
* Spotify mostly recognize correct tempos, but in some cases it detects half of the actual tempo. You can check if tempos are correct [here](http://sortyourmusic.playlistmachinery.com). If there is song with half tempo (typically it indicates 90-120bpm for fast song), add such song ALSO to `swingdj2X` playlist, so swingdj can recognize that. Its necessary to do that only when adding new songs.

## Presets

* Its possible to create several presets which remembers bpm ranges and playlist duration for different occasions. Its saved to browser local storage, which means you need to open swingdj from same browser on same computer to see saved presets.

## Local files

Its also possible to add local files (which does not exist in spotify) to swingdj playlist. 

* Its necessary to manually measure bpm - for example using [http://www.beatsperminuteonline.com](http://www.beatsperminuteonline.com)
* Add bpm information to song name metadata. For example change name `There s Frost On The Moon` to `183 There s Frost On The Moon`. I usually use VLC to edit mp3 metadata (menu window->Media Information...).
* Add it to swingdj playlist.
* Unfortunately Spotify API does not allow to add local files automatically to the new playlist. Therefore once playlist is created it provides information where you need to add local files. 

## Known Issues

* It can create playlist only up to 100 songs, which is about 5 hours. This can be improved if its needed.
* Sometimes it takes Spotify app more time to detect new playlists. Restarting spotify can speed it up.