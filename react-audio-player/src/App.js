import React, { useState, useEffect, useRef, useCallback } from 'react';

function App() {
  const [lyricsData, setLyricsData] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const [nextLine, setNextLine] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playButtonText, setPlayButtonText] = useState('Start');
  const audioRef = useRef(null);
  const intervalRef = useRef(null); // To store interval ID for clearing

  // Fetch Lyric Data
  useEffect(() => {
    fetch('/belair.json')
      .then(response => response.json())
      .then(data => {
        setLyricsData(data.lines);
        setNextLine(data.lines[0] || null); // Initialize nextLine with the first line
      })
      .catch(error => console.error('Error fetching lyrics:', error));
  }, []);

  const resetPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = true;
    }
    setIsPlaying(false);
    setPlayButtonText('Start');
    setCurrentLine(null);
    if (lyricsData && lyricsData.length > 0) {
      setNextLine(lyricsData[0]);
    } else {
      setNextLine(null);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [lyricsData, audioRef]);

  // Call resetPlayer when lyricsData is loaded to ensure nextLine is set
  // and when resetPlayer itself changes (though with useCallback, it only changes if its own dependencies change)
  useEffect(() => {
    if (lyricsData.length > 0) {
      resetPlayer(); // Initialize player state once lyrics are loaded
    }
  }, [lyricsData, resetPlayer]);


  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      // If it's the very first play or after a stop, unmute and set up lines
      if (!isPlaying && audioRef.current.currentTime === 0) {
        audioRef.current.muted = false;
        // Ensure lines are reset if it was a fresh start after stop
        if (lyricsData.length > 0) {
          setCurrentLine(null); // No line displayed initially
          setNextLine(lyricsData[0]);
        }
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setPlayButtonText('Pause');
      }).catch(error => console.error("Error playing audio:", error));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayButtonText('Start');
    }
  };

  const handleStop = () => {
    resetPlayer();
  };

  // Audio Event: onEnded
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handleAudioEnd = () => {
        resetPlayer();
      };
      audioElement.addEventListener('ended', handleAudioEnd);
      return () => {
        audioElement.removeEventListener('ended', handleAudioEnd);
      };
    }
  }, [resetPlayer]); // Add resetPlayer to dependencies


  // Lyric Synchronization Logic (onTimeUpdate)
  useEffect(() => {
    const audioElement = audioRef.current;

    const handleTimeUpdate = () => {
      if (!audioElement || !lyricsData || lyricsData.length === 0) return;

      const playTime = audioElement.currentTime;
      // console.log(playTime.toFixed(1)); // For debugging

      if (nextLine && nextLine.time <= playTime) {
        setCurrentLine(nextLine);
        // Find the index of the current nextLine and set the one after it
        const currentNextLineIndex = lyricsData.findIndex(line => line.time === nextLine.time && line.text === nextLine.text);
        if (currentNextLineIndex !== -1 && currentNextLineIndex + 1 < lyricsData.length) {
          setNextLine(lyricsData[currentNextLineIndex + 1]);
        } else {
          setNextLine(null); // No more lines
        }
      } else if (!nextLine && currentLine && audioElement.currentTime >= audioElement.duration - 0.5) {
        // If there's no next line and we are at the end of the song, clear current line
        // The 0.5s buffer helps catch the "end" more reliably before the 'ended' event
        setCurrentLine(null);
      }
    };

    if (isPlaying) {
      // We use a manual interval for more control over update frequency if needed,
      // but for basic lyric sync, 'timeupdate' event on audio element is better.
      // However, the original code used setInterval, so let's refine that logic.

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start a new interval
      intervalRef.current = setInterval(handleTimeUpdate, 100); // Check every 100ms

    } else {
      // If not playing, clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup interval on component unmount or when isPlaying changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, lyricsData, nextLine, currentLine]); // Dependencies for the lyric sync effect


  return (
    <>
      <header>
        <h1>the fresh prince</h1>
        <p><a href="https://kenoir.github.io/the_fresh_prince/">https://kenoir.github.io/the_fresh_prince/</a></p>
      </header>

      <audio ref={audioRef} id="track" src="/audio/belair.mp3" muted>
        <p>Your browser sucks and you should feel bad.</p>
      </audio>

      <div id="loudspeaker" data-testid="loudspeaker">
        {currentLine ? currentLine.text : ''}
      </div>

      <div id="controls">
        <button id="stop" type="button" onClick={handleStop}>stop</button>
        <button id="play" type="button" onClick={togglePlayPause}>{playButtonText}</button>
      </div>
    </>
  );
}

export default App;
