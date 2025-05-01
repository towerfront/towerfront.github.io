import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import LevelSelector from './components/LevelSelector';
import GameCanvas from './components/GameCanvas';
import OptionsMenu from './components/OptionsMenu';
import LevelEditor from './components/LevelEditor/LevelEditor';
import GameFrame from './components/GameFrame'; // Import the frame
import { SettingsProvider } from './contexts/SettingsContext';
import './App.css';

// Create a component to handle routes that need navigation
const AppRoutes = () => {
  const navigate = useNavigate();
  
  const startGame = (levelId) => {
    navigate(`/play/${levelId}`);
  };
  
  return (
    // Remove the old game-route div, GameFrame handles layout
    <Routes>
      <Route path="/" element={<GameFrame><MainMenu /></GameFrame>} />
      <Route path="/levels" element={<GameFrame><LevelSelector startGame={startGame} /></GameFrame>} />
      <Route path="/play/:levelId" element={<GameFrame><GameCanvas /></GameFrame>} />
      <Route path="/options" element={<GameFrame><OptionsMenu /></GameFrame>} />
      <Route path="/editor" element={<GameFrame><LevelEditor /></GameFrame>} />
      <Route path="*" element={<GameFrame><MainMenu /></GameFrame>} /> {/* Default route */} 
    </Routes>
  );
};

function App() {
  return (
    <SettingsProvider>
      {/* Remove the outer App div, GameFrame handles the main container */}
      <AppRoutes />
    </SettingsProvider>
  );
}

export default App;
