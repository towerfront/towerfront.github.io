import { AI_DECISION_INTERVAL } from './constants';

class AIController {
    constructor(team, gameState) {
        this.team = team;
        this.gameState = gameState;
        this.decisionTimer = Math.random() * AI_DECISION_INTERVAL; // Stagger initial decisions
        this.lastTargets = {}; // Keep track of recent targets for each tower
        this.difficulty = 'easy'; // Default difficulty level - can be updated
        
        // Add connection cooldown properties
        this.connectionCooldown = false; // Flag to indicate if team is on connection cooldown
        this.connectionCooldownTimer = 0; // Timer to track cooldown duration
        this.pendingTowers = []; // Queue of towers waiting to make connections
        
        // Keep track of towers that have been processed this decision cycle
        this.processedTowers = new Set();
        
        // Track when we last refreshed the tower list
        this.lastRefreshTime = 0;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    update(deltaTime) {
        // Check if we need to refresh our tower list periodically (every 5 seconds)
        // This ensures towers that gain new connection slots get rechecked
        this.lastRefreshTime += deltaTime;
        if (this.lastRefreshTime > 5) {
            this.refreshTowerList();
            this.lastRefreshTime = 0;
        }
        
        // Process connection cooldown timer if active
        if (this.connectionCooldown) {
            this.connectionCooldownTimer -= deltaTime;
            
            // If cooldown expired and there are pending towers, process the next one
            if (this.connectionCooldownTimer <= 0) {
                this.connectionCooldown = false;
                // Don't immediately process - let the next decision cycle handle it
                // This gives us a chance to refresh the tower list
            }
        }

        // Regular decision timer
        this.decisionTimer += deltaTime;

        if (this.decisionTimer >= AI_DECISION_INTERVAL) {
            this.decisionTimer = 0; // Reset timer
            this.makeDecision();
        }
    }

    // New method to refresh the tower list without waiting for decision cycle
    refreshTowerList() {
        const myTowers = this.gameState.towers.filter(t => t.team === this.team);
        
        // If we're on cooldown, just note which towers have capacity
        // but don't disturb the existing queue
        if (this.connectionCooldown) {
            // Just for logging, count how many towers have capacity
            const towersWithCapacity = myTowers.filter(tower => tower.canAddConnection()).length;
            if (towersWithCapacity > 0) {
                console.log(`AI (${this.team}): ${towersWithCapacity} towers with available connections (on cooldown)`);
            }
            return;
        }
        
        // If not on cooldown, refresh the tower list
        const availableTowers = myTowers.filter(tower => 
            tower.canAddConnection() && !this.processedTowers.has(tower.id)
        );
        
        // Add any new available towers to our pending list
        availableTowers.forEach(tower => {
            if (!this.pendingTowers.some(t => t.id === tower.id)) {
                this.pendingTowers.push(tower);
            }
        });
        
        // If we have pending towers and aren't on cooldown, process the next one
        if (this.pendingTowers.length > 0 && !this.connectionCooldown) {
            this.processNextTowerConnection();
        } else {
            // If no towers have capacity, reset processed set for next full decision cycle
            if (availableTowers.length === 0 && myTowers.some(t => t.connections.length > 0)) {
                console.log(`AI (${this.team}): No towers with available connections, resetting process state`);
                this.processedTowers.clear();
            }
        }
    }

    makeDecision() {
        // Get towers controlled by this AI
        const myTowers = this.gameState.towers.filter(t => t.team === this.team);
        // Get all potential target towers (non-allied)
        const potentialTargets = this.gameState.towers.filter(t => t.team !== this.team);

        if (myTowers.length === 0 || potentialTargets.length === 0) {
            return; // No towers to control or no targets
        }

        // If we have no pending towers or it's been a while since we refreshed
        // Rebuild the pending tower list
        if (this.pendingTowers.length === 0 || this.lastRefreshTime > 4) {
            console.log(`AI (${this.team}): Refreshing tower list`);
            
            // Find all towers that can make new connections and haven't been processed
            const availableTowers = myTowers.filter(tower => 
                tower.canAddConnection() && !this.processedTowers.has(tower.id)
            );
            
            if (availableTowers.length === 0) {
                // If no towers with capacity, reset our processed set to try all towers again
                if (myTowers.some(t => t.connections.length > 0)) { // Only if we have some towers with connections
                    console.log(`AI (${this.team}): All towers processed, resetting for next cycle`);
                    this.processedTowers.clear();
                    // Try again with all towers
                    this.pendingTowers = myTowers.filter(tower => tower.canAddConnection());
                }
            } else {
                this.pendingTowers = availableTowers;
            }
            
            // Log the tower state
            const towerInfo = myTowers.map(t => 
                `Tower ${t.id}: ${t.connections.length}/${t.getMaxConnections()} connections`
            ).join(', ');
            console.log(`AI (${this.team}): Tower status - ${towerInfo}`);
            
            // Strategy varies by difficulty - just set up which towers can make connections
            switch (this.difficulty) {
                case 'hard':
                case 'expert':
                    this.prepareTowersAggressive(this.pendingTowers, potentialTargets);
                    break;
                case 'medium':
                    // 50% chance of aggressive or balanced strategy
                    Math.random() > 0.5 ? 
                        this.prepareTowersAggressive(this.pendingTowers, potentialTargets) : 
                        this.prepareTowersBalanced(this.pendingTowers, potentialTargets);
                    break;
                case 'easy':
                default:
                    this.prepareTowersBalanced(this.pendingTowers, potentialTargets);
                    break;
            }
        }
        
        // Process the next tower if not on cooldown
        if (!this.connectionCooldown && this.pendingTowers.length > 0) {
            this.processNextTowerConnection();
        }
    }

    // Process the next tower in the queue
    processNextTowerConnection() {
        if (this.pendingTowers.length === 0) return;
        
        // Get the next tower
        const nextTower = this.pendingTowers.shift();
        
        // Skip this tower if it can't actually make connections
        // (this might happen if it lost units since we built the list)
        if (!nextTower.canAddConnection()) {
            console.log(`AI (${this.team}): Tower ${nextTower.id} can no longer add connections, skipping`);
            // Mark it as processed
            this.processedTowers.add(nextTower.id);
            // Continue to the next tower without cooldown
            this.processNextTowerConnection();
            return;
        }
        
        // Check if we have a good target for this tower
        const bestTarget = this.findBestTarget(
            nextTower, 
            this.gameState.towers.filter(t => t.team !== this.team)
        );
        
        // If we found a target, try to connect
        if (bestTarget) {
            // If we successfully connected, initiate cooldown
            const connected = this.connectTowers(nextTower, bestTarget);
            if (connected) {
                // Mark this tower as processed
                this.processedTowers.add(nextTower.id);
                
                // Start cooldown timer - random between 1-2 seconds
                this.connectionCooldown = true;
                this.connectionCooldownTimer = 1 + Math.random(); // 1-2 seconds
                console.log(`AI (${this.team}): Connection made from Tower ${nextTower.id} to Tower ${bestTarget.id}, cooling down for ${this.connectionCooldownTimer.toFixed(2)}s`);
            } else {
                // Connection failed but still mark tower as processed to avoid retrying repeatedly
                this.processedTowers.add(nextTower.id);
                console.log(`AI (${this.team}): Failed to connect Tower ${nextTower.id}, marking as processed`);
                // Try next tower without cooldown since we didn't actually connect
                this.processNextTowerConnection();
            }
        } else {
            // If no good target for this tower, mark it as processed and move to the next one
            console.log(`AI (${this.team}): No suitable target for Tower ${nextTower.id}`);
            this.processedTowers.add(nextTower.id);
            // Continue to the next tower without cooldown
            this.processNextTowerConnection();
        }
    }

    // Prepare towers for balanced strategy (don't connect immediately)
    prepareTowersBalanced(myTowers, potentialTargets) {
        // Prioritize by neutrals first, then enemies
        // Sort towers by some priority (e.g., most units first for stronger offensive)
        return myTowers.sort((a, b) => b.unitCount - a.unitCount);
    }

    // Prepare towers for aggressive strategy (don't connect immediately)
    prepareTowersAggressive(myTowers, potentialTargets) {
        // Prioritize attacking player
        // Sort towers by some priority
        return myTowers.sort((a, b) => b.unitCount - a.unitCount);
    }

    // Strategy that prioritizes capturing neutral towers first, then attacking weak enemies
    // This is now an older method, kept for reference but not used directly
    balancedStrategy(myTowers, potentialTargets) {
        // Process each tower that can make new connections
        myTowers.forEach(tower => {
            if (!tower.canAddConnection()) return;

            // Check for neutral towers first
            let bestTarget = this.findBestTarget(tower, potentialTargets.filter(t => t.team === 'neutral'));
            
            // If no neutrals or all connected, look for enemy towers
            if (!bestTarget) {
                const enemyTargets = potentialTargets.filter(t => 
                    t.team !== 'neutral' && t.team !== this.team);
                bestTarget = this.findBestTarget(tower, enemyTargets);
            }

            // If target found and not already connected, connect
            if (bestTarget) {
                this.connectTowers(tower, bestTarget);
            }
        });
    }

    // Strategy that prioritizes attacking player towers
    // This is now an older method, kept for reference but not used directly
    aggressiveStrategy(myTowers, potentialTargets) {
        // Process each tower that can make new connections
        myTowers.forEach(tower => {
            if (!tower.canAddConnection()) return;

            // Prioritize player towers (blue)
            const playerTeam = this.gameState.playerTeam;
            let bestTarget = this.findBestTarget(
                tower, 
                potentialTargets.filter(t => t.team === playerTeam)
            );
            
            // If no player towers or all connected, look for any other target
            if (!bestTarget) {
                bestTarget = this.findBestTarget(tower, potentialTargets);
            }

            // If target found and not already connected, connect
            if (bestTarget) {
                this.connectTowers(tower, bestTarget);
            }
        });
    }

    // Helper to find best target based on unit count and distance
    findBestTarget(sourceTower, targets) {
        if (targets.length === 0) return null;

        // Filter out targets that are already connected
        const unconnectedTargets = targets.filter(target => 
            !this.gameState.connections.some(conn => 
                conn.sourceTowerId === sourceTower.id && conn.targetTowerId === target.id
            )
        );

        if (unconnectedTargets.length === 0) return null;

        // Calculate combined score for each target based on:
        // - Unit count (lower is better for attack)
        // - Distance (shorter is better)
        // - Whether this target was recently chosen (avoid oscillation)
        let bestTarget = null;
        let bestScore = -Infinity;

        unconnectedTargets.forEach(target => {
            // Don't attack if target is friendly and has reverse connection
            if (target.team === sourceTower.team) {
                const hasReverseConnection = this.gameState.connections.some(
                    conn => conn.sourceTowerId === target.id && conn.targetTowerId === sourceTower.id
                );
                if (hasReverseConnection) return;
            }

            // Calculate distance
            const dx = target.x - sourceTower.x;
            const dy = target.y - sourceTower.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate score (higher is better)
            // Lower unit count and shorter distance are preferred
            const unitScore = 100 - target.unitCount; // Invert so lower unit count gives higher score
            const distanceScore = 1000 - distance; // Invert so shorter distance gives higher score
            
            // Recently targeted penalty
            const recentlyTargeted = this.lastTargets[sourceTower.id] === target.id;
            const noveltyBonus = recentlyTargeted ? -50 : 0;

            // Combined score
            const score = unitScore + distanceScore * 0.2 + noveltyBonus;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        });

        return bestTarget;
    }

    // Helper to establish a connection between towers
    connectTowers(source, target) {
        // Check if there's any tower or hedge blocking a direct connection (collision detection)
        const intersectingObject = this.checkIntersectingObjects(source, target);
        if (intersectingObject) {
            if (intersectingObject.isHedge) {
                // If there's a hedge in the way, we cannot create the connection
                console.log(`AI (${this.team}): Cannot connect Tower ${source.id} to Tower ${target.id} - blocked by hedge`);
                return false;
            } else if (intersectingObject.isTower) {
                // If there's a tower in the way
                console.log(`AI (${this.team}): Cannot connect Tower ${source.id} to Tower ${target.id} - blocked by Tower ${intersectingObject.id}`);
                // Optionally, target the intersecting tower instead
                if (intersectingObject.tower.team !== this.team) {
                    console.log(`AI (${this.team}): Redirecting attack to intercepting Tower ${intersectingObject.id} instead`);
                    return this.connectTowers(source, intersectingObject.tower);
                }
                return false;
            }
        }

        // Check if there's already any connection between these towers (regardless of team)
        const existingConnection = this.gameState.connections.some(
            conn => conn.sourceTowerId === source.id && conn.targetTowerId === target.id
        );

        // If there's already a connection between these nodes, don't create another
        if (existingConnection) {
            console.log(`AI (${this.team}): Cannot connect Tower ${source.id} to Tower ${target.id} - connection already exists`);
            return false;
        }

        // Normal connection logic
        if (source.canAddConnection()) {
            console.log(`AI (${this.team}): Tower ${source.id} targeting Tower ${target.id}`);
            
            // Remember this target to avoid oscillation
            this.lastTargets[source.id] = target.id;
            
            // Add the connection
            source.addConnection(target.id);
            this.gameState.connections.push({
                sourceTowerId: source.id,
                targetTowerId: target.id
            });
            return true;
        }
        return false;
    }

    // Check if there are any towers blocking a direct connection
    checkIntersectingTowers(source, target) {
        // For each tower, check if it intersects the line from source to target
        for (const tower of this.gameState.towers) {
            // Skip source and target towers
            if (tower.id === source.id || tower.id === target.id) continue;
            
            // Check if this tower intersects the line
            if (this.lineIntersectsCircle(
                source.x, source.y, 
                target.x, target.y, 
                tower.x, tower.y, 
                tower.radius || 30 // Use tower radius or default
            )) {
                return tower;
            }
        }
        
        return null;
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

    // Check if there are any towers or hedges blocking a direct connection
    checkIntersectingObjects(source, target) {
        // First check for intersecting towers
        const intersectingTower = this.checkIntersectingTowers(source, target);
        if (intersectingTower) {
            return { 
                isTower: true,
                id: intersectingTower.id,
                tower: intersectingTower
            };
        }
        
        // Then check for intersecting hedges
        if (this.gameState.hedges && this.gameState.hedges.length > 0) {
            for (const hedge of this.gameState.hedges) {
                if (this.lineIntersectsHedge(
                    source.x, source.y, 
                    target.x, target.y, 
                    hedge
                )) {
                    return { 
                        isHedge: true, 
                        id: hedge.id || 'unknown',
                        message: "Cannot connect through hedge obstacle"
                    };
                }
            }
        }
        
        return null;
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
        
        // Correctly calculate rotated coordinates
        let rotatedX1 = translatedX1 * cosTheta - translatedY1 * sinTheta;
        let rotatedY1 = translatedX1 * sinTheta + translatedY1 * cosTheta;
        let rotatedX2 = translatedX2 * cosTheta - translatedY2 * sinTheta;
        let rotatedY2 = translatedX2 * sinTheta + translatedY2 * cosTheta;

        // Step 3: Check if the rotated line intersects the axis-aligned rectangle
        // Using the Cohen-Sutherland line clipping algorithm simplified for our case
        
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
            
            let intersectX, intersectY;
            const codeOut = code1 ? code1 : code2;
            
            // Find intersection point
            if (codeOut & 8) { // Point is below
                intersectX = rotatedX1 + (rotatedX2 - rotatedX1) * (bottom - rotatedY1) / (rotatedY2 - rotatedY1);
                intersectY = bottom;
            } else if (codeOut & 4) { // Point is above
                intersectX = rotatedX1 + (rotatedX2 - rotatedX1) * (top - rotatedY1) / (rotatedY2 - rotatedY1);
                intersectY = top;
            } else if (codeOut & 2) { // Point is to the right
                intersectY = rotatedY1 + (rotatedY2 - rotatedY1) * (right - rotatedX1) / (rotatedX2 - rotatedX1);
                intersectX = right;
            } else if (codeOut & 1) { // Point is to the left
                intersectY = rotatedY1 + (rotatedY2 - rotatedY1) * (left - rotatedX1) / (rotatedX2 - rotatedX1);
                intersectX = left;
            }
            
            // Replace the outside point with the intersection point
            if (codeOut === code1) {
                rotatedX1 = intersectX;
                rotatedY1 = intersectY;
                code1 = computeCode(rotatedX1, rotatedY1);
            } else {
                rotatedX2 = intersectX;
                rotatedY2 = intersectY;
                code2 = computeCode(rotatedX2, rotatedY2);
            }
        }
    }
}

export default AIController;
