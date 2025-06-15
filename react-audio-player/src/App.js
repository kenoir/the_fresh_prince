import { useState, useEffect, useRef, useCallback } from 'react';

// Bigger ASCII Will Smith faces
const willSmithMouthOpen = `
      _________
     /         \\
    /  o   o   \\
   |     ^      |
   |    ___     |
   |   /   \\    |
   |   \\___/    |
    \\         /
     \\_______/
`;
const willSmithMouthClosed = `
      _________
     /         \\
    /  o   o   \\
   |     ^      |
   |    ___     |
   |   |---|    |
   |           |
    \\         /
     \\_______/
`;

function App() {
  const [lyricsData, setLyricsData] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const [nextLine, setNextLine] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null); // To store interval ID for clearing

  // Fetch Lyric Data
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/belair.json`)
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
      }).catch(error => console.error("Error playing audio:", error));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
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

  // Animation state for Will Smith's mouth
  const [mouthOpen, setMouthOpen] = useState(false);
  const mouthAnimRef = useRef(null);

  // Animate mouth when lyrics are being displayed
  useEffect(() => {
    if (currentLine && currentLine.text) {
      // Start mouth animation (open/close every 250ms)
      if (!mouthAnimRef.current) {
        mouthAnimRef.current = setInterval(() => {
          setMouthOpen(prev => !prev);
        }, 250);
      }
    } else {
      // No lyrics: close mouth and stop animation
      setMouthOpen(false);
      if (mouthAnimRef.current) {
        clearInterval(mouthAnimRef.current);
        mouthAnimRef.current = null;
      }
    }
    // Cleanup on unmount
    return () => {
      if (mouthAnimRef.current) {
        clearInterval(mouthAnimRef.current);
        mouthAnimRef.current = null;
      }
    };
  }, [currentLine]);

  return (
    <>
      <style>{`
        body, #root {
          background: #181c24;
          color: #e0e6f0;
          font-family: 'Fira Mono', 'Menlo', 'Consolas', 'Liberation Mono', monospace;
          margin: 0;
          min-height: 100vh;
        }
        header {
          background: #232837;
          color: #f9f9fa;
          padding: 1.5em 2em 1em 2em;
          border-bottom: 2px solid #2c3142;
          font-family: 'Montserrat', 'Arial', sans-serif;
        }
        header h1 {
          margin: 0 0 0.2em 0;
          font-size: 2.2em;
          letter-spacing: 0.04em;
          font-weight: 700;
        }
        header a {
          color: #7ecfff;
          text-decoration: none;
          font-size: 1em;
        }
        header a:hover {
          text-decoration: underline;
        }
        #play {
          background: linear-gradient(90deg, #3a3f5a 60%, #2e3347 100%);
          color: #fff;
          border: none;
          border-radius: 2em;
          font-size: 1.1em;
          font-family: 'Montserrat', 'Arial', sans-serif;
          font-weight: 600;
          padding: 0.7em 2.2em;
          margin-left: 2em;
          box-shadow: 0 2px 8px #0002;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        #play:hover {
          background: linear-gradient(90deg, #4a90e2 60%, #357ab8 100%);
          color: #fff;
        }
        #ascii-will-smith {
          background: #232837;
          color: #7ecfff;
          border-radius: 1em;
          box-shadow: 0 2px 16px #0003;
          padding: 1.2em 0.5em 1.2em 0.5em;
          margin: 2em auto 1.5em auto;
          max-width: 420px;
          font-family: 'Fira Mono', 'Menlo', 'Consolas', 'Liberation Mono', monospace;
          font-size: 1.7em;
          text-align: center;
          line-height: 1.1;
        }
        #loudspeaker {
          background: #232837;
          color: #f9f9fa;
          border-radius: 0.7em;
          box-shadow: 0 2px 12px #0002;
          font-family: 'Montserrat', 'Arial', sans-serif;
          font-size: 1.3em;
          font-weight: 500;
          text-align: center;
          margin: 1.5em auto 0 auto;
          padding: 1.1em 1.5em;
          max-width: 600px;
          letter-spacing: 0.01em;
        }
      `}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>the fresh prince</h1>
          <p><a href="https://kenoir.github.io/the_fresh_prince/">https://kenoir.github.io/the_fresh_prince/</a></p>
        </div>
        <button
          id="play"
          type="button"
          onClick={togglePlayPause}
          style={{ alignSelf: 'flex-start', marginLeft: 'auto', minWidth: 80 }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </header>

      <pre
        id="ascii-will-smith"
        aria-label="Animated ASCII Will Smith"
      >
        {mouthOpen ? willSmithMouthOpen : willSmithMouthClosed}
      </pre>

      <audio ref={audioRef} id="track" src={`${process.env.PUBLIC_URL}/audio/belair.mp3`} muted>
        <p>Your browser sucks and you should feel bad.</p>
      </audio>

      <div id="loudspeaker" data-testid="loudspeaker">
        {currentLine ? currentLine.text : ''}
      </div>
    </>
  );
}

export default App;
