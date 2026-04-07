import Renderer from './Renderer';
import GameState from './GameState';
import LevelManager from './LevelManager';
import Unit from './Unit';
import AIController from './AIController'; // Import AIController
import { TOWER_RADIUS, TOWER_TYPES, TEAM_COLORS, ATTACK_RATE, MAX_UNITS_PER_TOWER } from './constants';

class GameEngine {
  constructor(canvas, levelId, onGameWon, onGameLost) { // Add onGameLost callback
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.levelId = levelId;
    this.onGameWon = onGameWon; // Store the callback
    this.onGameLost = onGameLost; // Store the defeat callback
    this.gameState = new GameState();
    this.renderer = new Renderer(this.ctx, this.gameState);
    this.lastTimestamp = 0;
    this.animationFrameId = null;
    this.unitSendTimers = {};
    this.aiControllers = {}; // Store AI controllers { teamColor: AIController }
    this.isPaused = false; // Track pause state
    
    // Double-click tracking
    this.lastClickTime = 0;
    this.lastClickPosition = { x: 0, y: 0 };
    this.doubleClickThreshold = 300; // ms
    
    // Create bound references to event handlers
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);

    this.loadLevel(levelId);
    this.setupInputHandlers();
  }

  loadLevel(levelId) {
    const levelData = LevelManager.loadLevelData(levelId);
    if (levelData) {
      this.gameState.towers = levelData.towers;
      this.gameState.towers.forEach(tower => {
        this.unitSendTimers[tower.id] = 0;
        // Initialize AI for non-player, non-neutral teams
        if (tower.team !== this.gameState.playerTeam && tower.team !== 'neutral') {
          if (!this.aiControllers[tower.team]) {
            console.log(`Initializing AI for team: ${tower.team}`);
            this.aiControllers[tower.team] = new AIController(tower.team, this.gameState);
          }
        }
      });
      
      // Load hedges from level data if present
      if (levelData.hedges && Array.isArray(levelData.hedges)) {
        this.gameState.hedges = levelData.hedges;
        console.log(`Loaded ${levelData.hedges.length} hedges for level ${levelId}`);
      } else {
        this.gameState.hedges = []; // Initialize to empty array if no hedges in level data
      }
      
      // Initialize inbound connection counts for towers
      this.updateInboundConnectionCounts();
      
      console.log(`Level ${levelId} loaded with ${levelData.towers.length} towers.`);
      console.log('AI Controllers initialized:', Object.keys(this.aiControllers));
    } else {
      console.error(`Failed to load level ${levelId}`);
    }
  }

  setupInputHandlers() {
    // Use stored bound references to ensure 'this' refers to the GameEngine instance
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    
    // Add click handler for double-click detection
    this.boundClick = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this.boundClick);
    
    // Add touch events for mobile users
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    
    this.canvas.addEventListener('touchstart', this.boundTouchStart);
    this.canvas.addEventListener('touchmove', this.boundTouchMove);
    this.canvas.addEventListener('touchend', this.boundTouchEnd);
  }

  removeInputHandlers() {
    // Use the same bound references when removing listeners
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.removeEventListener('click', this.boundClick);
    
    // Remove touch events
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
  }

  getMousePos(event) {
    const rect = this.canvas.getBoundingClientRect();
    // Calculate raw position relative to the canvas element's top-left corner
    const scaleX = this.canvas.width / rect.width;    // relationship of internal width to display width
    const scaleY = this.canvas.height / rect.height;  // relationship of internal height to display height

    // Scale the mouse coordinates to match the canvas internal resolution
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    // Store both raw canvas coordinates and scaled game world coordinates if needed
    // For now, we primarily need the scaled coordinates for game logic
    this.gameState.playerInput.canvasMousePos = { x: canvasX, y: canvasY }; // Store scaled pos

    return {
      x: canvasX,
      y: canvasY
    };
  }

  getTowerAtPos(x, y) {
    // Use the scaled coordinates directly now
    // Find the closest tower within a more generous radius (50px as requested)
    const GENEROUS_RADIUS = 50; // Larger radius for easier connection targeting
    
    // First try with the original TOWER_RADIUS for precise targeting
    const exactTower = this.gameState.towers.find(tower => {
      const dx = tower.x - x;
      const dy = tower.y - y;
      return (dx * dx + dy * dy) < (TOWER_RADIUS * TOWER_RADIUS);
    });
    
    // If we found a tower with exact targeting, return it
    if (exactTower) return exactTower;
    
    // Otherwise, use the more generous radius to help the player
    return this.gameState.towers.find(tower => {
      const dx = tower.x - x;
      const dy = tower.y - y;
      return (dx * dx + dy * dy) < (GENEROUS_RADIUS * GENEROUS_RADIUS);
    });
  }

  handleMouseDown(event) {
    const pos = this.getMousePos(event); // pos is now correctly scaled
    const clickedTower = this.getTowerAtPos(pos.x, pos.y);

    if (clickedTower && clickedTower.team === this.gameState.playerTeam) {
      this.gameState.playerInput.isDragging = true;
      this.gameState.playerInput.startTowerId = clickedTower.id;
      // Store the scaled position as currentMousePos used by the renderer
      this.gameState.playerInput.currentMousePos = pos; 
    }
  }

  handleMouseMove(event) {
    if (this.gameState.playerInput.isDragging) {
      // Update with the correctly scaled position
      this.gameState.playerInput.currentMousePos = this.getMousePos(event); 
    }
  }

  handleMouseUp(event) {
    if (!this.gameState.playerInput.isDragging) return;

    const pos = this.getMousePos(event); // Use scaled position for hit detection
    const startTower = this.gameState.getTowerById(this.gameState.playerInput.startTowerId);
    const clickedEndTower = this.getTowerAtPos(pos.x, pos.y); // Use scaled position

    let connectionActionTaken = false;
    let potentialBrokenConnection = null;

    // --- Step 1: Check for potential swipe-to-break FIRST --- 
    if (startTower) { // Need start tower for coordinates
      const dragStartX = startTower.x;
      const dragStartY = startTower.y;
      const dragEndX = pos.x;
      const dragEndY = pos.y;
      potentialBrokenConnection = this.findIntersectedConnection(dragStartX, dragStartY, dragEndX, dragEndY);
    }

    // --- Step 2: Attempt Connection Creation/Toggle --- 
    if (startTower && clickedEndTower && startTower.id !== clickedEndTower.id) {
      // Check for intersecting towers or hedges
      const intersectingObject = this.checkIntersectingObjects(startTower, clickedEndTower.x, clickedEndTower.y);
      let endTower = clickedEndTower;
      
      if (intersectingObject) {
        if (intersectingObject.isHedge) {
          // If there's a hedge in the way, prevent the connection
          console.log(`Cannot connect through hedge: ${intersectingObject.message}`);
          // Reset dragging state and return early
          this.gameState.playerInput.isDragging = false;
          this.gameState.playerInput.startTowerId = null;
          return;
        } else if (intersectingObject.id !== endTower.id) {
          // It's a tower in the way
          console.log(`Cannot connect through tower ${intersectingObject.id}. Targeting the intersecting tower instead.`);
          endTower = intersectingObject;
        }
      }
      
      // Attempt to handle connection creation (which now includes the "do nothing" if exists logic)
      connectionActionTaken = this.handleConnectionCreation(startTower, endTower);
    }

    // --- Step 3: Apply Swipe-to-Break ONLY if no connection action occurred --- 
    if (!connectionActionTaken && potentialBrokenConnection && potentialBrokenConnection.sourceTower.team === this.gameState.playerTeam) {
      // If the drag crossed an existing player's connection AND no connection was created/toggled,
      // then break the crossed connection.
      console.log(`Swipe Break: Breaking connection from ${potentialBrokenConnection.sourceTower.id} to ${potentialBrokenConnection.targetTower.id}`);
      this.gameState.connections = this.gameState.connections.filter(conn => 
        conn.sourceTowerId !== potentialBrokenConnection.sourceTower.id || 
        conn.targetTowerId !== potentialBrokenConnection.targetTower.id
      );
      potentialBrokenConnection.sourceTower.removeConnection(potentialBrokenConnection.targetTower.id);
      this.updateInboundConnectionCounts();
    }

    // Reset dragging state regardless of action taken
    this.gameState.playerInput.isDragging = false;
    this.gameState.playerInput.startTowerId = null;
  }

  handleMouseLeave(event) {
    if (this.gameState.playerInput.isDragging) {
      console.log('Drag cancelled due to mouse leaving canvas.');
      this.gameState.playerInput.isDragging = false;
      this.gameState.playerInput.startTowerId = null;
    }
  }

  // Double-click handler for connection breaking
  handleClick(event) {
    const currentTime = Date.now();
    const pos = this.getMousePos(event);
    
    // If less than threshold time has passed since last click, consider it a double-click
    if (currentTime - this.lastClickTime < this.doubleClickThreshold) {
      // Calculate distance between current and last click position
      const dx = pos.x - this.lastClickPosition.x;
      const dy = pos.y - this.lastClickPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If the user clicked in approximately the same area (30px radius)
      if (distance < 30) {
        // Find if the click is near a connection
        const nearestConnection = this.findNearestConnection(pos.x, pos.y);
        
        if (nearestConnection && nearestConnection.sourceTower.team === this.gameState.playerTeam) {
          // Break the connection
          console.log(`Double-click: Breaking connection from ${nearestConnection.sourceTower.id} to ${nearestConnection.targetTower.id}`);
          this.gameState.connections = this.gameState.connections.filter(conn => 
            conn.sourceTowerId !== nearestConnection.sourceTower.id || 
            conn.targetTowerId !== nearestConnection.targetTower.id
          );
          nearestConnection.sourceTower.removeConnection(nearestConnection.targetTower.id);
          
          // Update inbound connection counts
          this.updateInboundConnectionCounts();
        }
      }
    }
    
    // Update the last click time and position for the next click event
    this.lastClickTime = currentTime;
    this.lastClickPosition = pos;
  }
  
  // Find the connection closest to the given point
  findNearestConnection(x, y) {
    let nearestConnection = null;
    let minDistance = 20; // Maximum distance threshold (20px)
    
    for (const conn of this.gameState.connections) {
      const sourceTower = this.gameState.getTowerById(conn.sourceTowerId);
      const targetTower = this.gameState.getTowerById(conn.targetTowerId);
      
      if (!sourceTower || !targetTower) continue;
      
      // Calculate distance from point to line segment
      const distance = this.pointToLineDistance(
        x, y,
        sourceTower.x, sourceTower.y,
        targetTower.x, targetTower.y
      );
      
      if (distance < minDistance) {
        nearestConnection = { sourceTower, targetTower };
        minDistance = distance;
      }
    }
    
    return nearestConnection;
  }
  
  // Calculate the distance from a point to a line segment
  pointToLineDistance(px, py, x1, y1, x2, y2) {
    // Calculate the squared length of the line
    const lineLengthSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    
    // If the line has zero length, return distance to the point
    if (lineLengthSq === 0) {
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    // Calculate the projection of the point onto the line
    const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSq));
    
    // Calculate the closest point on the line
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);
    
    // Return the distance from the point to the closest point on the line
    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
  }
  
  // Touch handlers for mobile devices
  handleTouchStart(event) {
    event.preventDefault(); // Prevent default touch behavior
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const pos = this.getTouchPos(touch); // Ensure getTouchPos also scales
      const clickedTower = this.getTowerAtPos(pos.x, pos.y);
      
      // Track touch data for potential swipe detection
      this.touchData = {
        startX: pos.x,
        startY: pos.y,
        startTime: Date.now(),
        startTower: clickedTower
      };
      
      if (clickedTower && clickedTower.team === this.gameState.playerTeam) {
        this.gameState.playerInput.isDragging = true;
        this.gameState.playerInput.startTowerId = clickedTower.id;
        this.gameState.playerInput.currentMousePos = pos; // Store scaled pos
      }
    }
  }
  
  handleTouchMove(event) {
    event.preventDefault();
    
    if (event.touches.length === 1 && this.gameState.playerInput.isDragging) {
      const touch = event.touches[0];
      const pos = this.getTouchPos(touch); // Ensure getTouchPos also scales
      
      // Update the current mouse position for drawing the drag line
      this.gameState.playerInput.currentMousePos = pos; // Store scaled pos
    }
  }
  
  handleTouchEnd(event) {
    event.preventDefault();
    
    if (!this.gameState.playerInput.isDragging) return;

    // Use the last known scaled position
    const pos = this.gameState.playerInput.currentMousePos; 
    const startTower = this.gameState.getTowerById(this.gameState.playerInput.startTowerId);
    // Use scaled position for hit detection
    const clickedEndTower = this.getTowerAtPos(pos.x, pos.y); 
    
    let connectionActionTaken = false;
    let potentialBrokenConnection = null;
    let dragDistance = 0;

    // --- Step 1: Check for potential swipe-to-break FIRST --- 
    if (startTower && this.touchData) { // Check touchData exists for start coords
      const dragStartX = this.touchData.startX;
      const dragStartY = this.touchData.startY;
      const dragEndX = pos.x;
      const dragEndY = pos.y;
      dragDistance = Math.sqrt(Math.pow(dragEndX - dragStartX, 2) + Math.pow(dragEndY - dragStartY, 2));

      // Only check for intersection break if the drag was significant enough
      if (dragDistance > 20) { 
          potentialBrokenConnection = this.findIntersectedConnection(dragStartX, dragStartY, dragEndX, dragEndY);
      }
    }

    // --- Step 2: Attempt Connection Creation/Toggle --- 
    if (startTower && clickedEndTower && startTower.id !== clickedEndTower.id) {
      // Check for intersecting towers or hedges
      const intersectingObject = this.checkIntersectingObjects(startTower, clickedEndTower.x, clickedEndTower.y);
      let endTower = clickedEndTower;
      
      if (intersectingObject) {
        if (intersectingObject.isHedge) {
          // If there's a hedge in the way, prevent the connection
          console.log(`Cannot connect through hedge: ${intersectingObject.message}`);
          // Reset dragging state and return early
          this.gameState.playerInput.isDragging = false;
          this.gameState.playerInput.startTowerId = null;
          this.touchData = null;
          return;
        } else if (intersectingObject.id !== endTower.id) {
          // It's a tower in the way
          console.log(`Cannot connect through tower ${intersectingObject.id}. Targeting the intersecting tower instead.`);
          endTower = intersectingObject;
        }
      }
      
      // Attempt to handle connection creation
      connectionActionTaken = this.handleConnectionCreation(startTower, endTower);
    }

    // --- Step 3: Apply Swipe-to-Break ONLY if no connection action occurred --- 
    if (!connectionActionTaken && potentialBrokenConnection && potentialBrokenConnection.sourceTower.team === this.gameState.playerTeam) {
      // If the drag crossed an existing player's connection AND no connection was created/toggled,
      // then break the crossed connection.
      console.log(`Touch Swipe Break: Breaking connection from ${potentialBrokenConnection.sourceTower.id} to ${potentialBrokenConnection.targetTower.id}`);
      this.gameState.connections = this.gameState.connections.filter(conn => 
        conn.sourceTowerId !== potentialBrokenConnection.sourceTower.id || 
        conn.targetTowerId !== potentialBrokenConnection.targetTower.id
      );
      potentialBrokenConnection.sourceTower.removeConnection(potentialBrokenConnection.targetTower.id);
      this.updateInboundConnectionCounts();
    }
    
    // Reset dragging state and touch data
    this.gameState.playerInput.isDragging = false;
    this.gameState.playerInput.startTowerId = null;
    this.touchData = null;
  }

  // Get touch position relative to canvas, scaled correctly
  getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;
    
    this.gameState.playerInput.canvasMousePos = { x: canvasX, y: canvasY }; // Store scaled pos

    return {
      x: canvasX,
      y: canvasY
    };
  }

  gameLoop = (timestamp) => {
    if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
    }
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Update gameplay if playing OR if victorious (allowing continued play)
    if (!this.isPaused && (this.gameState.gameStatus === 'playing' || this.gameState.gameStatus === 'victorious')) {
      this.update(deltaTime);
    }

    this.render();
    
    // Only continue loop if not definitively won or lost
    if (this.gameState.gameStatus !== 'won' && this.gameState.gameStatus !== 'lost') {
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    } else {
        console.log(`Game loop stopping due to status: ${this.gameState.gameStatus}`);
        // Potentially add final cleanup or rendering calls here if needed
    }
  };

  update(deltaTime) {
    this.gameState.towers.forEach(tower => tower.update(deltaTime));

    const unitsToRemove = [];
    const excessReinforcements = new Map(); // Track excess units for redistribution
    
    this.gameState.units.forEach(unit => {
      if (unit.update(deltaTime)) {
        const targetTower = this.gameState.getTowerById(unit.targetTowerId);
        if (targetTower) {
          const sourceTower = this.gameState.getTowerById(unit.sourceTowerId);
          let unitsToApply = 1;

          if (sourceTower) {
            if (sourceTower.type === TOWER_TYPES.ATTACK && targetTower.team !== sourceTower.team) {
              unitsToApply *= 2;
            }
            if (sourceTower.type === TOWER_TYPES.HEALING && targetTower.team === sourceTower.team) {
              unitsToApply *= 2;
            }
          }

          // Apply units and get result including team change info and excess units
          const result = targetTower.receiveUnits(unitsToApply, unit.team);
          
          // If there are excess units (tower was maxed)
          if (result.excessUnits > 0) {
            // Store excess units for later redistribution
            const key = targetTower.id;
            excessReinforcements.set(key, (excessReinforcements.get(key) || 0) + result.excessUnits);
          }
          
          // If a tower was captured, handle connection cleanup
          if (result.teamChanged) {
            console.log(`Tower ${targetTower.id} changed from team ${result.previousTeam} to ${result.newTeam}`);
            
            // Remove any existing OUTBOUND connections FROM the captured tower
            // The tower's internal connections list is already cleared in Tower.receiveUnits
            this.gameState.connections = this.gameState.connections.filter(conn => 
              conn.sourceTowerId !== targetTower.id
            );
            
            // Update inbound connection counts after connection removal
            this.updateInboundConnectionCounts();
            
            // Check win/defeat conditions
            this.checkWinCondition();
            this.checkDefeatCondition();
          }
        }
        unitsToRemove.push(unit);
      }
    });
    unitsToRemove.forEach(unit => this.gameState.removeUnit(unit));
    
    // Redistribute excess reinforcement units to outbound connections
    excessReinforcements.forEach((excessUnits, towerId) => {
      const tower = this.gameState.getTowerById(towerId);
      // Ensure tower still exists and belongs to the same team (wasn't captured simultaneously)
      if (tower && tower.connections.length > 0 && excessUnits > 0) { 
        const perConnectionUnits = excessUnits / tower.connections.length;
        
        tower.connections.forEach(targetTowerId => {
          const targetTower = this.gameState.getTowerById(targetTowerId);
          if (targetTower) {
            const unitsForThisConnection = Math.floor(perConnectionUnits);
            if (unitsForThisConnection > 0) {
              for (let i = 0; i < unitsForThisConnection; i++) {
                const offsetX = (Math.random() - 0.5) * TOWER_RADIUS * 0.5;
                const offsetY = (Math.random() - 0.5) * TOWER_RADIUS * 0.5;
                const tempSource = { ...tower, x: tower.x + offsetX, y: tower.y + offsetY };
                this.gameState.addUnit(new Unit(tempSource, targetTower, tower.team));
              }
              // Reduced logging for redistribution
              // if (Math.random() < 0.05) { console.log(...) }
            }
          }
        });
      }
    });

    // Process connections and send units - Refined validation logic
    const validConnections = []; // Build a new list of connections that are still valid
    this.gameState.connections.forEach(conn => {
      const sourceTower = this.gameState.getTowerById(conn.sourceTowerId);
      const targetTower = this.gameState.getTowerById(conn.targetTowerId);

      // Check if connection is valid: both towers exist, source has units, 
      // and the source tower's internal list still includes this connection.
      if (sourceTower && targetTower && sourceTower.unitCount > 0 && 
          sourceTower.connections.includes(targetTower.id)) {

        // Connection is valid, keep it
        validConnections.push(conn);

        // --- Unit Sending Logic --- 
        this.unitSendTimers[sourceTower.id] = (this.unitSendTimers[sourceTower.id] || 0) + deltaTime;

        const MIN_RATE = 1.0;
        const MAX_RATE = 3.0;
        const MIN_UNITS = 1;
        const MAX_UNITS = MAX_UNITS_PER_TOWER;
        
        let totalSendRate = MIN_RATE + 
          (MAX_RATE - MIN_RATE) * 
          (Math.max(MIN_UNITS, Math.min(MAX_UNITS, sourceTower.unitCount)) - MIN_UNITS) / 
          (MAX_UNITS - MIN_UNITS);
        
        const activeConnections = sourceTower.connections.length;
        const perConnectionRate = activeConnections > 0 ? totalSendRate / activeConnections : 0;
        const sendInterval = perConnectionRate > 0 ? 1 / perConnectionRate : Infinity;

        if (perConnectionRate > 0 && this.unitSendTimers[sourceTower.id] >= sendInterval) {
          const unitsToSendBatch = 1;
          // Reduced logging
          // if (Math.random() < 0.01) { console.log(...) }

          for (let i = 0; i < unitsToSendBatch; i++) {
            const offsetX = (Math.random() - 0.5) * TOWER_RADIUS * 0.5;
            const offsetY = (Math.random() - 0.5) * TOWER_RADIUS * 0.5;
            const tempSource = { ...sourceTower, x: sourceTower.x + offsetX, y: sourceTower.y + offsetY };
            this.gameState.addUnit(new Unit(tempSource, targetTower, sourceTower.team));
          }
          this.unitSendTimers[sourceTower.id] %= sendInterval;
        }
        // --- End Unit Sending Logic ---

      } else {
        // Connection is invalid, log it and implicitly remove it by not adding to validConnections
        if (!sourceTower || !targetTower) {
             console.log(`Removing connection ${conn.sourceTowerId} -> ${conn.targetTowerId} because a tower no longer exists.`);
        } else if (!sourceTower.connections.includes(targetTower.id)) {
             console.log(`Removing connection ${conn.sourceTowerId} -> ${conn.targetTowerId} because source tower's internal list doesn't contain it.`);
        } else {
             console.log(`Removing invalid connection: ${conn.sourceTowerId} -> ${conn.targetTowerId} (Reason: Source units <= 0 or other)`);
        }
        // Note: We don't need to call updateInboundConnectionCounts here, 
        // as it's called when connections are explicitly created/removed or towers captured.
      }
    });

    // Replace the old connections array with the filtered list of valid ones
    this.gameState.connections = validConnections;

    // Process AI controllers
    Object.values(this.aiControllers).forEach(ai => {
      if (ai && typeof ai.update === 'function') {
        ai.update(deltaTime);
      } else {
        // Reduced warning spam
        // if (ai) { console.warn(...) } else { console.warn(...) }
      }
    });
  }

  checkWinCondition() {
    // Only check if currently playing
    if (this.gameState.gameStatus !== 'playing') return;

    const nonPlayerTeams = new Set();
    this.gameState.towers.forEach(tower => {
      if (tower.team !== this.gameState.playerTeam && tower.team !== 'neutral') {
        nonPlayerTeams.add(tower.team);
      }
    });

    // If no non-player, non-neutral teams remain, the player has technically won
    if (nonPlayerTeams.size === 0) {
      console.log('Win condition met! Player controls all non-neutral towers.');
      this.gameState.gameStatus = 'victorious'; // Set status to victorious, game continues
      if (this.onGameWon) {
        this.onGameWon(); // Notify the UI component (GameCanvas)
      }
    }
  }

  // Method to officially declare victory and end the game (called by UI)
  declareVictory() {
    if (this.gameState.gameStatus === 'victorious') {
        console.log('Victory officially declared by player.');
        this.gameState.gameStatus = 'won'; // Set status to won to trigger final celebration
        // The VictoryCelebration component will handle the rest
    } else {
        console.warn('DeclareVictory called when game status was not \'victorious\'.');
    }
  }

  checkDefeatCondition() {
    if (this.gameState.gameStatus !== 'playing') return;

    // Check if player has any towers left
    const playerHasTowers = this.gameState.towers.some(tower => tower.team === this.gameState.playerTeam);

    if (!playerHasTowers) {
      console.log('Defeat condition met! Player has lost all towers.');
      this.gameState.gameStatus = 'lost';
      if (this.onGameLost) {
        this.onGameLost();
      }
    }
  }

  // Add method to pause/unpause the game
  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.gameState.previousStatus = this.gameState.gameStatus;
      this.gameState.gameStatus = 'paused';
    } else {
      this.gameState.gameStatus = this.gameState.previousStatus || 'playing';
    }
    return this.isPaused;
  }

  // Add method to restart the level
  restartLevel() {
    // Reset the game state
    this.gameState = new GameState();
    this.renderer = new Renderer(this.ctx, this.gameState);
    this.unitSendTimers = {};
    this.aiControllers = {};
    this.isPaused = false;
    
    // Reload the level
    this.loadLevel(this.levelId);
    
    // Resume game
    this.gameState.gameStatus = 'playing';
  }

  render() {
    this.renderer.render();
  }

  start() {
    console.log('Starting game loop...');
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop() {
    console.log('Stopping game loop...');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.removeInputHandlers();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Stopped', this.canvas.width / 2, this.canvas.height / 2);
  }

  // Helper method to update inbound connection counts for all towers
  updateInboundConnectionCounts() {
    // Reset all inbound connection counts
    this.gameState.towers.forEach(tower => {
      tower.setInboundConnectionsCount(0);
    });
    
    // Count inbound connections for each tower
    this.gameState.connections.forEach(conn => {
      const targetTower = this.gameState.getTowerById(conn.targetTowerId);
      if (targetTower) {
        targetTower.setInboundConnectionsCount(targetTower.inboundConnectionsCount + 1);
      }
    });
    
    // Debug isolated towers
    if (Math.random() < 0.01) { // Only log occasionally
      this.gameState.towers.forEach(tower => {
        if (tower.isIsolated() && tower.team !== 'neutral') {
          console.log(`Tower ${tower.id} (team: ${tower.team}) is isolated and self-building at rate: ${tower.getSelfBuildRate()} units per 5 seconds`);
        }
      });
    }
  }

  // Check if a line from (x1,y1) to (x2,y2) intersects with a circle at (cx,cy) with radius r
  lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    // Vector from line start to circle center
    const dx = cx - x1;
    const dy = cy - y1;
    
    // Vector representing the line
    const lineDx = x2 - x1;
    const lineDy = y2 - y1;
    
    // Length of the line squared
    const lineLengthSq = lineDx * lineDx + lineDy * lineDy;
    
    // Early exit if the line has no length
    if (lineLengthSq === 0) return false;
    
    // Calculate the dot product of the line direction and the vector from line start to circle
    const dot = dx * lineDx + dy * lineDy;
    
    // Find the closest point on the line to the circle center
    const t = Math.max(0, Math.min(1, dot / lineLengthSq));
    const closestX = x1 + t * lineDx;
    const closestY = y1 + t * lineDy;
    
    // Distance from closest point to circle center
    const closestDx = closestX - cx;
    const closestDy = closestY - cy;
    const distanceSq = closestDx * closestDx + closestDy * closestDy;
    
    // Check if the closest point is within the circle
    return distanceSq < (r * r);
  }
  
  // Check if there's any tower blocking a direct connection from startTower to (endX, endY)
  findIntersectingTower(startTower, endX, endY) {
    const startX = startTower.x;
    const startY = startTower.y;
    
    // Check each tower for intersection
    for (const tower of this.gameState.towers) {
      // Skip the starting tower
      if (tower.id === startTower.id) continue;
      
      // Don't consider the end position tower as an intersection if it's close to endX/endY
      if (this.isPointNearPosition(endX, endY, tower.x, tower.y, TOWER_RADIUS)) continue;
      
      // Check if this tower intersects the line
      if (this.lineIntersectsCircle(startX, startY, endX, endY, tower.x, tower.y, TOWER_RADIUS)) {
        return tower;
      }
    }
    
    return null;
  }
  
  // Determine if a point is near another position (used to exclude the clicked end tower)
  isPointNearPosition(x1, y1, x2, y2, threshold) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return (dx * dx + dy * dy) <= (threshold * threshold);
  }
  
  // Find if a drag line intersects with any existing connection
  findIntersectedConnection(x1, y1, x2, y2) {
    // Check each connection to see if the drag line intersects it
    for (const conn of this.gameState.connections) {
      const sourceTower = this.gameState.getTowerById(conn.sourceTowerId);
      const targetTower = this.gameState.getTowerById(conn.targetTowerId);
      
      if (!sourceTower || !targetTower) continue;
      
      // Check if the drag line intersects the connection line
      if (this.lineIntersectsLine(
        x1, y1, x2, y2,
        sourceTower.x, sourceTower.y, targetTower.x, targetTower.y
      )) {
        return { sourceTower, targetTower };
      }
    }
    
    return null;
  }
  
  // Helper to determine if two line segments intersect
  lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // If uA and uB are between 0-1, lines are colliding
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
  }

  // Check if a line intersects with a hedge
  lineIntersectsHedge(x1, y1, x2, y2, hedge) {
    const { x, y, width, height, rotation } = hedge;
    
    // Step 1: Translate line endpoints relative to the hedge center
    const translatedX1 = x1 - x;
    const translatedY1 = y1 - y;
    const translatedX2 = x2 - x;
    const translatedY2 = y2 - y;
    
    // Step 2: Rotate the translated points in the opposite direction of the hedge's rotation
    const rotationRad = -rotation * Math.PI / 180; // Convert degrees to radians
    const cosTheta = Math.cos(rotationRad);
    const sinTheta = Math.sin(rotationRad);
    
    let rotatedX1 = translatedX1 * cosTheta - translatedY1 * sinTheta;
    let rotatedY1 = translatedX1 * sinTheta + translatedY1 * cosTheta;
    let rotatedX2 = translatedX2 * cosTheta - translatedY2 * sinTheta;
    let rotatedY2 = translatedX2 * sinTheta + translatedY2 * cosTheta;

    // Step 3: Check if the rotated line intersects the axis-aligned rectangle
    // This is the Cohen-Sutherland line clipping algorithm simplified for our case
    
    // Define the rectangle bounds
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const left = -halfWidth;
    const right = halfWidth;
    const top = -halfHeight;
    const bottom = halfHeight;
    
    // Function to compute the "region code" for a point
    const computeCode = (x, y) => {
      let code = 0;
      if (x < left) code |= 1; // Left
      else if (x > right) code |= 2; // Right
      if (y < top) code |= 4; // Top
      else if (y > bottom) code |= 8; // Bottom
      return code;
    };
    
    // Compute region codes for both points
    let code1 = computeCode(rotatedX1, rotatedY1);
    let code2 = computeCode(rotatedX2, rotatedY2);
    
    // Loop until both points are outside or line intersects
    while (true) {
      // If both endpoints are inside the rectangle, line intersects
      if (!(code1 | code2)) return true;
      
      // If both endpoints are outside the same region, line doesn't intersect
      if (code1 & code2) return false;
      
      // At this point, one point is inside, one is outside, or they're outside different regions
      // We'll move the outside point to the boundary and check again
      
      let x, y;
      const codeOut = code1 ? code1 : code2;
      
      // Find intersection point
      if (codeOut & 8) { // Point is below
        x = rotatedX1 + (rotatedX2 - rotatedX1) * (bottom - rotatedY1) / (rotatedY2 - rotatedY1);
        y = bottom;
      } else if (codeOut & 4) { // Point is above
        x = rotatedX1 + (rotatedX2 - rotatedX1) * (top - rotatedY1) / (rotatedY2 - rotatedY1);
        y = top;
      } else if (codeOut & 2) { // Point is to the right
        y = rotatedY1 + (rotatedY2 - rotatedY1) * (right - rotatedX1) / (rotatedX2 - rotatedX1);
        x = right;
      } else if (codeOut & 1) { // Point is to the left
        y = rotatedY1 + (rotatedY2 - rotatedY1) * (left - rotatedX1) / (rotatedX2 - rotatedX1);
        x = left;
      }
      
      // Replace the outside point with the intersection point
      if (codeOut === code1) {
        rotatedX1 = x;
        rotatedY1 = y;
        code1 = computeCode(rotatedX1, rotatedY1);
      } else {
        rotatedX2 = x;
        rotatedY2 = y;
        code2 = computeCode(rotatedX2, rotatedY2);
      }
    }
  }

  // Connection management logic - Updated for single friendly connection & strict limits
  handleConnectionCreation(startTower, endTower) {
    // Skip if trying to connect to self
    if (startTower.id === endTower.id) return false;
    
    // --- Check 1: Is the source tower already at its connection limit? ---
    // If the tower cannot add *any* more connections, fail early.
    if (!startTower.canAddConnection()) {
      // Check if the *specific* target connection already exists (for logging purposes)
      const existingConnection = this.gameState.connections.find(
        conn => conn.sourceTowerId === startTower.id && conn.targetTowerId === endTower.id
      );
      if (!existingConnection) { // Only log if it's a failed *new* connection attempt
          console.log(`Tower ${startTower.id} cannot add more connections. Current: ${startTower.connections.length}, Max: ${startTower.getMaxConnections()}, Units: ${startTower.unitCount}`);
      }
      return false; // Fail: Source tower is full
    }

    // --- Check 2: Does the exact connection A->B already exist? ---
    const existingConnectionIndex = this.gameState.connections.findIndex(
      conn => conn.sourceTowerId === startTower.id && conn.targetTowerId === endTower.id
    );
    if (existingConnectionIndex !== -1) {
      // Connection A->B already exists. Per user request, do nothing.
      console.log(`Connection from ${startTower.id} to ${endTower.id} already exists. Doing nothing.`);
      return false; // Indicate no action was taken
    }

    // --- Check 3: Does the reverse connection B->A exist between FRIENDLY towers? ---
    const reverseConnectionIndex = this.gameState.connections.findIndex(
      conn => conn.sourceTowerId === endTower.id && conn.targetTowerId === startTower.id
    );
    
    if (reverseConnectionIndex !== -1 && startTower.team !== 'neutral' && startTower.team === endTower.team) {
      // Reverse connection B->A exists between friendly towers.
      // Since we already passed Check 1, we know startTower (A) has capacity.
      // Remove B->A first.
      console.log(`Friendly reverse connection found from ${endTower.id} to ${startTower.id}. Removing it.`);
      this.gameState.connections.splice(reverseConnectionIndex, 1);
      endTower.removeConnection(startTower.id); 
      // Note: updateInboundConnectionCounts will be called later if A->B is successfully added.
    }
    // If reverse connection exists but towers are not friendly, or if no reverse connection exists,
    // we proceed directly to adding A->B (if startTower has capacity, which was checked in Check 1).

    // --- Check 4: Attempt to add the new connection A->B --- 
    // We know startTower has capacity from Check 1.
    const success = startTower.addConnection(endTower.id);
    
    if (success) {
      this.gameState.connections.push({ 
        sourceTowerId: startTower.id, 
        targetTowerId: endTower.id 
      });
      
      console.log(`Added connection from ${startTower.id} to ${endTower.id}`);
      console.log(`Tower ${startTower.id} now has ${startTower.connections.length}/${startTower.getMaxConnections()} connections. Units: ${startTower.unitCount}`);
      
      // Update inbound counts after any potential addition/removal
      this.updateInboundConnectionCounts();
      return true; // Success: Connection added or direction reversed
    } else {
      // This case should theoretically not be reached if canAddConnection() was true,
      // unless addConnection has internal logic preventing duplicates again (which is fine).
      console.log(`Failed to add connection from ${startTower.id} to ${endTower.id} via tower.addConnection, though capacity seemed available.`);
      // Ensure inbound counts are updated even on failure, in case a reverse connection was removed.
      this.updateInboundConnectionCounts(); 
      return false; // Failed to add connection internally in Tower class
    }
  }

  // Check if there's any tower or hedge blocking a direct connection from startTower to (endX, endY)
  checkIntersectingObjects(startTower, endX, endY) {
    const startX = startTower.x;
    const startY = startTower.y;
    
    // First check for intersecting towers
    for (const tower of this.gameState.towers) {
      // Skip the starting tower
      if (tower.id === startTower.id) continue;
      
      // Don't consider the end position tower as an intersection if it's close to endX/endY
      if (this.isPointNearPosition(endX, endY, tower.x, tower.y, TOWER_RADIUS)) continue;
      
      // Check if this tower intersects the line
      if (this.lineIntersectsCircle(startX, startY, endX, endY, tower.x, tower.y, TOWER_RADIUS)) {
        return tower;
      }
    }
    
    // Then check for intersecting hedges
    if (this.gameState.hedges && this.gameState.hedges.length > 0) {
      for (const hedge of this.gameState.hedges) {
        if (this.lineIntersectsHedge(startX, startY, endX, endY, hedge)) {
          // Return a special object that indicates a hedge was hit
          return { 
            isHedge: true, 
            id: hedge.id || 'unknown',
            x: hedge.x,
            y: hedge.y,
            message: "Cannot connect through hedge obstacle"
          };
        }
      }
    }
    
    return null;
  }
}

export default GameEngine;
