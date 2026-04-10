import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import LevelManager from '../game/LevelManager';

const difficultyColors = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#f44336',
  expert: '#9C27B0',
};

const LevelSelector = ({ startGame }) => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  
  useEffect(() => {
    const allLevels = LevelManager.getAllLevels();
    setLevels(allLevels);
  }, []);

  return (
    <div className="level-selector">
      <div className="level-selector-header">
        <Logo size="small" />
        <h2 className="game-title">Select Level</h2>
      </div>
      
      <div className="game-panel level-grid-container">
        <div className="level-grid">
          {levels.map((level, index) => (
            <button
              key={level.id}
              className="level-card"
              onClick={() => startGame(level.id)}
            >
              <div className="level-card-number">{index + 1}</div>
              <div className="level-card-name">{level.name || `Level ${index + 1}`}</div>
              {level.difficulty && (
                <div
                  className="level-card-difficulty"
                  style={{ color: difficultyColors[level.difficulty] || '#aaa' }}
                >
                  {level.difficulty.charAt(0).toUpperCase() + level.difficulty.slice(1)}
                </div>
              )}
              <div className="level-card-info">
                {level.towerCount || '?'} towers
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <button className="game-button back-button" onClick={() => navigate('/')}>
        Back to Menu
      </button>
      
      <style>
        {`
        .level-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
        }
        .level-selector-header {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .level-grid-container {
          width: 100%;
          max-width: 720px;
          margin-bottom: 16px;
          padding: 16px;
          box-sizing: border-box;
          overflow-y: auto;
          flex: 1 1 auto;
          min-height: 0;
        }
        .level-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .level-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.15) 100%);
          border: 2px solid var(--dark-color, #5D4037);
          border-radius: 10px;
          padding: 12px 8px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          color: var(--light-color, #FFF8E1);
          font-family: 'Josefin Sans', sans-serif;
        }
        .level-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
          border-color: var(--accent-color, #FFD54F);
        }
        .level-card-number {
          font-family: 'Cinzel Decorative', serif;
          font-size: 1.6rem;
          font-weight: bold;
          line-height: 1;
          color: var(--accent-color, #FFD54F);
        }
        .level-card-name {
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
          min-height: 2.4em;
          display: flex;
          align-items: center;
        }
        .level-card-difficulty {
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .level-card-info {
          font-size: 0.7rem;
          opacity: 0.55;
        }
        .back-button {
          margin-top: 12px;
        }
        `}
      </style>
    </div>
  );
};

export default LevelSelector;
