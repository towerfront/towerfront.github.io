import { TEAM_COLORS, TOWER_RADIUS, UNIT_RADIUS, TOWER_TYPES, MAX_UNITS_PER_TOWER } from './constants';

class Renderer {
    constructor(ctx, gameState) {
        this.ctx = ctx;
        this.gameState = gameState;
        this.grassPattern = this.createGrassPattern();
        this.staticElements = []; // For decorative elements like trees/bushes that don't interfere with gameplay
        this.towerGrowthAnimation = new Map(); // Track growing towers for animation
        this.hedgeLeafCache = new Map(); // Cache leaf positions per hedge to prevent flicker
        this.connectionFailures = new Map(); // Track failed connection flash animations
        
        // Create a few random decorative elements that don't overlap with initial tower positions
        this.initStaticElements();
        
        // Tower type icons (could be replaced with actual images later)
        // Check if methods exist before binding them
        this.towerIcons = {
            [TOWER_TYPES.ATTACK]: typeof this.createArrowIcon === 'function' ? this.createArrowIcon.bind(this) : null,
            [TOWER_TYPES.DEFEND]: typeof this.createShieldIcon === 'function' ? this.createShieldIcon.bind(this) : null,
            [TOWER_TYPES.HEALING]: typeof this.createHorseheadIcon === 'function' ? this.createHorseheadIcon.bind(this) : null,
            [TOWER_TYPES.NORMAL]: null // No special icon for normal towers
        };
    }

    // Show a brief red flash on a tower when a connection fails
    showConnectionFailure(towerId) {
        this.connectionFailures.set(towerId, {
            startTime: Date.now(),
            duration: 400
        });
    }

    // Add handleCanvasResize method to handle canvas resizing
    handleCanvasResize() {
        // Regenerate grass pattern with new canvas dimensions
        this.grassPattern = this.createGrassPattern();
        
        // Reinitialize static elements based on new canvas dimensions
        this.staticElements = [];
        this.initStaticElements();
        
        // Re-render the scene
        this.render();
    }

    createGrassPattern() {
        // Create a simple grass-like pattern
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        
        patternCanvas.width = 100;
        patternCanvas.height = 100;
        
        // Base grass color
        patternCtx.fillStyle = '#8BC34A';
        patternCtx.fillRect(0, 0, 100, 100);
        
        // Add texture/variation to make it look more like grass
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = 1 + Math.random() * 3;
            
            patternCtx.fillStyle = Math.random() > 0.5 ? '#7CB342' : '#9CCC65'; // Darker/lighter green
            patternCtx.beginPath();
            patternCtx.arc(x, y, size, 0, Math.PI * 2);
            patternCtx.fill();
        }
        
        return this.ctx.createPattern(patternCanvas, 'repeat');
    }
    
    initStaticElements() {
        // Create some decorative elements that don't overlap with initial tower positions
        const safeDistance = TOWER_RADIUS * 3; // Keep decorations away from towers
        const towerPositions = this.gameState.towers.map(t => ({x: t.x, y: t.y}));
        
        // Add some bushes/trees
        const numElements = 15;
        
        for (let i = 0; i < numElements; i++) {
            // Try to find a valid position
            let attempts = 0;
            let valid = false;
            let x, y;
            
            while (!valid && attempts < 20) {
                x = 50 + Math.random() * (this.ctx.canvas.width - 100);
                y = 50 + Math.random() * (this.ctx.canvas.height - 100);
                
                // Check if too close to any tower
                valid = true;
                for (const pos of towerPositions) {
                    const dx = x - pos.x;
                    const dy = y - pos.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    
                    if (distance < safeDistance) {
                        valid = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            if (valid) {
                // Randomly either a bush or tree
                if (Math.random() > 0.7) {
                    // Tree (dark green circle with brown trunk)
                    this.staticElements.push({
                        type: 'tree',
                        x,
                        y,
                        size: 10 + Math.random() * 15
                    });
                } else {
                    // Bush (green circle)
                    this.staticElements.push({
                        type: 'bush',
                        x,
                        y,
                        size: 8 + Math.random() * 10
                    });
                }
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Draw grass background
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        
        // Draw static decorative elements
        this.drawStaticElements();
        
        // Draw hedges (before connections so connections pass behind them)
        if (this.gameState.hedges && Array.isArray(this.gameState.hedges)) {
            this.gameState.hedges.forEach(hedge => this.drawHedge(hedge));
        }

        // Draw Connections (draw first so they are behind towers/units)
        this.drawActiveConnections();
        this.drawPlayerDragLine();

        // Draw Units (before towers so they appear underneath)
        this.gameState.units.forEach(unit => this.drawUnit(unit));

        // Draw Towers (after units so they appear on top)
        this.gameState.towers.forEach(tower => this.drawTower(tower));
        
        // Draw celebration effect if game is won
        if (this.gameState.gameStatus === 'won') {
            this.drawVictoryEffect();
        }
    }
    
    drawStaticElements() {
        this.staticElements.forEach(elem => {
            if (elem.type === 'bush') {
                this.ctx.beginPath();
                this.ctx.arc(elem.x, elem.y, elem.size, 0, Math.PI * 2);
                this.ctx.fillStyle = '#558B2F';
                this.ctx.fill();
            } else if (elem.type === 'tree') {
                // Draw trunk
                this.ctx.beginPath();
                this.ctx.rect(elem.x - 2, elem.y, 4, elem.size * 1.2);
                this.ctx.fillStyle = '#795548';
                this.ctx.fill();
                
                // Draw foliage
                this.ctx.beginPath();
                this.ctx.arc(elem.x, elem.y - elem.size/2, elem.size, 0, Math.PI * 2);
                this.ctx.fillStyle = '#33691E';
                this.ctx.fill();
            }
        });
    }

    // Draw tower with appropriate shape based on type and size based on unit count
    drawTower(tower) {
        const color = TEAM_COLORS[tower.team] || TEAM_COLORS.neutral;
        
        // Scale tower based on unit count thresholds with more exaggerated growth
        let sizeMultiplier = 1;
        let prevSize = tower.prevUnitCount ? (
            tower.prevUnitCount >= 30 ? 1.5 :
            tower.prevUnitCount >= 10 ? 1.25 : 1
        ) : 1;

        if (tower.unitCount >= 30) sizeMultiplier = 1.5;
        else if (tower.unitCount >= 10) sizeMultiplier = 1.25;

        // Check if tower size changed and set animation if needed
        if (tower.prevUnitCount !== tower.unitCount &&
            Math.floor(tower.prevUnitCount / 10) !== Math.floor(tower.unitCount / 10)) {
            this.towerGrowthAnimation.set(tower.id, {
                startTime: Date.now(),
                duration: 500, // 500ms animation
                startSize: prevSize,
                endSize: sizeMultiplier
            });
        }

        // Store current unit count for next frame comparison
        tower.prevUnitCount = tower.unitCount;

        // Apply growth animation if active
        const anim = this.towerGrowthAnimation.get(tower.id);
        if (anim) {
            const elapsed = Date.now() - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);

            // Elastic easing for bounce effect
            const elasticProgress = this.elasticEasing(progress);
            sizeMultiplier = anim.startSize + (anim.endSize - anim.startSize) * elasticProgress;

            // Remove animation when complete
            if (progress >= 1) {
                this.towerGrowthAnimation.delete(tower.id);
            }
        }

        const radius = TOWER_RADIUS * sizeMultiplier;

        this.ctx.save();

        // Draw tower shadow for 3D effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        // Draw shadow slightly offset
        if (tower.type === TOWER_TYPES.DEFEND) {
            this.drawSquareTower(tower.x + 3, tower.y + 3, radius * 1.05, 'rgba(0, 0, 0, 0.2)', true);
        } else if (tower.type === TOWER_TYPES.ATTACK) {
            this.drawPolygonTower(tower.x + 3, tower.y + 3, radius * 1.05, 'rgba(0, 0, 0, 0.2)', true);
        } else { // Includes HEALING and NORMAL
            this.drawRoundTower(tower.x + 3, tower.y + 3, radius * 1.05, 'rgba(0, 0, 0, 0.2)', true);
        }

        // Draw the tower with shape based on type
        if (tower.type === TOWER_TYPES.DEFEND) {
            // Square tower for Defense
            this.drawSquareTower(tower.x, tower.y, radius, color);
        } else if (tower.type === TOWER_TYPES.ATTACK) {
            // Hexagon for Attack
            this.drawPolygonTower(tower.x, tower.y, radius, color);
        } else { // Includes HEALING and NORMAL
            // Round tower for Healing and Normal
            this.drawRoundTower(tower.x, tower.y, radius, color);
        }

        // Draw unit count text based on ranges
        this.ctx.fillStyle = '#FFFFFF'; // White text
        this.ctx.font = `bold ${Math.floor(16 * sizeMultiplier)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Use the Tower's getDisplayValue method if available, otherwise use direct logic
        let displayText;
        if (typeof tower.getDisplayValue === 'function') {
            displayText = tower.getDisplayValue();
        } else {
            // For backwards compatibility if Tower.getDisplayValue isn't available yet
            if (tower.unitCount >= MAX_UNITS_PER_TOWER) {
                displayText = "MAX";
            } else {
                displayText = Math.floor(tower.unitCount).toString();
            }
        }
        
        this.ctx.fillText(displayText, tower.x, tower.y);

        // Draw connection indicators based on tower type
        this.drawConnectionIndicators(tower, radius);

        // Draw connection failure flash if active
        const failAnim = this.connectionFailures.get(tower.id);
        if (failAnim) {
            const elapsed = Date.now() - failAnim.startTime;
            const progress = elapsed / failAnim.duration;
            if (progress < 1) {
                const alpha = 0.6 * (1 - progress);
                this.ctx.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, radius + 6, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                this.connectionFailures.delete(tower.id);
            }
        }

        this.ctx.restore();
    }

    // Draw custom connection indicators based on tower type
    drawConnectionIndicators(tower, radius) {
        const maxConnections = tower.getMaxConnections();
        const usedConnections = tower.connections.length;
        const indicatorSize = 6; // Base size for icons
        const indicatorSpacing = indicatorSize * 1.5; // Spacing based on icon size
        const totalWidth = (maxConnections - 1) * indicatorSpacing;
        const startX = tower.x - totalWidth / 2;
        // Position indicators below the unit count text, adjusting slightly based on text content
        const textHeightEstimate = 16; // Estimate font size
        const indicatorY = tower.y + textHeightEstimate * 0.6 + indicatorSize; // Position below text

        this.ctx.lineWidth = 1.5; // Default line width for outlines

        // Choose the appropriate indicator shape based on tower type
        for (let i = 0; i < maxConnections; i++) {
            const indicatorX = startX + i * indicatorSpacing;
            const isUsed = i < usedConnections;

            if (tower.type === TOWER_TYPES.ATTACK) {
                this.drawArrowheadIndicator(indicatorX, indicatorY, indicatorSize, isUsed);
            } else if (tower.type === TOWER_TYPES.DEFEND) {
                this.drawShieldIndicator(indicatorX, indicatorY, indicatorSize, isUsed);
            } else if (tower.type === TOWER_TYPES.HEALING) { // Assuming HEALING uses horsehead/cross
                this.drawHorseheadIndicator(indicatorX, indicatorY, indicatorSize, isUsed);
            } else { // Fallback for NORMAL or other types
                 this.drawDotIndicator(indicatorX, indicatorY, indicatorSize * 0.5, isUsed); // Use smaller dot for normal
            }
        }
         // Reset line width after drawing all indicators
         this.ctx.lineWidth = 1;
    }

    // Draw arrowhead indicator for attack towers
    drawArrowheadIndicator(x, y, size, isUsed) {
        const halfSize = size / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - halfSize); // Top point
        this.ctx.lineTo(x + halfSize, y + halfSize); // Bottom right
        this.ctx.lineTo(x - halfSize, y + halfSize); // Bottom left
        this.ctx.closePath();

        if (isUsed) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }
    }

    // Draw shield indicator for defense towers
    drawShieldIndicator(x, y, size, isUsed) {
        const w = size * 0.8; // width based on size
        const h = size; // height based on size

        this.ctx.beginPath();
        // Simplified shield shape
        this.ctx.moveTo(x - w / 2, y - h / 2); // Top-left
        this.ctx.lineTo(x + w / 2, y - h / 2); // Top-right
        this.ctx.lineTo(x + w / 2, y + h / 4); // Mid-right side
        this.ctx.quadraticCurveTo(x, y + h / 2 + 2, x - w / 2, y + h / 4); // Bottom curve to mid-left
        this.ctx.closePath(); // Back to Top-left

        if (isUsed) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }
    }

    // Draw horsehead indicator (simplified cross) for healing towers
    drawHorseheadIndicator(x, y, size, isUsed) {
        const armLength = size / 2;

        this.ctx.beginPath();
        // Vertical bar
        this.ctx.moveTo(x, y - armLength);
        this.ctx.lineTo(x, y + armLength);
        // Horizontal bar
        this.ctx.moveTo(x - armLength, y);
        this.ctx.lineTo(x + armLength, y);

        this.ctx.strokeStyle = '#FFFFFF'; // Always white

        if (isUsed) {
            // Used connection - thicker white line
            this.ctx.lineWidth = 2.5; // Make it thicker
            this.ctx.stroke();
        } else {
            // Available connection - thin white outline
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }
         // Reset line width just in case it was changed
         this.ctx.lineWidth = 1.5;
    }

    // Draw dot indicator for normal towers (fallback)
    drawDotIndicator(x, y, radius, isUsed) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (isUsed) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }
    }

    drawUnit(unit) {
        const color = TEAM_COLORS[unit.team] || TEAM_COLORS.neutral;

        // Draw unit with outline for better visibility
        this.ctx.beginPath();
        this.ctx.arc(unit.x, unit.y, UNIT_RADIUS, 0, Math.PI * 2);
        
        // Fill with team color
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Add white outline for better visibility
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
    }

    drawActiveConnections() {
        // First, identify bidirectional connections
        const bidirectionalPairs = new Map(); // Map<"smallerId-largerId", {source1Id, target1Id, source2Id, target2Id}>
        
        this.gameState.connections.forEach(conn => {
            const sourceTower = this.gameState.getTowerById(conn.sourceTowerId);
            const targetTower = this.gameState.getTowerById(conn.targetTowerId);
            
            if (sourceTower && targetTower) {
                // Check if reverse connection exists
                const reverseExists = this.gameState.connections.some(
                    c => c.sourceTowerId === targetTower.id && c.targetTowerId === sourceTower.id
                );
                
                if (reverseExists) {
                    // Create a unique key for this bidirectional pair
                    const minId = Math.min(sourceTower.id, targetTower.id);
                    const maxId = Math.max(sourceTower.id, targetTower.id);
                    const pairKey = `${minId}-${maxId}`;
                    
                    if (!bidirectionalPairs.has(pairKey)) {
                        bidirectionalPairs.set(pairKey, {
                            source1Id: sourceTower.id,
                            target1Id: targetTower.id,
                            source2Id: targetTower.id, 
                            target2Id: sourceTower.id
                        });
                    }
                }
            }
        });
        
        // Keep track of processed bidirectional connections
        const processedBidirectional = new Set();
        
        // Draw each connection
        this.gameState.connections.forEach(conn => {
            const sourceTower = this.gameState.getTowerById(conn.sourceTowerId);
            const targetTower = this.gameState.getTowerById(conn.targetTowerId);
            
            if (!sourceTower || !targetTower) return;
            
            const sourceColor = TEAM_COLORS[sourceTower.team] || TEAM_COLORS.neutral;
            const targetColor = TEAM_COLORS[targetTower.team] || TEAM_COLORS.neutral;
            
            // Calculate vector from source to target
            const dx = targetTower.x - sourceTower.x;
            const dy = targetTower.y - sourceTower.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Unit vector
            const ux = dx / dist;
            const uy = dy / dist;
            
            // Perpendicular unit vector (for arrow width)
            const px = -uy;
            const py = ux;
            
            // Constants for visual styling
            const arrowWidth = 6; // Width of the connection line
            const arrowDensity = 4; // How many arrows per 100px
            const arrowLength = 12; // Length of each arrow
            
            // Check if this is part of a bidirectional pair
            const minId = Math.min(sourceTower.id, targetTower.id);
            const maxId = Math.max(sourceTower.id, targetTower.id);
            const pairKey = `${minId}-${maxId}`;
            
            if (bidirectionalPairs.has(pairKey)) {
                // If we've already processed this bidirectional pair, skip
                if (processedBidirectional.has(pairKey)) {
                    return;
                }
                
                // Mark as processed
                processedBidirectional.add(pairKey);
                
                // Draw bidirectional path with two colors
                this.drawBidirectionalConnection(
                    sourceTower, 
                    targetTower, 
                    sourceColor, 
                    targetColor,
                    arrowWidth,
                    arrowDensity,
                    arrowLength
                );
            } else {
                // Draw normal unidirectional path
                this.drawUnidirectionalConnection(
                    sourceTower,
                    targetTower,
                    sourceColor,
                    arrowWidth,
                    arrowDensity,
                    arrowLength
                );
            }
        });
    }
    
    // Draw connection with arrows going in one direction
    drawUnidirectionalConnection(sourceTower, targetTower, color, arrowWidth, arrowDensity, arrowLength) {
        // Calculate vector from source to target
        const dx = targetTower.x - sourceTower.x;
        const dy = targetTower.y - sourceTower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Unit vector
        const ux = dx / dist;
        const uy = dy / dist;
        
        // Perpendicular unit vector (for arrow width)
        const px = -uy;
        const py = ux;
        
        // Base points for the connection path
        const basePath = [
            // Left edge points
            { x: sourceTower.x + px * arrowWidth, y: sourceTower.y + py * arrowWidth },
            { x: targetTower.x + px * arrowWidth, y: targetTower.y + py * arrowWidth },
            
            // Right edge points (in reverse to complete shape)
            { x: targetTower.x - px * arrowWidth, y: targetTower.y - py * arrowWidth },
            { x: sourceTower.x - px * arrowWidth, y: sourceTower.y - py * arrowWidth }
        ];
        
        // Draw the colored connection path
        this.ctx.beginPath();
        this.ctx.moveTo(basePath[0].x, basePath[0].y);
        for (let i = 1; i < basePath.length; i++) {
            this.ctx.lineTo(basePath[i].x, basePath[i].y);
        }
        this.ctx.closePath();
        
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.7; // Slightly transparent
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        // Draw directional arrows along the connection
        this.drawDirectionalArrows(sourceTower, targetTower, arrowDensity, arrowLength, dist);
    }
    
    // Draw connection with arrows going in both directions, split the color in half
    drawBidirectionalConnection(sourceTower, targetTower, color1, color2, arrowWidth, arrowDensity, arrowLength) {
        // Calculate vector from source to target
        const dx = targetTower.x - sourceTower.x;
        const dy = targetTower.y - sourceTower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Unit vector
        const ux = dx / dist;
        const uy = dy / dist;
        
        // Perpendicular unit vector (for arrow width)
        const px = -uy;
        const py = ux;
        
        // Calculate the midpoint
        const midX = (sourceTower.x + targetTower.x) / 2;
        const midY = (sourceTower.y + targetTower.y) / 2;
        
        // Create two sets of points for each half of the connection
        
        // First half (sourceTower to midpoint, color1)
        this.ctx.beginPath();
        this.ctx.moveTo(sourceTower.x + px * arrowWidth, sourceTower.y + py * arrowWidth);
        this.ctx.lineTo(midX + px * arrowWidth, midY + py * arrowWidth);
        this.ctx.lineTo(midX - px * arrowWidth, midY - py * arrowWidth);
        this.ctx.lineTo(sourceTower.x - px * arrowWidth, sourceTower.y - py * arrowWidth);
        this.ctx.closePath();
        
        this.ctx.fillStyle = color1;
        this.ctx.globalAlpha = 0.7;
        this.ctx.fill();
        
        // Second half (midpoint to targetTower, color2)
        this.ctx.beginPath();
        this.ctx.moveTo(midX + px * arrowWidth, midY + py * arrowWidth);
        this.ctx.lineTo(targetTower.x + px * arrowWidth, targetTower.y + py * arrowWidth);
        this.ctx.lineTo(targetTower.x - px * arrowWidth, targetTower.y - py * arrowWidth);
        this.ctx.lineTo(midX - px * arrowWidth, midY - py * arrowWidth);
        this.ctx.closePath();
        
        this.ctx.fillStyle = color2;
        this.ctx.globalAlpha = 0.7;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        // Draw arrows for the first half (source to mid, flowing from source to target)
        this.drawHalfDirectionalArrows(sourceTower.x, sourceTower.y, midX, midY, dist/2, arrowDensity, arrowLength);
        
        // Draw arrows for the second half (mid to target, flowing from target to source)
        this.ctx.save();
        this.drawHalfDirectionalArrows(targetTower.x, targetTower.y, midX, midY, dist/2, arrowDensity, arrowLength);
        this.ctx.restore();
    }
    
    // Helper for drawing directional arrows along a connection
    drawDirectionalArrows(sourceTower, targetTower, arrowDensity, arrowLength, dist) {
        // Calculate vector from source to target
        const dx = targetTower.x - sourceTower.x;
        const dy = targetTower.y - sourceTower.y;
        
        const numArrows = Math.max(1, Math.floor(dist * arrowDensity / 100));
        const arrowSpacing = dist / (numArrows + 1);
        
        // Animate arrow positions along the connection
        const time = performance.now() / 1000;
        const flowOffset = (time * 60) % arrowSpacing; // Move at 60px/s
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        for (let i = 0; i <= numArrows; i++) {
            const basePos = i * arrowSpacing + flowOffset;
            if (basePos <= 0 || basePos >= dist) continue;
            const t = basePos / dist;
            const arrowX = sourceTower.x + dx * t;
            const arrowY = sourceTower.y + dy * t;
            
            // Draw small directional triangle
            this.ctx.save();
            this.ctx.translate(arrowX, arrowY);
            this.ctx.rotate(Math.atan2(dy, dx));
            
            this.ctx.beginPath();
            this.ctx.moveTo(arrowLength/2, 0);
            this.ctx.lineTo(-arrowLength/2, -arrowLength/3);
            this.ctx.lineTo(-arrowLength/2, arrowLength/3);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
    
    // Helper for drawing directional arrows in half connections (for bidirectionals)
    drawHalfDirectionalArrows(startX, startY, endX, endY, halfDist, arrowDensity, arrowLength) {
        const dx = endX - startX;
        const dy = endY - startY;
        
        const numArrows = Math.max(1, Math.floor(halfDist * arrowDensity / 100));
        const arrowSpacing = halfDist / (numArrows + 1);
        
        // Animate arrow positions
        const time = performance.now() / 1000;
        const flowOffset = (time * 60) % arrowSpacing;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        for (let i = 0; i <= numArrows; i++) {
            const basePos = i * arrowSpacing + flowOffset;
            if (basePos <= 0 || basePos >= halfDist) continue;
            const t = basePos / halfDist;
            const arrowX = startX + dx * t;
            const arrowY = startY + dy * t;
            
            // Draw small directional triangle
            this.ctx.save();
            this.ctx.translate(arrowX, arrowY);
            this.ctx.rotate(Math.atan2(dy, dx));
            
            this.ctx.beginPath();
            this.ctx.moveTo(arrowLength/2, 0);
            this.ctx.lineTo(-arrowLength/2, -arrowLength/3);
            this.ctx.lineTo(-arrowLength/2, arrowLength/3);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    drawPlayerDragLine() {
        const { isDragging, startTowerId, currentMousePos } = this.gameState.playerInput;
        if (isDragging && startTowerId !== null) {
            const startTower = this.gameState.getTowerById(startTowerId);
            if (startTower) {
                const color = TEAM_COLORS[startTower.team] || TEAM_COLORS.neutral;
                
                // Draw a thinner, dashed line for dragging
                this.ctx.beginPath();
                this.ctx.moveTo(startTower.x, startTower.y);
                this.ctx.lineTo(currentMousePos.x, currentMousePos.y);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([8, 4]); // Different dash for drag line
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }
    
    drawVictoryEffect() {
        // Only draw if game is won but victory not yet declared
        // This is subtle to not distract from gameplay that can continue
        
        const time = performance.now() / 1000;
        const canvasWidth = this.ctx.canvas.width;
        const canvasHeight = this.ctx.canvas.height;
        
        // Draw a subtle glowing effect around the perimeter
        this.ctx.save();
        
        // Create gradient for glowing effect
        const gradient = this.ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.2)'); // Gold
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
        
        // Draw with animated width
        const borderWidth = 10 + Math.sin(time * 2) * 5;
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(borderWidth/2, borderWidth/2, 
                           canvasWidth - borderWidth, canvasHeight - borderWidth);
        
        this.ctx.restore();
    }

    // Elastic easing function for bounce effect
    elasticEasing(t) {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }

    // Draw round tower with medieval style keyways
    drawRoundTower(x, y, radius, color, isShadow = false) {
        // Draw the main circular tower
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        if (!isShadow) {
            // Draw castle-like keyways at the top
            const keyways = 3; // Number of keyways
            const keywayWidth = radius / 3;
            const keywayHeight = radius / 2.5;
            const towerTopY = y - radius;
            
            this.ctx.fillStyle = color;
            for (let i = 0; i < keyways; i++) {
                const angle = (i - 1) * Math.PI / 8;
                const keywayX = x + Math.sin(angle) * radius;
                const baseY = y - Math.cos(angle) * radius;
                
                this.ctx.beginPath();
                this.ctx.rect(keywayX - keywayWidth/2, baseY - keywayHeight, keywayWidth, keywayHeight);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(keywayX - keywayWidth/2, baseY - keywayHeight, keywayWidth, keywayHeight);
            }
            
            // Draw tower outline
            this.ctx.strokeStyle = '#333'; 
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    // Draw square tower for defense type with medieval style keyways
    drawSquareTower(x, y, radius, color, isShadow = false) {
        const size = radius * 1.8; // Convert radius to square size
        
        this.ctx.fillStyle = color;
        
        // Base of the tower
        this.ctx.beginPath();
        this.ctx.rect(x - size/2, y - size/2, size, size);
        this.ctx.fill();
        
        if (!isShadow) {
            // Draw castle-like keyways at the top
            const keyways = 3; // Number of keyways
            const keywayWidth = size / (keyways * 2 - 1);
            const keywayHeight = size / 5;
            
            this.ctx.fillStyle = color;
            for (let i = 0; i < keyways; i++) {
                const keywayX = x - size/2 + i * keywayWidth * 2;
                const keywayY = y - size/2 - keywayHeight;
                
                this.ctx.beginPath();
                this.ctx.rect(keywayX, keywayY, keywayWidth, keywayHeight);
                this.ctx.fill();
            }
            
            // Draw outline
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            
            // Main tower outline
            this.ctx.strokeRect(x - size/2, y - size/2, size, size);
            
            // Keyway outlines
            for (let i = 0; i < keyways; i++) {
                const keywayX = x - size/2 + i * keywayWidth * 2;
                const keywayY = y - size/2 - keywayHeight;
                
                this.ctx.strokeRect(keywayX, keywayY, keywayWidth, keywayHeight);
            }
        }
    }

    // Draw polygon tower (hexagon) for attack type with medieval style keyways
    drawPolygonTower(x, y, radius, color, isShadow = false) {
        const sides = 6; // Hexagon
        
        // Draw the main hexagonal tower
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius * Math.cos(0), y + radius * Math.sin(0));
        
        for (let i = 1; i <= sides; i++) {
            const angle = i * 2 * Math.PI / sides;
            this.ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        if (!isShadow) {
            // Draw castle-like keyways at the top
            const keyways = 3;
            const keywayWidth = radius / 3;
            const keywayHeight = radius / 2.5;
            
            this.ctx.fillStyle = color;
            for (let i = 0; i < keyways; i++) {
                const angle = (i - 1) * Math.PI / 10;
                const keywayX = x + Math.sin(angle) * radius;
                const baseY = y - Math.cos(angle) * radius;
                
                this.ctx.beginPath();
                this.ctx.rect(keywayX - keywayWidth/2, baseY - keywayHeight, keywayWidth, keywayHeight);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(keywayX - keywayWidth/2, baseY - keywayHeight, keywayWidth, keywayHeight);
            }
            
            // Draw tower outline
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius * Math.cos(0), y + radius * Math.sin(0));
            
            for (let i = 1; i <= sides; i++) {
                const angle = i * 2 * Math.PI / sides;
                this.ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
            }
            
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    // Draw a hedge obstacle
    drawHedge(hedge) {
        const { x, y, width, height, rotation } = hedge;
        
        this.ctx.save();
        
        // Move context to hedge position and apply rotation
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation * Math.PI / 180);
        
        // Draw hedge shadow for depth effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(-width/2 + 3, -height/2 + 3, width, height);
        
        // Draw the hedge base
        this.ctx.fillStyle = '#2E7D32'; // Dark green base
        this.ctx.fillRect(-width/2, -height/2, width, height);
        
        // Add texture and detail to the hedge — use cached leaf positions to prevent flicker
        const leafSize = 5;
        const leafDensity = Math.max(8, Math.floor((width * height) / 300));
        const hedgeKey = hedge.id != null ? hedge.id : `${x}_${y}_${width}_${height}`;
        
        if (!this.hedgeLeafCache.has(hedgeKey)) {
            const leaves = [];
            for (let i = 0; i < leafDensity; i++) {
                leaves.push({
                    x: (Math.random() * width) - width/2,
                    y: (Math.random() * height) - height/2,
                    shade: Math.random() > 0.5 ? '#388E3C' : '#43A047'
                });
            }
            this.hedgeLeafCache.set(hedgeKey, leaves);
        }
        
        const cachedLeaves = this.hedgeLeafCache.get(hedgeKey);
        cachedLeaves.forEach(leaf => {
            this.ctx.fillStyle = leaf.shade;
            this.ctx.beginPath();
            this.ctx.arc(leaf.x, leaf.y, leafSize, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Add outline
        this.ctx.strokeStyle = '#1B5E20'; // Darker green for outline
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-width/2, -height/2, width, height);
        
        this.ctx.restore();
    }
}

export default Renderer;
