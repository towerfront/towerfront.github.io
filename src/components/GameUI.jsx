import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { SettingsContext } from '../contexts/SettingsContext';
import { useParams } from 'react-router-dom';

// CSS styles as JS objects
const styles = {
  gameUi: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  gameUiTop: {
    display: 'flex',
    justifyContent: 'center', // Ensure title is centered
    alignItems: 'flex-start',
    padding: '0.5rem',
    width: '100%',
    position: 'relative', // Needed for absolute positioning of pause button
  },
  levelInfo: {
    backgroundColor: 'rgba(0, 70, 140, 0.8)',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '0 0 8px 8px',
    fontWeight: 'bold',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    display: 'flex', // Make level info a flex container
    flexDirection: 'column', // Stack items vertically
    alignItems: 'center', // Center items horizontally
  },
  progressBarContainer: {
    width: '150px', // Adjust width as needed
    height: '10px', // Adjust height as needed
    backgroundColor: '#555', // Dark background for the bar
    borderRadius: '3px',
    display: 'flex',
    overflow: 'hidden', // Ensure segments stay within bounds
    marginTop: '5px', // Space between text and bar
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  progressBarSegment: {
    height: '100%',
    transition: 'width 0.2s ease-in-out', // Smooth transition for width changes
  },
  pauseButton: {
    position: 'absolute', // Position absolutely in the top-right corner
    top: '0.5rem',
    right: '1rem', // Adjusted from 0.5rem to 1rem for better spacing
    backgroundColor: 'rgba(0, 100, 150, 0.5)',
    padding: '0.3rem',
    width: '32px',
    height: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.7)',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.9rem',
  },
  pauseIcon: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '14px',
    height: '14px',
  },
  pauseBar: {
    width: '4px',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: '2px',
  },
  declareVictoryContainer: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
    pointerEvents: 'auto', // Make this section interactive
    zIndex: 11, // Ensure it's above the canvas but potentially below modals
  },
  declareVictoryText: {
    color: 'white',
    marginBottom: '0.5rem',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  declareVictoryButton: {
    padding: '10px 20px',
    backgroundColor: 'gold',
    color: '#333',
    border: '2px solid #333',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    animation: 'pulse 2s infinite',
    pointerEvents: 'auto',
  },
  fpsCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    padding: '0.5rem',
    borderRadius: '5px',
    fontFamily: 'monospace',
  }
};

const GameUI = ({ 
  gameStatus, 
  onDeclareVictory, 
  onTogglePause, 
  isPaused, 
  unitDistribution, // Receive distribution data
  teamColors // Receive team colors
}) => {
  const { showFPS, currentFPS } = useContext(SettingsContext);
  const { levelId } = useParams();
  const levelNumber = levelId ? levelId.replace(/[^\d]/g, '') : '1';

  // Sort teams for consistent bar order (optional, but good practice)
  const sortedTeams = Object.keys(unitDistribution || {}).sort();

  return (
    <div style={styles.gameUi}>
      <div style={styles.gameUiTop}>
        <div style={styles.levelInfo}>
          <div>Stage {levelNumber}</div> {/* Keep text */} 
          {/* Progress Bar */} 
          <div style={styles.progressBarContainer}>
            {sortedTeams.map(team => (
              <div 
                key={team}
                style={{
                  ...styles.progressBarSegment,
                  backgroundColor: teamColors[team] || '#ccc', // Use team color or fallback
                  width: `${unitDistribution[team]}%` // Set width based on percentage
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Pause button */}
        <button 
          style={styles.pauseButton}
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? (
            "▶"
          ) : (
            <div style={styles.pauseIcon}>
              <div style={styles.pauseBar}></div>
              <div style={styles.pauseBar}></div>
            </div>
          )}
        </button>
      </div>
      
      {/* Container for FPS counter - moved from bottom to avoid overlap */}
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', pointerEvents: 'none' }}>
        {showFPS && <div style={styles.fpsCounter}>FPS: {Math.round(currentFPS || 0)}</div>}
      </div>

      {/* "Declare Victory" section shown only during 'victorious' state */}
      {gameStatus === 'victorious' && (
        <div style={styles.declareVictoryContainer}>
          <div style={styles.declareVictoryText}>
            Victory condition met! Continue playing or declare victory to finish.
          </div>
          <button 
            onClick={onDeclareVictory}
            style={styles.declareVictoryButton}
          >
            Declare Victory
          </button>
        </div>
      )}
      
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

GameUI.propTypes = {
  gameStatus: PropTypes.oneOf(['playing', 'victorious', 'won', 'lost', 'paused']).isRequired,
  onTogglePause: PropTypes.func.isRequired,
  onDeclareVictory: PropTypes.func.isRequired, // Add prop type
  isPaused: PropTypes.bool.isRequired,
  unitDistribution: PropTypes.object.isRequired,
  teamColors: PropTypes.object.isRequired,
};

export default GameUI;
