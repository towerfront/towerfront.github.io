import { useRef, useCallback } from 'react';
import GameEngine from '../game/GameEngine';

const useGameEngine = (canvasRef, levelId, onGameWon) => {
  const gameEngineRef = useRef(null);

  const initializeGame = useCallback(() => {
    if (canvasRef.current && !gameEngineRef.current) {
      console.log(`Initializing game for level: ${levelId}`);
      gameEngineRef.current = new GameEngine(canvasRef.current, levelId, onGameWon);
      gameEngineRef.current.start();
    }
  }, [canvasRef, levelId, onGameWon]);

  const cleanupGame = useCallback(() => {
    if (gameEngineRef.current) {
      console.log('Cleaning up game engine...');
      gameEngineRef.current.stop();
      gameEngineRef.current = null;
    }
  }, []);

  return { initializeGame, cleanupGame };
};

export default useGameEngine;
