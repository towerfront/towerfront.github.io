import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsContext } from '../contexts/SettingsContext';

const OptionsMenu = () => {
  const navigate = useNavigate();
  const { difficulty, setDifficulty, showFPS, setShowFPS } = useContext(SettingsContext);

  return (
    <div className="options-menu">
      <h2 className="game-title" style={{ fontSize: '2rem', marginBottom: '30px' }}>Options</h2>
      
      <div className="options-section">
        <label className="option-label">Difficulty</label>
        <div className="option-buttons">
          {['easy', 'medium', 'hard', 'expert'].map(level => (
            <button
              key={level}
              className={`option-btn ${difficulty === level ? 'active' : ''}`}
              onClick={() => setDifficulty(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="options-section">
        <label className="option-label">Show FPS Counter</label>
        <div className="option-buttons">
          <button
            className={`option-btn ${showFPS ? 'active' : ''}`}
            onClick={() => setShowFPS(true)}
          >On</button>
          <button
            className={`option-btn ${!showFPS ? 'active' : ''}`}
            onClick={() => setShowFPS(false)}
          >Off</button>
        </div>
      </div>

      <div className="options-section" style={{ marginTop: '20px', opacity: 0.5 }}>
        <label className="option-label">Sound (Coming Soon)</label>
      </div>

      <button className="game-button" style={{ marginTop: '30px' }} onClick={() => navigate('/')}>
        Back to Menu
      </button>

      <style>{`
        .options-menu {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 30px;
          min-width: 400px;
        }
        .options-section {
          width: 100%;
          max-width: 400px;
          margin-bottom: 20px;
        }
        .option-label {
          display: block;
          color: var(--light-color);
          font-family: 'Cinzel Decorative', serif;
          font-size: 1rem;
          margin-bottom: 8px;
          text-align: left;
        }
        .option-buttons {
          display: flex;
          gap: 8px;
        }
        .option-btn {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid var(--secondary-color);
          border-radius: 6px;
          background: transparent;
          color: var(--light-color);
          font-family: 'Josefin Sans', sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .option-btn:hover {
          background: rgba(141, 110, 99, 0.3);
        }
        .option-btn.active {
          background: var(--secondary-color);
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default OptionsMenu;
