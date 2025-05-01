import React from 'react';
import { useNavigate } from 'react-router-dom';

const PauseMenu = ({ onResume, onRestart, onBackToMenu }) => {
  const navigate = useNavigate();

  const handleBackToMenu = () => {
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="pause-container">
      <div className="pause-content">
        <h1>Paused</h1>
        <div className="pause-buttons">
          <button className="pause-button" onClick={onResume}>
            Back to Game
          </button>
          <button className="pause-button" onClick={onRestart}>
            Restart Level
          </button>
          <button className="pause-button" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .pause-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 100;
        }
        
        .pause-content {
          background-color: rgba(40, 40, 40, 0.95);
          border: 3px solid #555;
          border-radius: 10px;
          padding: 30px 50px;
          text-align: center;
          width: 300px;
        }
        
        h1 {
          font-size: 2.5rem;
          color: white;
          margin-bottom: 30px;
        }
        
        .pause-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .pause-button {
          background-color: #333;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 12px 20px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .pause-button:hover {
          background-color: #555;
        }
      `}</style>
    </div>
  );
};

export default PauseMenu;