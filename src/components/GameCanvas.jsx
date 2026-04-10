import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GameEngine from '../game/GameEngine';
import GameUI from './GameUI';
import VictoryCelebration from './VictoryCelebration';
import DefeatCelebration from './DefeatCelebration';
import PauseMenu from './PauseMenu';
import { SettingsContext } from '../contexts/SettingsContext';
import { TEAM_COLORS } from '../game/constants'; // Import TEAM_COLORS
import LevelManager from '../game/LevelManager'; // Import LevelManager
import { DEFAULT_GAME_WIDTH, DEFAULT_GAME_HEIGHT } from '../game/constants'; // Import defaults

const GameCanvas = () => {
  const canvasRef = useRef(null);
  const gameEngineRef = useRef(null);
  const navigate = useNavigate();
  const { levelId } = useParams();
  const [gameStatus, setGameStatus] = useState('playing');
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false); // State to control the final celebration screen
  const [showDefeat, setShowDefeat] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { showFPS, updateFPS } = useContext(SettingsContext);
  const fpsIntervalRef = useRef(null);
  const [unitDistribution, setUnitDistribution] = useState({}); // State for progress bar data
  const animationFrameRef = useRef(); // Ref for the animation frame
  const distributionUpdateInterval = 100; // Update distribution every 100ms
  const lastDistributionUpdateTime = useRef(0);
  const [levelDimensions, setLevelDimensions] = useState({ width: DEFAULT_GAME_WIDTH, height: DEFAULT_GAME_HEIGHT });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- 1. Load Level Data to get dimensions --- 
    const currentLevelId = levelId || 'level1';
    const levelData = LevelManager.loadLevelData(currentLevelId);
    const width = levelData?.width || DEFAULT_GAME_WIDTH;
    const height = levelData?.height || DEFAULT_GAME_HEIGHT;
    setLevelDimensions({ width, height });

    // --- 2. Set Canvas Internal Resolution --- 
    canvas.width = width;
    canvas.height = height;

    // --- 3. Initialize Game Engine --- 
    gameEngineRef.current = new GameEngine(
      canvas,
      currentLevelId,
      () => {
        setGameStatus('victorious');
      },
      () => {
        setGameStatus('lost');
        setShowDefeat(true);
      }
    );
    gameEngineRef.current.start();

    // --- 4. Simplified Resize Handler --- 
    const handleResize = () => {
      if (gameEngineRef.current && gameEngineRef.current.renderer) {
        gameEngineRef.current.renderer.handleCanvasResize();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Add touch event handlers
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
      
      // Remove touch event listeners
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [levelId]);

  // Touch event handlers (forwarding to GameEngine, no changes needed)
  const handleTouchStart = (event) => {
    event.preventDefault(); // Prevent scrolling
    if (!gameEngineRef.current || event.touches.length === 0) return;
    const touch = event.touches[0];
    // Forward to mouse event handler in GameEngine
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
    gameEngineRef.current.handleMouseDown(mouseEvent);
  };

  const handleTouchMove = (event) => {
    event.preventDefault(); // Prevent scrolling
    if (!gameEngineRef.current || event.touches.length === 0) return;
    const touch = event.touches[0];
    // Forward to mouse event handler in GameEngine
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
    gameEngineRef.current.handleMouseMove(mouseEvent);
  };

  const handleTouchEnd = (event) => {
    event.preventDefault(); // Prevent scrolling
    if (!gameEngineRef.current) return;
    // Use the last touch position or current position if available
    let clientX, clientY;
    if (event.changedTouches && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if (gameEngineRef.current.gameState.playerInput.canvasMousePos) { // Use canvasMousePos
      const pos = gameEngineRef.current.gameState.playerInput.canvasMousePos;
      const rect = canvasRef.current.getBoundingClientRect();
      clientX = pos.x + rect.left;
      clientY = pos.y + rect.top;
    }
    if (clientX !== undefined && clientY !== undefined) {
      // Forward to mouse event handler in GameEngine
      const mouseEvent = { clientX, clientY };
      gameEngineRef.current.handleMouseUp(mouseEvent);
    }
  };

  const handleTouchCancel = (event) => {
    event.preventDefault(); // Prevent scrolling
    if (!gameEngineRef.current) return;
    // Forward to mouse leave handler in GameEngine
    gameEngineRef.current.handleMouseLeave();
  };

  const handleTogglePause = () => {
    if (gameEngineRef.current) {
      const paused = gameEngineRef.current.togglePause();
      setIsPaused(paused);
    }
  };

  const handleResume = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.togglePause();
      setIsPaused(false);
    }
  };

  const handleRestart = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.restartLevel();
      setIsPaused(false);
      setGameStatus('playing');
      setShowVictoryAnimation(false);
    }
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  const handleDeclareVictory = () => {
    if (gameEngineRef.current && gameStatus === 'victorious') {
      gameEngineRef.current.declareVictory();
      setGameStatus('won');
      setShowVictoryAnimation(true);
    }
  };

  const handleVictoryComplete = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Function to calculate unit distribution
  // Wrap in useCallback as it's used in a useEffect dependency array
  const calculateUnitDistribution = useCallback(() => {
    if (!gameEngineRef.current || !gameEngineRef.current.gameState) return;

    const towers = gameEngineRef.current.gameState.towers;
    const distribution = {};
    let totalUnits = 0;

    towers.forEach(tower => {
      if (tower.team !== 'neutral') {
        distribution[tower.team] = (distribution[tower.team] || 0) + tower.unitCount;
        totalUnits += tower.unitCount;
      }
    });

    // Calculate percentages
    const percentages = {};
    if (totalUnits > 0) {
      for (const team in distribution) {
        percentages[team] = (distribution[team] / totalUnits) * 100;
      }
    }
    
    // Only update state if percentages changed significantly (optional optimization)
    // This simple version updates every time for now.
    setUnitDistribution(percentages);

  }, []); // Empty dependency array as it doesn't depend on component state/props

  // Consolidated update loop: FPS counter + unit distribution
  useEffect(() => {
    let frames = 0;
    let lastFPSTime = performance.now();

    const updateLoop = (timestamp) => {
      // FPS counting
      if (showFPS) {
        frames++;
        const now = performance.now();
        if (now - lastFPSTime >= 1000) {
          const fps = Math.round((frames * 1000) / (now - lastFPSTime));
          updateFPS(fps);
          frames = 0;
          lastFPSTime = now;
        }
      }

      // Update unit distribution periodically
      if (gameEngineRef.current && !isPaused) {
        if (timestamp - lastDistributionUpdateTime.current > distributionUpdateInterval) {
          calculateUnitDistribution();
          lastDistributionUpdateTime.current = timestamp;
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, calculateUnitDistribution, showFPS, updateFPS]);

  // Keyboard shortcut for pause (Escape or P key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        // Don't toggle pause if victory/defeat overlays are showing
        if (!showVictoryAnimation && !showDefeat) {
          handleTogglePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVictoryAnimation, showDefeat]);

  return (
    <div className="game-container">
      {/* Canvas style ensures it scales visually, width/height attributes set resolution */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'block', width: '100%', height: '100%' }} 
      />
      
      {/* UI overlays */}
      <GameUI 
        gameStatus={gameStatus} 
        onBackToMenu={handleBackToMenu}
        onTogglePause={handleTogglePause}
        onDeclareVictory={handleDeclareVictory} // Pass the new handler
        isPaused={isPaused}
        unitDistribution={unitDistribution} // Pass distribution data
        teamColors={TEAM_COLORS} // Pass colors
      />
      
      {/* Victory celebration - now shown based on showVictoryAnimation state */}
      {showVictoryAnimation && (
        <VictoryCelebration 
          onComplete={handleVictoryComplete} // Pass the stable callback
        />
      )}
      
      {/* Defeat celebration */}
      {showDefeat && <DefeatCelebration onBackToMenu={handleBackToMenu} />}
      
      {/* Pause menu */}
      {isPaused && !showVictoryAnimation && !showDefeat && (
        <PauseMenu 
          onResume={handleResume}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default GameCanvas;
