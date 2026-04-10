import React, { createContext, useState, useContext } from 'react';

// Helper to load settings from localStorage
const loadPersistedSettings = () => {
  try {
    const stored = localStorage.getItem('towerfront_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        volume: parsed.volume ?? 50,
        difficulty: parsed.difficulty ?? 'medium',
        graphicsQuality: parsed.graphicsQuality ?? 'medium',
        showFPS: parsed.showFPS ?? false,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const persistSettings = (settings) => {
  try {
    localStorage.setItem('towerfront_settings', JSON.stringify({
      volume: settings.volume,
      difficulty: settings.difficulty,
      graphicsQuality: settings.graphicsQuality,
      showFPS: settings.showFPS,
    }));
  } catch {
    // Ignore storage errors
  }
};

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
  const persisted = loadPersistedSettings();
  const [settings, setSettings] = useState({
    volume: persisted?.volume ?? 50,
    difficulty: persisted?.difficulty ?? 'medium',
    graphicsQuality: persisted?.graphicsQuality ?? 'medium',
    showFPS: persisted?.showFPS ?? false,
    currentFPS: 0,
  });

  const updateAndPersist = (updater) => {
    setSettings(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      persistSettings(next);
      return next;
    });
  };

  const setVolume = (volume) => updateAndPersist(prev => ({ ...prev, volume }));
  const setDifficulty = (difficulty) => updateAndPersist(prev => ({ ...prev, difficulty }));
  const setGraphicsQuality = (graphicsQuality) => updateAndPersist(prev => ({ ...prev, graphicsQuality }));
  const setShowFPS = (showFPS) => updateAndPersist(prev => ({ ...prev, showFPS }));
  const updateFPS = (fps) => setSettings(prev => ({ ...prev, currentFPS: fps })); // Don't persist FPS

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