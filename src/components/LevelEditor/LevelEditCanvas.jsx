import React, { useState, useRef, useEffect } from 'react';
import { 
  TEAMS, 
  TOWER_TYPES, 
  TEAM_COLORS, 
  HEDGE_WIDTH, 
  HEDGE_HEIGHT, 
  HEDGE_COLOR, 
  HEDGE_BORDER_COLOR 
} from '../../game/constants';

const LevelEditCanvas = ({ level, onUpdate }) => {
  const canvasRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedTeam, setSelectedTeam] = useState(TEAMS.PLAYER);
  const [selectedType, setSelectedType] = useState(TOWER_TYPES.NORMAL);
  const [selectedTower, setSelectedTower] = useState(null);
  const [selectedHedge, setSelectedHedge] = useState(null);
  const [towers, setTowers] = useState([]);
  const [hedges, setHedges] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null); // For both towers and hedges
  const [initialUnits, setInitialUnits] = useState(10);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true); // Default to snap enabled
  const [isOverrideKeyDown, setIsOverrideKeyDown] = useState(false); // Track override key state
  
  const TOWER_RADIUS = 30;
  const GRID_SIZE = 50; // Define grid size constant
  const canvas = {
    width: 800,
    height: 600
  };
  
  // Initialize towers and hedges from level data
  useEffect(() => {
    if (level) {
      if (level.towers && Array.isArray(level.towers)) {
        setTowers([...level.towers]);
      } else {
        setTowers([]); // Initialize to empty array if no towers in level or if not an array
      }
      
      if (level.hedges && Array.isArray(level.hedges)) {
        setHedges([...level.hedges]);
      } else {
        setHedges([]); // Initialize to empty array if no hedges in level or if not an array
      }
    }
  }, [level]);
  
  // Update parent component when level objects change
  useEffect(() => {
    // Don't call onUpdate on the first render
    if (towers.length === 0 && hedges.length === 0 && 
        level?.towers?.length === 0 && !level?.hedges) return;
    
    // Only update if something changed
    const towersChanged = 
      !level?.towers || 
      level.towers.length !== towers.length ||
      JSON.stringify(towers) !== JSON.stringify(level.towers);
      
    const hedgesChanged =
      !level?.hedges ||
      level.hedges?.length !== hedges.length ||
      JSON.stringify(hedges) !== JSON.stringify(level.hedges);
    
    if (towersChanged || hedgesChanged) {
      // Use a timeout to debounce updates
      const timeoutId = setTimeout(() => {
        onUpdate({ towers, hedges });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [towers, hedges, onUpdate, level]);
  
  // Helper function to snap a coordinate to the grid
  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Helper function to get mouse position
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Tower drawing function
  const drawTower = (ctx, tower, isSelected = false) => {
    const color = TEAM_COLORS[tower.team] || TEAM_COLORS.neutral;
    
    // Draw tower body
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, TOWER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw tower border (heavier if selected)
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
    ctx.stroke();
    
    // Draw tower type indicator
    let typeIndicator = '';
    switch(tower.type) {
      case TOWER_TYPES.ATTACK:
        typeIndicator = '⚔️';
        break;
      case TOWER_TYPES.DEFEND:
        typeIndicator = '🛡️';
        break;
      case TOWER_TYPES.HEALING:
        typeIndicator = '❤️';
        break;
      default:
        // Don't draw anything for normal towers
        break;
    }
    
    if (typeIndicator) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeIndicator, tower.x, tower.y - 20);
    }
    
    // Draw unit count
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tower.initialUnits.toString(), tower.x, tower.y);
    
    // Draw team name below tower
    ctx.font = '12px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tower.team, tower.x, tower.y + TOWER_RADIUS + 15);
  };
  
  // New function to draw a hedge
  const drawHedge = (ctx, hedge, isSelected = false) => {
    const { x, y, width, height, rotation } = hedge;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180); // Convert degrees to radians
    
    // Draw hedge body
    ctx.fillStyle = HEDGE_COLOR;
    ctx.fillRect(-width/2, -height/2, width, height);
    
    // Draw hedge border (heavier if selected)
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeStyle = isSelected ? '#FFFFFF' : HEDGE_BORDER_COLOR;
    ctx.strokeRect(-width/2, -height/2, width, height);
    
    // Draw texture lines to make it look like a hedge
    ctx.beginPath();
    const lineSpacing = 10;
    for (let i = -width/2 + lineSpacing; i < width/2; i += lineSpacing) {
      ctx.moveTo(i, -height/2);
      ctx.lineTo(i, height/2);
    }
    for (let i = -height/2 + lineSpacing; i < height/2; i += lineSpacing) {
      ctx.moveTo(-width/2, i);
      ctx.lineTo(width/2, i);
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw rotation indicator to help with orientation
    ctx.beginPath();
    ctx.moveTo(0, -height/2 - 10);
    ctx.lineTo(0, -height/2 - 25);
    ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    ctx.restore();
  };
  
  // Redraw the canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw vertical gridlines
    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal gridlines
    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw all hedges first (so they appear behind towers)
    hedges.forEach(hedge => {
      const isSelected = selectedHedge && selectedHedge.id === hedge.id;
      drawHedge(ctx, hedge, isSelected);
    });
    
    // Draw all towers
    towers.forEach(tower => {
      const isSelected = selectedTower && 
        selectedTower.x === tower.x && 
        selectedTower.y === tower.y && 
        selectedTower.team === tower.team;
      drawTower(ctx, tower, isSelected);
    });
  };
  
  // Call redraw whenever needed values change
  useEffect(() => {
    redrawCanvas();
  }, [towers, selectedTower, hedges, selectedHedge]);
  
  // Find the tower at the given coordinates
  const getTowerAtPosition = (x, y) => {
    return towers.find(tower => {
      const dx = tower.x - x;
      const dy = tower.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= TOWER_RADIUS;
    });
  };
  
  // Find the hedge at the given coordinates
  const getHedgeAtPosition = (x, y) => {
    return hedges.find(hedge => {
      // Translate point to hedge's coordinate system
      const translatedX = x - hedge.x;
      const translatedY = y - hedge.y;
      
      // Rotate the point by negative of hedge's rotation
      const rotationRad = -hedge.rotation * Math.PI / 180;
      const rotatedX = translatedX * Math.cos(rotationRad) - translatedY * Math.sin(rotationRad);
      const rotatedY = translatedX * Math.sin(rotationRad) + translatedY * Math.cos(rotationRad);
      
      // Check if point is inside hedge bounds
      return Math.abs(rotatedX) <= hedge.width/2 && Math.abs(rotatedY) <= hedge.height/2;
    });
  };
  
  // Handle key down/up for snap override
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey || e.altKey) {
        setIsOverrideKeyDown(true);
      }
      
      // Rotate hedge when R key is pressed and a hedge is selected
      if (e.key === 'r' && selectedHedge) {
        rotateSelectedHedge(45); // Rotate 45 degrees clockwise
      }
      
      // Rotate hedge counter-clockwise when E key is pressed and a hedge is selected
      if (e.key === 'e' && selectedHedge) {
        rotateSelectedHedge(-45); // Rotate 45 degrees counter-clockwise
      }
    };
    
    const handleKeyUp = (e) => {
      // Check specific keys to avoid issues if other keys are released
      if (e.key === 'Shift' || e.key === 'Alt') {
        setIsOverrideKeyDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedHedge]);
  
  // Rotate the selected hedge
  const rotateSelectedHedge = (degrees) => {
    if (!selectedHedge) return;
    
    // First update the selected hedge
    const newRotation = (selectedHedge.rotation + degrees) % 360;
    setSelectedHedge(prev => ({
      ...prev,
      rotation: newRotation
    }));
    
    // Then update the hedges array
    setHedges(prevHedges => prevHedges.map(hedge => {
      if (hedge.id === selectedHedge.id) {
        return {
          ...hedge,
          rotation: newRotation
        };
      }
      return hedge;
    }));
  };

  // Handle mouse down on canvas
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const tower = getTowerAtPosition(pos.x, pos.y);
    const hedge = getHedgeAtPosition(pos.x, pos.y);
    const shouldSnap = isSnapEnabled && !isOverrideKeyDown;
    
    // Clear previous selections
    setSelectedTower(null);
    setSelectedHedge(null);
    
    if (tower) {
      // Tower clicked
      if (selectedTool === 'select') {
        setSelectedTower({...tower});
        setDraggedItem({
          type: 'tower',
          ...tower,
          offsetX: pos.x - tower.x,
          offsetY: pos.y - tower.y
        });
      } else if (selectedTool === 'delete') {
        setTowers(prevTowers => prevTowers.filter(t => 
          !(t.x === tower.x && t.y === tower.y && t.team === tower.team)
        ));
      }
    } else if (hedge) {
      // Hedge clicked
      if (selectedTool === 'select') {
        setSelectedHedge({...hedge});
        setDraggedItem({
          type: 'hedge',
          ...hedge,
          offsetX: pos.x - hedge.x,
          offsetY: pos.y - hedge.y
        });
      } else if (selectedTool === 'delete') {
        setHedges(prevHedges => prevHedges.filter(h => h.id !== hedge.id));
      }
    } else if (selectedTool === 'add') {
      // Add new tower at clicked position
      const finalX = shouldSnap ? snapToGrid(pos.x) : pos.x;
      const finalY = shouldSnap ? snapToGrid(pos.y) : pos.y;
      
      const newTower = {
        x: finalX,
        y: finalY,
        team: selectedTeam,
        initialUnits,
        type: selectedType
      };
      
      setTowers(prevTowers => [...prevTowers, newTower]);
      setSelectedTower({...newTower});
    } else if (selectedTool === 'addHedge') {
      // Add new hedge at clicked position
      const finalX = shouldSnap ? snapToGrid(pos.x) : pos.x;
      const finalY = shouldSnap ? snapToGrid(pos.y) : pos.y;
      
      const newHedge = {
        id: Date.now().toString(), // Unique ID
        x: finalX,
        y: finalY,
        width: HEDGE_WIDTH,
        height: HEDGE_HEIGHT,
        rotation: 0 // Default rotation (0 degrees)
      };
      
      setHedges(prevHedges => [...prevHedges, newHedge]);
      setSelectedHedge({...newHedge});
    }
  };
  
  // Handle mouse move on canvas
  const handleMouseMove = (e) => {
    if (!draggedItem) return;
    
    const pos = getMousePos(e);
    const shouldSnap = isSnapEnabled && !isOverrideKeyDown;
    
    // Calculate potential new raw position
    const rawX = pos.x - draggedItem.offsetX;
    const rawY = pos.y - draggedItem.offsetY;
    
    // Determine final position (snapped or raw)
    const finalX = shouldSnap ? snapToGrid(rawX) : rawX;
    const finalY = shouldSnap ? snapToGrid(rawY) : rawY;
    
    if (draggedItem.type === 'tower') {
      // Update selected tower copy
      setSelectedTower(prevSelected => ({
        ...prevSelected,
        x: finalX,
        y: finalY
      }));
      
      // Update the towers array
      setTowers(prevTowers => prevTowers.map(tower => {
        if (
          tower.x === draggedItem.x &&
          tower.y === draggedItem.y &&
          tower.team === draggedItem.team
        ) {
          return {
            ...tower,
            x: finalX,
            y: finalY
          };
        }
        return tower;
      }));
      
      // Update dragged item reference
      if (!shouldSnap || finalX !== draggedItem.x || finalY !== draggedItem.y) {
        setDraggedItem(prev => ({
          ...prev,
          x: finalX,
          y: finalY
        }));
      }
    } else if (draggedItem.type === 'hedge') {
      // Update selected hedge copy
      setSelectedHedge(prevSelected => ({
        ...prevSelected,
        x: finalX,
        y: finalY
      }));
      
      // Update the hedges array
      setHedges(prevHedges => prevHedges.map(hedge => {
        if (hedge.id === draggedItem.id) {
          return {
            ...hedge,
            x: finalX,
            y: finalY
          };
        }
        return hedge;
      }));
      
      // Update dragged item reference
      if (!shouldSnap || finalX !== draggedItem.x || finalY !== draggedItem.y) {
        setDraggedItem(prev => ({
          ...prev,
          x: finalX,
          y: finalY
        }));
      }
    }
  };
  
  // Handle mouse up on canvas
  const handleMouseUp = (e) => {
    if (!draggedItem) return;

    const shouldSnap = isSnapEnabled && !(e.shiftKey || e.altKey);

    if (shouldSnap) {
      // Perform a final snap calculation on release
      const finalX = snapToGrid(draggedItem.x);
      const finalY = snapToGrid(draggedItem.y);

      if (draggedItem.type === 'tower') {
        // Update selected tower
        setSelectedTower(prevSelected => ({
          ...prevSelected,
          x: finalX,
          y: finalY
        }));

        // Update the towers array
        setTowers(prevTowers => prevTowers.map(tower => {
          if (
            tower.x === draggedItem.x &&
            tower.y === draggedItem.y &&
            tower.team === draggedItem.team
          ) {
            return {
              ...tower,
              x: finalX,
              y: finalY
            };
          }
          return tower;
        }));
      } else if (draggedItem.type === 'hedge') {
        // Update selected hedge
        setSelectedHedge(prevSelected => ({
          ...prevSelected,
          x: finalX,
          y: finalY
        }));

        // Update the hedges array
        setHedges(prevHedges => prevHedges.map(hedge => {
          if (hedge.id === draggedItem.id) {
            return {
              ...hedge,
              x: finalX,
              y: finalY
            };
          }
          return hedge;
        }));
      }
    }
    
    setDraggedItem(null);
  };
  
  // Update tower properties
  const updateSelectedTower = (property, value) => {
    if (!selectedTower) return;
    
    // First update the selected tower copy
    setSelectedTower(prevSelected => ({
      ...prevSelected,
      [property]: value
    }));
    
    // Then update the actual tower in the array
    setTowers(prevTowers => prevTowers.map(tower => {
      // Match by position and team since reference might be broken
      if (
        tower.x === selectedTower.x &&
        tower.y === selectedTower.y &&
        tower.team === selectedTower.team
      ) {
        return {
          ...tower,
          [property]: value
        };
      }
      return tower;
    }));
  };
  
  // Update hedge properties
  const updateSelectedHedge = (property, value) => {
    if (!selectedHedge) return;
    
    // Update the selected hedge copy
    setSelectedHedge(prevSelected => ({
      ...prevSelected,
      [property]: value
    }));
    
    // Update the hedge in the array
    setHedges(prevHedges => prevHedges.map(hedge => {
      if (hedge.id === selectedHedge.id) {
        return {
          ...hedge,
          [property]: value
        };
      }
      return hedge;
    }));
  };
  
  return (
    <div className="level-edit-canvas">
      <div className="editor-toolbar">
        <div className="tool-group">
          <h4>Tools</h4>
          <div className="tool-buttons">
            <button 
              className={`tool-button ${selectedTool === 'select' ? 'active' : ''}`}
              onClick={() => setSelectedTool('select')}
              title="Select Tool"
            >
              🖱️ Select
            </button>
            <button 
              className={`tool-button ${selectedTool === 'add' ? 'active' : ''}`}
              onClick={() => setSelectedTool('add')}
              title="Add Tower Tool"
            >
              ➕ Add Tower
            </button>
            <button 
              className={`tool-button ${selectedTool === 'addHedge' ? 'active' : ''}`}
              onClick={() => setSelectedTool('addHedge')}
              title="Add Hedge Obstruction"
            >
              🌳 Add Hedge
            </button>
            <button 
              className={`tool-button ${selectedTool === 'delete' ? 'active' : ''}`}
              onClick={() => setSelectedTool('delete')}
              title="Delete Tool"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
        
        {selectedTool === 'add' && (
          <>
            <div className="tool-group">
              <h4>Tower Team</h4>
              <div className="tool-buttons">
                <button 
                  className={`tool-button ${selectedTeam === TEAMS.PLAYER ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(TEAMS.PLAYER)}
                  style={{ backgroundColor: TEAM_COLORS[TEAMS.PLAYER] }}
                >
                  Player
                </button>
                <button 
                  className={`tool-button ${selectedTeam === TEAMS.ENEMY1 ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(TEAMS.ENEMY1)}
                  style={{ backgroundColor: TEAM_COLORS[TEAMS.ENEMY1] }}
                >
                  Enemy 1
                </button>
                <button 
                  className={`tool-button ${selectedTeam === TEAMS.ENEMY2 ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(TEAMS.ENEMY2)}
                  style={{ backgroundColor: TEAM_COLORS[TEAMS.ENEMY2] }}
                >
                  Enemy 2
                </button>
                <button 
                  className={`tool-button ${selectedTeam === TEAMS.NEUTRAL ? 'active' : ''}`}
                  onClick={() => setSelectedTeam(TEAMS.NEUTRAL)}
                  style={{ backgroundColor: TEAM_COLORS[TEAMS.NEUTRAL] }}
                >
                  Neutral
                </button>
              </div>
            </div>
            
            <div className="tool-group">
              <h4>Tower Type</h4>
              <div className="tool-buttons">
                <button 
                  className={`tool-button ${selectedType === TOWER_TYPES.NORMAL ? 'active' : ''}`}
                  onClick={() => setSelectedType(TOWER_TYPES.NORMAL)}
                >
                  Normal
                </button>
                <button 
                  className={`tool-button ${selectedType === TOWER_TYPES.ATTACK ? 'active' : ''}`}
                  onClick={() => setSelectedType(TOWER_TYPES.ATTACK)}
                >
                  Attack ⚔️
                </button>
                <button 
                  className={`tool-button ${selectedType === TOWER_TYPES.DEFEND ? 'active' : ''}`}
                  onClick={() => setSelectedType(TOWER_TYPES.DEFEND)}
                >
                  Defend 🛡️
                </button>
                <button 
                  className={`tool-button ${selectedType === TOWER_TYPES.HEALING ? 'active' : ''}`}
                  onClick={() => setSelectedType(TOWER_TYPES.HEALING)}
                >
                  Healing ❤️
                </button>
              </div>
            </div>
            
            <div className="tool-group">
              <h4>Starting Units: {initialUnits}</h4>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={initialUnits}
                onChange={(e) => setInitialUnits(parseInt(e.target.value))}
                className="slider"
              />
            </div>
          </>
        )}
        
        {selectedTool === 'addHedge' && (
          <div className="tool-group">
            <h4>Hedge Tool</h4>
            <p className="info-text">
              Click to place a hedge. Hedges block connections between towers.
              <br />
              Use the 'R' key to rotate 45° clockwise, 'E' to rotate counter-clockwise.
              <br />
              You can also edit rotation after placement in the properties panel.
            </p>
          </div>
        )}
        
        {selectedTower && selectedTool === 'select' && (
          <div className="tower-properties">
            <h4>Selected Tower Properties</h4>
            <div className="property">
              <label>Team:</label>
              <select 
                value={selectedTower.team}
                onChange={(e) => updateSelectedTower('team', e.target.value)}
              >
                <option value={TEAMS.PLAYER}>Player</option>
                <option value={TEAMS.ENEMY1}>Enemy 1</option>
                <option value={TEAMS.ENEMY2}>Enemy 2</option>
                <option value={TEAMS.ENEMY3}>Enemy 3</option>
                <option value={TEAMS.NEUTRAL}>Neutral</option>
              </select>
            </div>
            
            <div className="property">
              <label>Type:</label>
              <select 
                value={selectedTower.type || TOWER_TYPES.NORMAL}
                onChange={(e) => updateSelectedTower('type', e.target.value)}
              >
                <option value={TOWER_TYPES.NORMAL}>Normal</option>
                <option value={TOWER_TYPES.ATTACK}>Attack</option>
                <option value={TOWER_TYPES.DEFEND}>Defend</option>
                <option value={TOWER_TYPES.HEALING}>Healing</option>
              </select>
            </div>
            
            <div className="property">
              <label>Starting Units: {selectedTower.initialUnits}</label>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={selectedTower.initialUnits}
                onChange={(e) => updateSelectedTower('initialUnits', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            
            <div className="property">
              <label>Position: ({Math.round(selectedTower.x)}, {Math.round(selectedTower.y)})</label>
            </div>
          </div>
        )}
        
        {selectedHedge && selectedTool === 'select' && (
          <div className="hedge-properties">
            <h4>Selected Hedge Properties</h4>
            <div className="property">
              <label>Rotation: {selectedHedge.rotation}°</label>
              <div className="rotation-controls">
                <button onClick={() => rotateSelectedHedge(-45)}>
                  ↺ 45° CCW
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="315" 
                  step="45"
                  value={selectedHedge.rotation}
                  onChange={(e) => updateSelectedHedge('rotation', parseInt(e.target.value))}
                  className="slider"
                />
                <button onClick={() => rotateSelectedHedge(45)}>
                  ↻ 45° CW
                </button>
              </div>
            </div>
            <div className="property">
              <label>Position: ({Math.round(selectedHedge.x)}, {Math.round(selectedHedge.y)})</label>
            </div>
          </div>
        )}

        <div className="tool-group">
          <h4>Options</h4>
          <label className="snap-toggle">
            <input 
              type="checkbox" 
              checked={isSnapEnabled}
              onChange={(e) => setIsSnapEnabled(e.target.checked)}
            />
            Snap to Grid (Hold Shift/Alt to override)
          </label>
        </div>
      </div>
      
      <div className="canvas-container">
        <canvas 
          ref={canvasRef}
          width={canvas.width}
          height={canvas.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      
      <style>
        {`
          .level-edit-canvas {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          
          .editor-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 10px;
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
            margin-bottom: 15px;
          }
          
          .tool-group {
            display: flex;
            flex-direction: column;
            min-width: 200px;
          }
          
          .tool-group h4 {
            margin: 0 0 10px 0;
            font-family: 'Cinzel Decorative', serif;
            color: var(--light-color);
          }
          
          .tool-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }
          
          .tool-button {
            padding: 8px 12px;
            background-color: var(--secondary-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Cinzel Decorative', serif;
            font-size: 0.9rem;
            transition: all 0.2s;
          }
          
          .tool-button.active {
            background-color: var(--accent-color);
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
          }
          
          .tool-button:hover {
            opacity: 0.9;
          }
          
          .canvas-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            overflow: hidden;
          }
          
          canvas {
            background-color: #2F2F2F;
            border: 2px solid var(--dark-color);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          }
          
          .tower-properties {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 250px;
          }
          
          .property {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          
          .property label {
            color: var(--light-color);
            font-size: 0.9rem;
          }
          
          .property select {
            padding: 5px;
            background-color: var(--dark-color);
            color: var(--light-color);
            border: 1px solid var(--accent-color);
            border-radius: 3px;
            cursor: pointer;
          }
          
          .slider {
            width: 100%;
            height: 5px;
            -webkit-appearance: none;
            background: var(--dark-color);
            outline: none;
            border-radius: 5px;
          }
          
          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: var(--accent-color);
            cursor: pointer;
          }
          
          .slider::-moz-range-thumb {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: var(--accent-color);
            cursor: pointer;
          }

          .snap-toggle {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--light-color);
            font-size: 0.9rem;
            cursor: pointer;
          }

          .info-text {
            font-size: 0.85rem;
            color: var(--light-color);
            line-height: 1.4;
            margin: 5px 0;
          }
          
          .hedge-properties {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 250px;
          }
          
          .rotation-controls {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .rotation-controls button {
            padding: 5px 8px;
            background-color: var(--secondary-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s;
          }
          
          .rotation-controls button:hover {
            background-color: var(--accent-color);
          }
        `}
      </style>
    </div>
  );
};

export default LevelEditCanvas;