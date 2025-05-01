import React, { createContext, useState, useContext } from 'react';

// Create the context with default values
export const SettingsContext = createContext({
  volume: 50,
  difficulty: 'medium',
  graphicsQuality: 'medium',
  showFPS: false,
  currentFPS: 0,
  setVolume: () => {},
  setDifficulty: () => {},
  setGraphicsQuality: () => {},
  setShowFPS: () => {},
  updateFPS: () => {},
});

// Create a provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    volume: 50,
    difficulty: 'medium',
    graphicsQuality: 'medium',
    showFPS: false,
    currentFPS: 0,
  });

  const setVolume = (volume) => {
    setSettings(prev => ({ ...prev, volume }));
  };

  const setDifficulty = (difficulty) => {
    setSettings(prev => ({ ...prev, difficulty }));
  };

  const setGraphicsQuality = (graphicsQuality) => {
    setSettings(prev => ({ ...prev, graphicsQuality }));
  };
  
  const setShowFPS = (showFPS) => {
    setSettings(prev => ({ ...prev, showFPS }));
  };
  
  const updateFPS = (fps) => {
    setSettings(prev => ({ ...prev, currentFPS: fps }));
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setVolume,
        setDifficulty,
        setGraphicsQuality,
        setShowFPS,
        updateFPS,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useSettings = () => useContext(SettingsContext);