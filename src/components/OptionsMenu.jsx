import React from 'react';
import { useNavigate } from 'react-router-dom';

const OptionsMenu = () => {
  const navigate = useNavigate();
  
  // TODO: Implement options (Difficulty, Reset Progress, Help)
  return (
    <div>
      <h2>Options</h2>
      <p>Options placeholder (Difficulty, Reset, Help)</p>
      <button onClick={() => navigate('/')}>Back to Menu</button>
    </div>
  );
};

export default OptionsMenu;
