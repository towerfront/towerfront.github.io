import { TEAMS } from './constants';

class GameState {
    constructor() {
        this.towers = []; // Array of Tower objects
        this.units = []; // Array of Unit objects
        this.hedges = []; // Array of hedge objects for blocking connections
        this.teams = {}; // Info about each team (color, AI controller if applicable)
        this.playerTeam = TEAMS.PLAYER; // Default player team color is blue
        this.connections = []; // Active unit transfers { sourceTowerId, targetTowerId }
        this.playerInput = { // State related to player dragging
            isDragging: false,
            startTowerId: null,
            currentMousePos: { x: 0, y: 0 }, // This will store GAME WORLD coordinates
            canvasMousePos: { x: 0, y: 0 }, // Raw canvas coordinates
        };
        this.gameStatus = 'playing'; // 'playing', 'won', 'lost'
        this.difficulty = 'easy'; // 'easy', 'medium', 'hard', 'expert'
        this.levelWidth = 0; // Width of the game world
        this.levelHeight = 0; // Height of the game world
        // Add more state as needed (score, time, etc.)
    }

    addTower(tower) {
        this.towers.push(tower);
    }

    addUnit(unit) {
        this.units.push(unit);
    }

    removeUnit(unitToRemove) {
        this.units = this.units.filter(unit => unit !== unitToRemove);
    }

    getTowerById(id) {
        return this.towers.find(tower => tower.id === id);
    }

    getHedgeById(id) {
        return this.hedges.find(hedge => hedge.id === id);
    }

    // Load level data including hedges if present
    loadFromData(levelData) {
        if (levelData.towers) {
            this.towers = [...levelData.towers];
        }

        if (levelData.hedges) {
            this.hedges = [...levelData.hedges];
        }

        this.connections = []; // Reset connections for new level
    }

    // Add more methods to manage state as needed
}

export default GameState;
