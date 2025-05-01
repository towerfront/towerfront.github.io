import React from 'react';
import './GameFrame.css'; // We'll create this CSS file next

const GameFrame = ({ children }) => {
  return (
    <div className="game-frame-background">
      <div className="game-frame-content">
        {children}
      </div>
    </div>
  );
};

export default GameFrame;
