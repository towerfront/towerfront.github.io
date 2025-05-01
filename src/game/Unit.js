import { UNIT_SPEED } from './constants';

let nextUnitId = 0;

class Unit {
    constructor(sourceTower, targetTower, team) {
        this.id = nextUnitId++;
        this.sourceTowerId = sourceTower.id;
        this.targetTowerId = targetTower.id;
        this.team = team;
        this.x = sourceTower.x;
        this.y = sourceTower.y;

        // Calculate direction vector
        const dx = targetTower.x - sourceTower.x;
        const dy = targetTower.y - sourceTower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * UNIT_SPEED;
        this.vy = (dy / distance) * UNIT_SPEED;

        this.targetX = targetTower.x;
        this.targetY = targetTower.y;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Check if reached target (or passed it)
        // A simple distance check is usually sufficient
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const remainingDistance = Math.sqrt(dx * dx + dy * dy);

        // Check if the unit has moved past the target in this frame
        const distanceMoved = UNIT_SPEED * deltaTime;
        if (remainingDistance <= distanceMoved) {
            return true; // Reached target
        }

        return false; // Still moving
    }
}

export default Unit;
