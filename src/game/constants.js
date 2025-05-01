// Game settings
export const UNIT_GENERATION_RATE = 3.0; // Units per second per tower (base rate, e.g., 1 unit every 5 seconds)
export const MAX_UNITS_PER_TOWER = 65; // Max units is now 65, after which tower shows "MAX"
export const UNIT_SPEED = 100; // Pixels per second
export const TOWER_RADIUS = 30;
export const UNIT_RADIUS = 5;

// Hedge obstruction properties
export const HEDGE_WIDTH = 30; // Width of hedge obstruction
export const HEDGE_HEIGHT = 120; // Height of standard hedge obstruction
export const HEDGE_COLOR = '#2D5C23'; // Dark green color for hedges
export const HEDGE_BORDER_COLOR = '#1A3D0C'; // Darker border for hedges

// Teams
export const TEAMS = {
    PLAYER: 'blue',
    ENEMY1: 'red',
    ENEMY2: 'yellow',
    ENEMY3: 'green',
    NEUTRAL: 'neutral'
};

// Team Colors (ensure player is blue)
export const TEAM_COLORS = {
    neutral: '#808080', // Gray
    blue: '#4285F4',    // Player
    red: '#EA4335',
    yellow: '#FFDC00',
    green: '#34A853',
    orange: '#FBBC05',
    purple: '#8334A8',
    cyan: '#40DFFF',
    // Add more as needed
};

// Tower Types
export const TOWER_TYPES = {
    NORMAL: 'normal',
    ATTACK: 'attack',  // Deals double damage to enemies
    DEFEND: 'defend',  // Takes half damage from enemies
    HEALING: 'healing' // Heals friendly towers at double rate
};

// Connection limits based on unit count
export const CONNECTION_LIMITS = [
    { maxUnits: 0, connections: 0 },    // Dead tower
    { maxUnits: 9, connections: 1 },    // 1-9 units: 1 connection
    { maxUnits: 29, connections: 2 },   // 10-29 units: 2 connections
    { maxUnits: Infinity, connections: 3 } // 30+ units: 3 connections
];

// AI Settings
export const AI_DECISION_INTERVAL = 1.0; // Seconds between AI decisions (can be adjusted by difficulty)

// Attack rate configuration
export const ATTACK_RATE = {
    BASE_RATE: 0.5,            // Base rate for towers with few units (0.5 units/sec)
    SCALING_FACTOR: 0.07,      // Increase per unit (0.07 rate increase per unit)
    MAX_RATE: 5.0,             // Maximum send rate (5 units/sec)
    UNITS_AT_MAX_RATE: 65      // Unit count at which max rate is reached
};

// Default game world dimensions
export const DEFAULT_GAME_WIDTH = 1000;
export const DEFAULT_GAME_HEIGHT = 750;
