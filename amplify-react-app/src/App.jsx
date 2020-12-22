import './App.css';

import Amplify, { API, graphqlOperation, Storage } from 'aws-amplify';
import awsconfig from './aws-exports';
import {AmplifySignOut, withAuthenticator} from '@aws-amplify/ui-react';

import { listSongs  } from './graphql/queries';
import { updateSong, createSong } from './graphql/mutations';
import { useEffect, useState } from 'react';

import { Paper, IconButton, TextField } from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import FavoriteIcon from '@material-ui/icons/Favorite';
import PauseIcon from '@material-ui/icons/Pause';
import AddIcon from '@material-ui/icons/Add';
import PublishIcon from '@material-ui/icons/Publish';

import ReactPlayer from 'react-player';

import { v4 as uuid } from 'uuid';

Amplify.configure( awsconfig );

function App() {

  const [songs, setSongs] = useState( [] );
  const [songPlaying, setSongPlaying] = useState( '' );
  const [ audioURL, setAudioURL ] = useState( '' );
  const [ showAddSong, setShowAddNewSong ] = useState( false );

  useEffect( () => fetchSongs(), [] );

  const toggleSong = async ( idx ) => {
    if ( songPlaying === idx ) {
      setSongPlaying('');
      return
    }

    const songFilePath = songs[idx].filePath;

    try {
      
      const fileAccessURL = await Storage.get( songFilePath, { expires: 60 } );
      console.log('Access URL: ', fileAccessURL);

      setSongPlaying( idx );
      setAudioURL( fileAccessURL );

      return;
    } catch (error) {
      console.error( 'Error fileAccessURL', error );
      setAudioURL('');
      setSongPlaying('');
    }

    setSongPlaying( idx )
    return
  }

  const fetchSongs =  async () => {
    try {

      console.log('test: ', API.Auth.Credentials);
      
      const songData = await API.graphql( graphqlOperation( listSongs ) );
      const songList = songData.data.listSongs.items;

      console.log( 'song List: ', songList );
      setSongs( songList )

    } catch (error) {
      console.log('Error on fetching songs: ', error);
    }
  }

  const addLike = async( idx ) => {
    try {

      const song = songs[ idx ];
      song.like += 1;

      delete song.createdAt;
      delete song.updatedAt;

      const songData = await API.graphql( graphqlOperation( updateSong, { input: song } ) )
      const songList = [...songs];

      songList[idx] = songData.data.updateSong;

      setSongs( songList );

    } catch (error) {
      console.log( 'Error add like: ', error );
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        
        <AmplifySignOut />    
        <h2>My App Content </h2>       
      </header>

      <section className = "songList">
        { songs.map( (song, idx)  => {
          
          return ( 
            <Paper variant = "outlined" elevation = {2} key={ `song${idx}` }>
              
              <section className="songCard">
                
                <IconButton aria-label = "Play" onClick= { () => toggleSong( idx ) }>
                   { songPlaying === idx ? <PauseIcon/> : <PlayArrowIcon/> } 
                </IconButton>

                <div>
                  <div className="songTitle"> {song.title} </div>
                  <div className="songOwner"> {song.owner} </div>
                </div>

                <div>
                  <IconButton aria-label = "Like" onClick = { () => addLike( idx )}>
                    <FavoriteIcon/>
                  </IconButton>
                  {song.like}
                </div>

                <div className="songDescription">{ song.description }</div>

              </section>

              {
                songPlaying === idx ? (
                  <div className = "audioPlayer" >
                    <ReactPlayer
                      url = {audioURL}
                      controls
                      playing
                      height = "50px"
                      onPause={ () => toggleSong( idx ) } />
                  </div>
                ) : null

              }

            </Paper>
          );
          
        }) }

        {
          showAddSong ? (
          <AddSong
            onUpload={() => {
            setShowAddNewSong(false);
            fetchSongs();
            }}
          />
          ) : (
            <IconButton onClick = {() => setShowAddNewSong(true)}>
              <AddIcon/>
            </IconButton>
          )}

      </section>

      
    </div>
  );
}

export default withAuthenticator(App);

const  AddSong = ( {onUpload} ) => {
  const [songData, setSongData] = useState({});
    const [mp3Data, setMp3Data] = useState();

    const uploadSong = async () => {
        //Upload the song
        console.log('songData', songData);
        const { title, description, owner } = songData;

        const { key } = await Storage.put(`${uuid()}.mp3`, mp3Data, { contentType: 'audio/mp3' });

        const createSongInput = {
            id: uuid(),
            title,
            description,
            owner,
            filePath: key,
            like: 0,
        };
        await API.graphql(graphqlOperation(createSong, { input: createSongInput }));
        onUpload();
    };

  return (
    <div className="newSong">
      
      <TextField
        label="Title"
        value={songData.title}
        onChange={e => setSongData({ ...songData, title: e.target.value })}
      />

      <TextField
        label="Artist"
        value={songData.owner}
        onChange={e => setSongData({ ...songData, owner: e.target.value })}
      />

      <TextField
        label="Description"
        value={songData.description}
        onChange={e => setSongData({ ...songData, description: e.target.value })}
      />
      
      <input type="file" accept="audio/mp3" onChange={e => setMp3Data(e.target.files[0])} />
      
      <IconButton onClick={uploadSong}>
        <PublishIcon />
      </IconButton>

    </div>
  )
}