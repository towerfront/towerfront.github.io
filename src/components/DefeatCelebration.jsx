import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DefeatCelebration = ({ onBackToMenu }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to main menu after 3 seconds
    const timeout = setTimeout(() => {
      if (onBackToMenu) {
        onBackToMenu();
      } else {
        navigate('/');
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [navigate, onBackToMenu]);

  return (
    <div className="defeat-container">
      <div className="defeat-content">
        <h1>DEFEAT</h1>
        <p>All your towers have been captured!</p>
        <button className="menu-button" onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
      
      <style jsx>{`
        .defeat-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 100;
          animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .defeat-content {
          background-color: rgba(150, 0, 0, 0.9);
          border: 3px solid #620000;
          border-radius: 10px;
          padding: 30px 50px;
          text-align: center;
          box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
        }
        
        h1 {
          font-size: 4rem;
          color: white;
          margin-bottom: 20px;
          text-shadow: 0 0 10px rgba(255, 50, 50, 0.8);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        p {
          font-size: 1.5rem;
          color: white;
          margin-bottom: 30px;
        }
        
        .menu-button {
          background-color: #333;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 10px 20px;
          font-size: 1.2rem;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .menu-button:hover {
          background-color: #555;
        }
      `}</style>
    </div>
  );
};

export default DefeatCelebration;