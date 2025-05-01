import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import LevelManager from '../game/LevelManager';

const LevelSelector = ({ startGame }) => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  
  useEffect(() => {
    // Load available levels using the correct method from LevelManager
    const levelIds = LevelManager.getAllLevelIds();
    const availableLevels = levelIds.map(id => ({
      id,
      name: `Level ${id.replace('level', '')}`
    }));
    setLevels(availableLevels);
  }, []);

  return (
    <div className="level-selector">
      <div className="level-selector-header">
        <Logo size="small" />
        <h2 className="game-title">Select Level</h2>
      </div>
      
      <div className="game-panel map-container">
        <div className="level-map">
          {levels.map((level, index) => (
            <div key={level.id} className="level-node" style={{
              left: `${20 + (index * 20)}%`,
              top: `${30 + (Math.sin(index * 0.8) * 20)}%`
            }}>
              <div 
                className={`node-button ${index === 0 ? 'node-start' : ''}`}
                onClick={() => startGame(level.id)}
              >
                <div className="node-content">
                  <div className="level-number">{index + 1}</div>
                  <svg className="node-tower" width="30" height="40" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="60" width="50" height="80" fill="#8D6E63" />
                    <rect x="30" y="30" width="40" height="30" fill="#A1887F" />
                    <rect x="20" y="25" width="60" height="5" fill="#6D4C41" />
                    <rect x="20" y="20" width="10" height="5" fill="#6D4C41" />
                    <rect x="35" y="20" width="10" height="5" fill="#6D4C41" />
                    <rect x="50" y="20" width="10" height="5" fill="#6D4C41" />
                    <rect x="65" y="20" width="10" height="5" fill="#6D4C41" />
                    <rect x="45" y="100" width="10" height="20" fill="#5D4037" />
                  </svg>
                </div>
                <div className="level-name">{level.name || `Level ${index + 1}`}</div>
              </div>
              
              {/* Path to next level */}
              {index < levels.length - 1 && (
                <div className="level-path"></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <button className="game-button back-button" onClick={() => navigate('/')}>
        Back to Menu
      </button>
      
      {/* Use regular CSS classes instead of styled-jsx */}
      <style>
        {`
        .level-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }
        
        .level-selector-header {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .map-container {
          width: 80%;
          min-height: 400px;
          position: relative;
          margin-bottom: 30px;
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236d4c41' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
        
        .level-map {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
        }
        
        .level-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2;
        }
        
        .node-button {
          width: 70px;
          height: 70px;
          background-color: var(--secondary-color);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 2px 3px rgba(255, 255, 255, 0.3);
          border: 3px solid var(--dark-color);
          transition: all 0.2s ease;
          position: relative;
        }
        
        .node-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
        }
        
        .node-start {
          background-color: var(--accent-color);
          animation: pulse 2s infinite;
        }
        
        .node-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .level-number {
          position: absolute;
          top: -25px;
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--light-color);
          text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
          font-family: 'Cinzel Decorative', serif;
        }
        
        .level-name {
          margin-top: 10px;
          font-family: 'Cinzel Decorative', serif;
          font-weight: bold;
          color: var(--light-color);
          text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
        }
        
        .level-path {
          position: absolute;
          width: 100px;
          height: 10px;
          background-color: var(--dark-color);
          top: 35px;
          left: 65px;
          z-index: 1;
          transform-origin: left center;
          transform: rotate(10deg);
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .back-button {
          margin-top: 20px;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        `}
      </style>
    </div>
  );
};

export default LevelSelector;
