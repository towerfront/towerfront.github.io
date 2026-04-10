import { TOWER_TYPES, CONNECTION_LIMITS, MAX_UNITS_PER_TOWER, UNIT_GENERATION_RATE } from './constants';

let nextTowerId = 0;

class Tower {
    constructor(x, y, team = 'neutral', initialUnits = 10, type = TOWER_TYPES.NORMAL) {
        this.id = nextTowerId++;
        this.x = x;
        this.y = y;
        this.team = team; // 'neutral', 'blue', 'red', etc.
        this.unitCount = initialUnits;
        this.type = type;
        this.connections = []; // Array of target tower IDs this tower is sending units to
        this.generationTimer = 0; // Accumulator for unit generation
        this.selfBuildTimer = 0; // Accumulator for self-building
        this.isMaxed = false; // Flag to track if tower is at max capacity
        this.inboundConnectionsCount = 0; // Track number of towers sending units to this tower
    }

    getMaxConnections() {
        for (const limit of CONNECTION_LIMITS) {
            if (this.unitCount <= limit.maxUnits) {
                return limit.connections;
            }
        }
        return CONNECTION_LIMITS[CONNECTION_LIMITS.length - 1].connections; // Should not happen with Infinity
    }

    canAddConnection() {
        return this.connections.length < this.getMaxConnections();
    }

    addConnection(targetTowerId) {
        if (this.canAddConnection() && !this.connections.includes(targetTowerId)) {
            this.connections.push(targetTowerId);
            return true;
        }
        return false;
    }

    removeConnection(targetTowerId) {
        const index = this.connections.indexOf(targetTowerId);
        if (index > -1) {
            this.connections.splice(index, 1);
            return true;
        }
        return false;
    }

    // Update inbound connections count
    setInboundConnectionsCount(count) {
        this.inboundConnectionsCount = count;
    }

    // Check if the tower is isolated (no connections in either direction)
    isIsolated() {
        return this.connections.length === 0 && this.inboundConnectionsCount === 0;
    }

    // Get self-building rate based on tower's unit count (units per 5 seconds)
    getSelfBuildRate() {
        if (this.unitCount >= 30) return 3; // 30-64 units: 3 per 5 seconds
        if (this.unitCount >= 10) return 2; // 10-29 units: 2 per 5 seconds
        return 1; // 1-9 units: 1 per 5 seconds
    }

    update(deltaTime) {
        // Only process for non-neutral towers that aren't maxed out
        if (this.team !== 'neutral' && this.unitCount < MAX_UNITS_PER_TOWER) {
            // Determine whether to use normal generation or self-building based on isolation
            if (this.isIsolated()) {
                // SELF-BUILDING MODE ONLY: For completely isolated towers
                this.selfBuildTimer += deltaTime;
                const selfBuildInterval = 5; // 5 seconds interval
                
                if (this.selfBuildTimer >= selfBuildInterval) {
                    const selfBuildRate = this.getSelfBuildRate();
                    this.unitCount = Math.min(this.unitCount + selfBuildRate, MAX_UNITS_PER_TOWER);
                    this.selfBuildTimer %= selfBuildInterval;
                    
                    // Check if tower just reached max capacity
                    if (this.unitCount >= MAX_UNITS_PER_TOWER) {
                        this.isMaxed = true;
                    }
                }
                
                // Isolated towers don't use regular generation
                this.generationTimer = 0;
            } else {
                // OUTBOUND/CONNECTED MODE: Towers with connections don't self-build at all
                this.selfBuildTimer = 0;
                
                // FIX: IMPORTANT - Only check the tower's own outbound connections,
                // NOT the inbound connections when determining generation behavior.
                // This ensures that having an inbound connection doesn't affect a tower's ability
                // to create its own outbound connections
                if (this.connections.length === 0 && this.inboundConnectionsCount > 0) {
                    // Only towers with inbound but no outbound connections get standard generation
                    this.generationTimer += deltaTime;
                    const generationRate = UNIT_GENERATION_RATE;
                    
                    if (this.generationTimer >= 1 / generationRate) {
                        const unitsToGenerate = Math.floor(this.generationTimer * generationRate);
                        this.unitCount = Math.min(this.unitCount + unitsToGenerate, MAX_UNITS_PER_TOWER);
                        this.generationTimer %= (1 / generationRate);
                        
                        // Check if tower just reached max capacity
                        if (this.unitCount >= MAX_UNITS_PER_TOWER) {
                            this.isMaxed = true;
                        }
                    }
                } else {
                    // Towers with outbound connections don't generate units automatically
                    this.generationTimer = 0;
                }
            }
        }

        // TODO: Unit sending logic will be handled by GameEngine based on connections
    }

    // Method to handle incoming units (called by GameEngine)
    receiveUnits(attackingUnits, attackerTeam) {
        let defenseMultiplier = 1;
        if (this.type === TOWER_TYPES.DEFEND && this.team !== attackerTeam) { // Defend only applies vs enemies
            defenseMultiplier = 2;
        }

        const effectiveAttackers = Math.ceil(attackingUnits / defenseMultiplier);
        const previousTeam = this.team;
        let excessUnits = 0; // Initialize excess units

        if (this.team === attackerTeam) {
            // Reinforcements
            // FIX: Change condition to only return excess if strictly >= MAX
            if (this.unitCount >= MAX_UNITS_PER_TOWER) { 
                // Tower is truly maxed, all incoming units are excess
                excessUnits = attackingUnits; 
                // No change to unitCount or isMaxed needed here
            } else {
                // Tower is not maxed, calculate how many units can be absorbed
                const availableCapacity = MAX_UNITS_PER_TOWER - this.unitCount;
                const unitsToAbsorb = Math.min(attackingUnits, availableCapacity);
                excessUnits = attackingUnits - unitsToAbsorb;
                
                // Update tower's unit count
                this.unitCount += unitsToAbsorb;
            }
        } else {
            // Attack
            this.unitCount -= effectiveAttackers;
            
            if (this.unitCount < 0) {
                // Tower captured!
                this.team = attackerTeam;
                this.unitCount = Math.abs(this.unitCount);
                // Reset connections when captured
                this.connections = [];
                // Optional: Reset type on capture
                // this.type = TOWER_TYPES.NORMAL; 
            }
            // No excess units generated during an attack
            excessUnits = 0;
        }
        
        // Update isMaxed flag after any potential unit count change
        this.isMaxed = this.unitCount >= MAX_UNITS_PER_TOWER;
        // Ensure unit count doesn't exceed max due to capture overshoot (though unlikely with integer math)
        if (this.unitCount > MAX_UNITS_PER_TOWER) {
            this.unitCount = MAX_UNITS_PER_TOWER;
        }

        // Return information about any team change and calculated excess units
        return {
            teamChanged: previousTeam !== this.team,
            previousTeam,
            newTeam: this.team,
            excessUnits: excessUnits
        };
    }
    
    // Helper method to get display value for tower - shows "MAX" if at 65 units
    getDisplayValue() {
        return this.isMaxed ? "MAX" : this.unitCount.toString();
    }
}

export default Tower;
