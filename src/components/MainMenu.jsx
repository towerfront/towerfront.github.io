import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="main-menu">
      <div className="float-animation">
        <Logo size="large" />
      </div>
      
      <div className="game-panel" style={{ marginTop: "40px", width: "300px" }}>
        <div className="menu-buttons">
          <button className="game-button" onClick={() => navigate('/levels')}>
            Play Game
          </button>
          
          <button className="game-button" onClick={() => navigate('/options')}>
            Options
          </button>
          
          <button className="game-button" onClick={() => navigate('/editor')}>
            Level Editor
          </button>
        </div>
      </div>
      
      {/* Decorative tower elements */}
      <div className="decorative-towers">
        <div className="tower left" style={{ position: 'absolute', left: '10%', bottom: '15%', opacity: 0.6 }}>
          <svg width="80" height="120" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="70" width="50" height="80" fill="#8D6E63" />
            <rect x="30" y="30" width="40" height="40" fill="#A1887F" />
            <rect x="20" y="25" width="60" height="5" fill="#6D4C41" />
            <rect x="20" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="35" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="50" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="65" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="45" y="100" width="10" height="20" fill="#5D4037" />
          </svg>
        </div>
        <div className="tower right" style={{ position: 'absolute', right: '10%', bottom: '10%', opacity: 0.6 }}>
          <svg width="70" height="100" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="70" width="50" height="80" fill="#8D6E63" />
            <rect x="30" y="30" width="40" height="40" fill="#A1887F" />
            <rect x="20" y="25" width="60" height="5" fill="#6D4C41" />
            <rect x="20" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="35" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="50" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="65" y="20" width="10" height="5" fill="#6D4C41" />
            <rect x="45" y="100" width="10" height="20" fill="#5D4037" />
          </svg>
        </div>
      </div>
      
      <style jsx>{`
        .main-menu {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          position: relative;
          overflow: hidden;
        }
        
        .menu-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .decorative-towers {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: -1;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .decorative-towers {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default MainMenu;
