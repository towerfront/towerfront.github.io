import Tower from './Tower';
import { TOWER_TYPES, TEAMS, DEFAULT_GAME_WIDTH, DEFAULT_GAME_HEIGHT } from './constants';

// Default levels for the game
const defaultLevels = {
    level1: {
        name: "Training Grounds",
        description: "A simple map for beginners to learn the basics.",
        difficulty: "easy",
        width: DEFAULT_GAME_WIDTH, // Add width
        height: DEFAULT_GAME_HEIGHT, // Add height
        towers: [
            { x: 100, y: 100, team: TEAMS.PLAYER, initialUnits: 15 },
            { x: 700, y: 500, team: TEAMS.ENEMY1, initialUnits: 10 },
            { x: 400, y: 300, team: TEAMS.NEUTRAL, initialUnits: 5, type: TOWER_TYPES.DEFEND },
        ],
        order: 1,
        isUnlocked: true
    },
    level2: {
        name: "The Crossroads",
        description: "Multiple paths lead to victory - which will you choose?",
        difficulty: "medium",
        width: DEFAULT_GAME_WIDTH, // Add width
        height: DEFAULT_GAME_HEIGHT, // Add height
        towers: [
            { x: 150, y: 150, team: TEAMS.PLAYER, initialUnits: 20, type: TOWER_TYPES.ATTACK },
            { x: 650, y: 150, team: TEAMS.ENEMY1, initialUnits: 15 },
            { x: 150, y: 450, team: TEAMS.ENEMY1, initialUnits: 15 },
            { x: 650, y: 450, team: TEAMS.NEUTRAL, initialUnits: 10 },
            { x: 400, y: 300, team: TEAMS.NEUTRAL, initialUnits: 5 },
        ],
        order: 2,
        isUnlocked: true
    }
};

class LevelManager {
    static loadLevelData(levelId) {
        // First try to load from localStorage (custom levels)
        const storedLevels = this.getCustomLevels();
        let levelData = storedLevels[levelId];
        
        // If not found in custom levels, try default levels
        if (!levelData && defaultLevels[levelId]) {
            levelData = defaultLevels[levelId];
        }
        
        if (!levelData) {
            console.error(`Level data not found for id: ${levelId}`);
            return null;
        }

        // Create Tower instances from the data
        const towers = levelData.towers.map(data =>
            new Tower(data.x, data.y, data.team, data.initialUnits, data.type)
        );

        // Create the result object with basic properties
        const result = {
            id: levelId,
            name: levelData.name || levelId,
            description: levelData.description || "",
            difficulty: levelData.difficulty || "medium",
            width: levelData.width || DEFAULT_GAME_WIDTH, // Use default if missing
            height: levelData.height || DEFAULT_GAME_HEIGHT, // Use default if missing
            towers: towers,
            order: levelData.order || 0,
            isUnlocked: levelData.isUnlocked !== false
        };
        
        // Include hedge data if present
        if (levelData.hedges && Array.isArray(levelData.hedges)) {
            result.hedges = levelData.hedges;
            console.log(`Loaded ${levelData.hedges.length} hedges for level ${levelId}`);
        }
        
        return result;
    }

    static getCustomLevels() {
        try {
            const storedLevels = localStorage.getItem('customLevels');
            return storedLevels ? JSON.parse(storedLevels) : {};
        } catch (error) {
            console.error('Error loading custom levels from localStorage:', error);
            return {};
        }
    }

    static getAllLevelIds() {
        // Combine default level IDs and custom level IDs
        const customLevels = this.getCustomLevels();
        return [...Object.keys(defaultLevels), ...Object.keys(customLevels).filter(id => !defaultLevels[id])];
    }

    static getAllLevels() {
        const customLevels = this.getCustomLevels();
        const defaultLevelIds = Object.keys(defaultLevels);
        const customLevelIds = Object.keys(customLevels);
        
        // Generate combined level information (but not full Tower instances)
        const allLevels = [];
        
        // Add default levels first
        defaultLevelIds.forEach(id => {
            allLevels.push({
                id,
                name: defaultLevels[id].name || `Level ${id.replace('level', '')}`,
                description: defaultLevels[id].description || "",
                difficulty: defaultLevels[id].difficulty || "medium",
                width: defaultLevels[id].width || DEFAULT_GAME_WIDTH,
                height: defaultLevels[id].height || DEFAULT_GAME_HEIGHT,
                isCustom: false,
                towerCount: defaultLevels[id].towers.length,
                order: defaultLevels[id].order || 0,
                isUnlocked: defaultLevels[id].isUnlocked !== false
            });
        });
        
        // Add custom levels that don't override default levels
        customLevelIds.forEach(id => {
            if (!defaultLevels[id]) {
                allLevels.push({
                    id,
                    name: customLevels[id].name || `Custom ${id}`,
                    description: customLevels[id].description || "",
                    difficulty: customLevels[id].difficulty || "medium",
                    width: customLevels[id].width || DEFAULT_GAME_WIDTH,
                    height: customLevels[id].height || DEFAULT_GAME_HEIGHT,
                    isCustom: true,
                    towerCount: customLevels[id].towers.length,
                    order: customLevels[id].order || 0,
                    isUnlocked: customLevels[id].isUnlocked !== false
                });
            }
        });
        
        // Sort levels by order
        allLevels.sort((a, b) => a.order - b.order);
        
        return allLevels;
    }

    static saveLevelData(levelId, levelData) {
        try {
            // Ensure the level data has the required properties
            if (!levelData.name) {
                levelData.name = `Level ${levelId.replace('level', '')}`;
            }
            
            if (!levelData.towers || !Array.isArray(levelData.towers) || levelData.towers.length === 0) {
                console.error('Cannot save level without any towers');
                return false;
            }
            
            // Get current custom levels
            const customLevels = this.getCustomLevels();
            
            // Create a clean version to save (remove any Tower instances and game-specific properties)
            const cleanLevelData = {
                name: levelData.name,
                description: levelData.description || "",
                difficulty: levelData.difficulty || "medium",
                width: levelData.width || DEFAULT_GAME_WIDTH,
                height: levelData.height || DEFAULT_GAME_HEIGHT,
                towers: levelData.towers.map(tower => ({
                    x: tower.x,
                    y: tower.y,
                    team: tower.team,
                    initialUnits: tower.initialUnits,
                    type: tower.type || TOWER_TYPES.NORMAL
                })),
                order: levelData.order || 0,
                isUnlocked: levelData.isUnlocked !== false
            };
            
            // Add hedge data if present
            if (levelData.hedges && Array.isArray(levelData.hedges)) {
                cleanLevelData.hedges = levelData.hedges.map(hedge => ({
                    id: hedge.id,
                    x: hedge.x,
                    y: hedge.y,
                    width: hedge.width || 30, // Default width if not specified
                    height: hedge.height || 120, // Default height if not specified
                    rotation: hedge.rotation || 0 // Default rotation if not specified
                }));
                console.log(`Saving ${cleanLevelData.hedges.length} hedges for level ${levelId}`);
            }
            
            // Update with new level data
            customLevels[levelId] = cleanLevelData;
            
            // Save back to localStorage
            localStorage.setItem('customLevels', JSON.stringify(customLevels));
            
            return true;
        } catch (error) {
            console.error('Error saving level data:', error);
            return false;
        }
    }

    static deleteLevel(levelId) {
        try {
            // Can't delete default levels
            if (defaultLevels[levelId]) {
                console.warn(`Cannot delete default level: ${levelId}`);
                return false;
            }
            
            // Get current custom levels
            const customLevels = this.getCustomLevels();
            
            // Remove the level
            if (customLevels[levelId]) {
                delete customLevels[levelId];
                
                // Save back to localStorage
                localStorage.setItem('customLevels', JSON.stringify(customLevels));
                return true;
            } else {
                console.warn(`Level not found: ${levelId}`);
                return false;
            }
        } catch (error) {
            console.error('Error deleting level:', error);
            return false;
        }
    }

    static generateNewLevelId() {
        const allLevels = this.getAllLevels();
        let highestNum = 0;
        
        // Find the highest level number
        allLevels.forEach(level => {
            const match = level.id.match(/level(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > highestNum) highestNum = num;
            }
        });
        
        // Generate new ID
        return `level${highestNum + 1}`;
    }

    static getEmptyLevelTemplate() {
        return {
            name: "New Level",
            description: "A custom level created with the level editor",
            difficulty: "medium",
            width: DEFAULT_GAME_WIDTH,
            height: DEFAULT_GAME_HEIGHT,
            towers: [
                { x: 100, y: 100, team: TEAMS.PLAYER, initialUnits: 15 },
                { x: 400, y: 400, team: TEAMS.ENEMY1, initialUnits: 10 },
            ],
            order: 999, // Default to end of list
            isUnlocked: true
        };
    }
    
    static importLevel(levelData) {
        try {
            // Validate the imported data
            if (!levelData || !levelData.towers || !Array.isArray(levelData.towers) || levelData.towers.length === 0) {
                console.error('Invalid level data format');
                return null;
            }
            
            // Generate a new ID for the imported level
            const newLevelId = this.generateNewLevelId();
            
            // Save the imported level, ensuring dimensions are included
            const success = this.saveLevelData(newLevelId, {
                ...levelData,
                id: newLevelId,
                name: levelData.name || "Imported Level",
                width: levelData.width || DEFAULT_GAME_WIDTH,
                height: levelData.height || DEFAULT_GAME_HEIGHT
            });
            
            return success ? newLevelId : null;
        } catch (error) {
            console.error('Error importing level:', error);
            return null;
        }
    }

    static exportLevel(levelId) {
        try {
            // Get the level data
            const customLevels = this.getCustomLevels();
            const defaultLevelsCopy = JSON.parse(JSON.stringify(defaultLevels));
            
            let levelData = customLevels[levelId] || defaultLevelsCopy[levelId];
            
            if (!levelData) {
                console.error(`Level not found: ${levelId}`);
                return null;
            }
            
            // Create a JSON string for export, ensuring dimensions are included
            const exportData = JSON.stringify({
                ...levelData,
                id: levelId,
                width: levelData.width || DEFAULT_GAME_WIDTH,
                height: levelData.height || DEFAULT_GAME_HEIGHT
            }, null, 2);
            
            return exportData;
        } catch (error) {
            console.error('Error exporting level:', error);
            return null;
        }
    }
}

export default LevelManager;
