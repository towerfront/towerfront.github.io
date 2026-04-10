import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { SettingsContext } from '../contexts/SettingsContext';
import { useParams } from 'react-router-dom';
import LevelManager from '../game/LevelManager';

const GameUI = ({ 
  gameStatus, 
  onDeclareVictory, 
  onTogglePause, 
  isPaused, 
  unitDistribution,
  teamColors
}) => {
  const { showFPS, currentFPS } = useContext(SettingsContext);
  const { levelId } = useParams();
  
  // Get level name from LevelManager for a proper display
  const levelName = useMemo(() => {
    const levels = LevelManager.getAllLevels();
    const level = levels.find(l => l.id === levelId);
    return level?.name || `Stage ${levelId ? levelId.replace(/[^\d]/g, '') : '1'}`;
  }, [levelId]);

  const sortedTeams = Object.keys(unitDistribution || {}).sort();

  return (
    <div className="game-hud">
      <div className="hud-top">
        <div className="hud-level-info">
          <div className="hud-level-name">{levelName}</div>
          <div className="hud-progress-bar">
            {sortedTeams.map(team => (
              <div 
                key={team}
                className="hud-progress-segment"
                style={{
                  backgroundColor: teamColors[team] || '#ccc',
                  width: `${unitDistribution[team]}%`
                }}
              />
            ))}
          </div>
        </div>
        
        <button 
          className="hud-pause-btn"
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume' : 'Pause'}
          title="Pause (Esc)"
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>
      
      {showFPS && (
        <div className="hud-fps">FPS: {Math.round(currentFPS || 0)}</div>
      )}

      {gameStatus === 'victorious' && (
        <div className="hud-victory-banner">
          <div className="hud-victory-text">
            All enemies defeated! You can keep playing or end the match.
          </div>
          <button className="hud-victory-btn" onClick={onDeclareVictory}>
            Declare Victory
          </button>
        </div>
      )}
      
      <style>{`
        .game-hud {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          z-index: 10;
          font-family: 'Josefin Sans', sans-serif;
        }
        .hud-top {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 8px 12px;
          position: relative;
        }
        .hud-level-info {
          background: linear-gradient(180deg, rgba(0,60,120,0.9) 0%, rgba(0,40,80,0.85) 100%);
          color: white;
          padding: 8px 24px 10px;
          border-radius: 0 0 10px 10px;
          font-weight: bold;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 180px;
        }
        .hud-level-name {
          font-size: 0.95rem;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .hud-progress-bar {
          width: 160px;
          height: 8px;
          background: rgba(0,0,0,0.4);
          border-radius: 4px;
          display: flex;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .hud-progress-segment {
          height: 100%;
          transition: width 0.3s ease;
        }
        .hud-pause-btn {
          position: absolute;
          top: 8px; right: 12px;
          width: 36px; height: 36px;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.4);
          border-radius: 6px;
          color: white;
          font-size: 1rem;
          cursor: pointer;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .hud-pause-btn:hover {
          background: rgba(0,0,0,0.7);
        }
        .hud-fps {
          position: absolute;
          bottom: 10px; right: 12px;
          background: rgba(0,0,0,0.5);
          color: rgba(255,255,255,0.7);
          padding: 3px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.75rem;
        }
        .hud-victory-banner {
          position: absolute;
          bottom: 0; left: 0; width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 20px;
          background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 100%);
          pointer-events: auto;
          animation: slideUp 0.4s ease-out;
        }
        .hud-victory-text {
          color: rgba(255,255,255,0.9);
          margin-bottom: 10px;
          font-size: 0.9rem;
        }
        .hud-victory-btn {
          padding: 10px 28px;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          color: #333;
          border: 2px solid rgba(0,0,0,0.2);
          border-radius: 8px;
          font-size: 1rem;
          font-weight: bold;
          font-family: 'Cinzel Decorative', serif;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(255,165,0,0.4);
          animation: pulse 2s infinite;
          transition: transform 0.1s;
        }
        .hud-victory-btn:hover {
          transform: scale(1.05);
        }
        .hud-victory-btn:active {
          transform: scale(0.98);
        }
        @keyframes pulse {
          0% { box-shadow: 0 3px 10px rgba(255,165,0,0.4); }
          50% { box-shadow: 0 3px 20px rgba(255,165,0,0.7); }
          100% { box-shadow: 0 3px 10px rgba(255,165,0,0.4); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

GameUI.propTypes = {
  gameStatus: PropTypes.oneOf(['playing', 'victorious', 'won', 'lost', 'paused']).isRequired,
  onTogglePause: PropTypes.func.isRequired,
  onDeclareVictory: PropTypes.func.isRequired,
  isPaused: PropTypes.bool.isRequired,
  unitDistribution: PropTypes.object.isRequired,
  teamColors: PropTypes.object.isRequired,
};

export default GameUI;
