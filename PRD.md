# TowerFront Game Tower Defense

Here's a detailed breakdown of the game mechanics, architecture, and implementation plan:

## 1. Architecture & Technical Approach

*   I will use **React** for the overall application structure, UI elements (menus, buttons, HUD overlays), and managing application state (like current screen, selected level, settings).
*   I will use the **HTML5 Canvas API** for rendering the core game elements (towers, units, connections). Canvas generally offers better performance for scenarios with many frequently moving objects (units) compared to SVG.
*   A central `<GameCanvas>` React component will manage the `<canvas>` element.
*   The core game loop (`requestAnimationFrame`) and state management (tower data, unit positions, AI decisions) will be handled primarily in plain JavaScript modules/classes outside of the React render cycle to ensure smooth performance. React components will subscribe to relevant parts of this game state to display information (like unit counts) or will dispatch actions to the game logic (like initiating a unit transfer when the player drags).
*   The game will support both mouse and touch interactions, making it playable on desktop and mobile devices.

## 2. Level Generation vs. Level Editor

*   I recommend starting with **static, hand-designed levels combined with the Level Editor**. This provides a predictable foundation for development and testing. The Level Editor, storing JSON data in `localStorage`, is a feasible initial goal. Procedural generation of *balanced and winnable* levels is significantly more complex and can be explored as a future enhancement.

## 3. Core Game Mechanics

### 3.1 Tower Mechanics

*   **Tower Properties:**
    * `id`: Unique identifier for the tower
    * `position` (`x`, `y`): Location on the canvas
    * `team`: Owner of the tower (player, AI teams, neutral)
    * `unitCount`: Current number of units in the tower (max 65)
    * `type`: Tower type (normal, attack, defense, healing)
    * `connections`: Array of IDs of towers this tower is sending units to
    * `generationRate`: Rate at which the tower generates units
    * `radius`: Visual size of the tower
    * `isMaxed`: Boolean flag indicating if tower has reached max capacity (65 units)
    * `inboundConnectionsCount`: Number of towers sending units to this tower

*   **Tower Types:**
    * **Normal**: Standard tower with balanced attributes
    * **Attack**: Deals double damage when attacking enemy towers
    * **Defense**: More resistant to enemy attacks (receives half damage)
    * **Healing**: Provides double reinforcement when sending units to friendly towers

*   **Tower Unit Generation Logic:**
    * There are three distinct tower states affecting unit generation:
      * **Isolated Towers**: Towers with no inbound and no outbound connections
      * **Terminal Towers**: Towers with inbound connections but no outbound connections
      * **Transit Towers**: Towers with outbound connections (with or without inbound connections)
    * Towers with outbound connections cannot generate units automatically - their energy is used for sending units
    * Tower's maximum number of connections scales with its unit count:
      * 1-9 units: 1 outbound connection available
      * 10-29 units: 2 outbound connections available
      * 30-64 units: 3 outbound connections available
      * At 65 units (MAX): 3 outbound connections available
    * When a tower reaches 65 units, it displays "MAX" instead of the unit count

*   **Tower Self-Building Mechanic:**
    * Only completely isolated towers (those with no inbound AND no outbound connections) can self-build units
    * Self-building rate depends on the tower's current unit count:
      * 1-9 units: 1 unit every 5 seconds
      * 10-29 units: 2 units every 5 seconds
      * 30-64 units: 3 units every 5 seconds
    * Self-building stops immediately when any connection is established (either inbound or outbound)
    * Important: This is the only way towers can generate units without receiving them from other towers

*   **Inbound-Only Building Mechanic:**
    * Towers that receive units from other towers but have no outbound connections will generate units automatically at the standard rate
    * These towers convert inbound units into a steady auto-generation capability
    * This creates a strategic option to use towers as "amplifiers" in a network

*   **Tower Reinforcement Logic:**
    * When a tower with less than 65 units receives reinforcements, those units build up the tower
    * When a tower at 65 units (MAX) receives reinforcements, those units are automatically redistributed to the tower's outbound connections
    * This "pass-through" behavior for maxed towers creates strategic advantages for building up towers to maximum capacity

### 3.2 Unit & Connection Mechanics

*   **Unit Animation:** 
    * Units are simple shapes (e.g., circles) drawn on the canvas with their team color
    * When sent, a `Unit` object is created with source/target coordinates, team color, and speed
    * The game loop updates each unit's position linearly towards its target each frame
    * Upon arrival, the unit object is removed, and its effect is applied to the target tower
    * **Important**: Sending units (attacking or reinforcing) does *not* decrease the unit count of the source tower

*   **Connection Rules:**
    * Each tower can have multiple connections to different towers based on its unit count
    * There can only be ONE connection in any specific direction between any two towers
    * If tower A is already sending units to tower B, a player cannot create another connection from A to B
    * Direction matters: A→B and B→A are distinct connections and both can exist simultaneously
    * **Replacing Connections**: For friendly towers, if tower A is sending to tower B, creating a connection from B to A will automatically remove the A→B connection
    * **Collision Detection**: Connections cannot pass through other towers. If a tower is in the way, the connection must target the intersecting tower instead

*   **Connection Management:**
    * **Creating Connections**: Drag from a source tower to a target tower to create a connection
    * **Breaking Connections**: There are two ways to break an existing connection:
      * Drag from source to target again to toggle the connection off
      * Drag across any existing connection line from any tower to break that connection
    * This interface works with both mouse and touch inputs

*   **Unit Sending Mechanics:**
    * Each tower has a "sending capacity" that scales linearly with its unit count:
      * A tower with 1 unit has a sending capacity of 1 unit per second
      * A tower with 65 units (maximum) has a sending capacity of 3 units per second
      * All unit counts in between scale proportionally following the formula:
        * `sending_capacity = 1 + (units - 1) / 32`
    * This sending capacity is divided evenly among all active outbound connections:
      * Example: A maxed tower (65 units) with one outbound connection sends 3 units/second through that connection
      * Example: A maxed tower with two outbound connections sends 1.5 units/second through each connection
      * Example: A maxed tower with three outbound connections sends 1 unit/second through each connection
    * Similarly, a tower with 33 units (sending capacity ~2 units/sec) with two outbound connections would send 1 unit/second through each connection
    * Units are sent one at a time, with the frequency determined by the calculated rate for each connection
    * Importantly, sending units does not decrease the tower's unit count - the sending capacity represents energy projection, not unit depletion

### 3.3 Battle & Capture Mechanics

*   **Tower Interactions:**
    * When a unit reaches a **friendly tower**, it increases that tower's unit count (reinforcement)
    * When a unit reaches an **enemy tower**, it decreases that tower's unit count (attack)
    * When a unit reaches a **neutral tower**, it adds to the attack force against the neutral units
    * Tower type modifies these effects (attack towers do double damage, etc.)

*   **Tower Capture:**
    * When a tower's unit count reaches 0 from enemy attacks, it changes ownership to the attacking team
    * When a tower is captured, all its existing connections are removed
    * The tower starts with a number of units equal to those that were in the capturing force

## 4. AI Implementation

*   **AI Controller:**
    * Each non-player team has its own AI controller
    * The AI makes decisions periodically (every few seconds) based on difficulty level
    * AI can create and manage connections following the same rules as the player

*   **AI Strategies:**
    * **Balanced Strategy**: Prioritize capturing neutral towers first, then attack weak enemies
    * **Aggressive Strategy**: Prioritize attacking player towers directly
    * **Difficulty Levels**: Easy, Medium, Hard, and Expert, with increasing decision frequency and strategic aggressiveness

*   **Target Selection:**
    * AI evaluates potential targets based on unit count, distance, and strategic value
    * Higher difficulty AIs coordinate attacks better and target the player more aggressively
    * AI respects connection rules and collision detection just like the player

## 5. Victory & Game Flow

*   **Win Condition:** 
    * Technical victory is achieved when all enemy towers (non-neutral, non-player) have been captured by the player
    * When this condition is met, the game enters a 'victorious' state, not immediately ending gameplay

*   **"Declare Victory" Mechanism:**
    * When the technical win condition is met, the game shows a victory celebration but gameplay continues
    * A "Declare Victory" button appears, allowing the player to continue playing if desired
    * Players can keep capturing neutral towers and maximizing their territory for satisfaction
    * Only when the player clicks "Declare Victory" does the game officially end and return to menu

*   **Defeat Condition:**
    * The player loses if they lose all their towers

## 6. User Interface Elements

*   **Game UI:**
    * Display of player's total unit count across all towers
    * Current level information
    * Pause button
    * "Declare Victory" button (appears when victory condition is met)

*   **Tower Visualization:**
    * Different shapes for different tower types (round, square, hexagon)
    * Team colors clearly distinguishing ownership
    * Visual indicators showing unit count and active connections
    * Tower rendering includes decorative elements like medieval-style keyways

*   **Connection Visualization:**
    * Lines showing active connections between towers
    * Visual indication of unit flow direction
    * Clear visual feedback during player drag actions
    * Properly indicates when a connection is established or broken

*   **Input Support:**
    * Full support for both mouse interactions on desktop
    * Touch support for mobile devices and tablets
    * Consistent user experience across platforms

## 7. Code Structure

```
src/
├── App.jsx             # Main component, routing/view management
├── main.jsx            # Application entry point
├── components/         # Reusable React UI components
│   ├── GameUI.jsx        # HUD, victory button, etc.
│   ├── MainMenu.jsx
│   ├── LevelSelector.jsx
│   ├── VictoryCelebration.jsx # Victory animation with "Declare Victory" button
│   ├── DefeatCelebration.jsx  # Defeat animation
│   ├── PauseMenu.jsx
│   ├── GameCanvas.jsx    # Canvas wrapper component
│   └── LevelEditor/
│       └── LevelEditor.jsx # Component for the editor UI
├── game/               # Core game logic (non-React)
│   ├── GameEngine.js     # Manages game loop, state updates, interactions
│   ├── GameState.js      # Holds current towers, units, teams, etc.
│   ├── Tower.js          # Class/factory for tower logic
│   ├── Unit.js           # Class/factory for unit logic
│   ├── AIController.js   # AI decision-making logic
│   ├── Renderer.js       # Canvas drawing functions
│   ├── LevelManager.js   # Handles loading/saving levels (localStorage)
│   └── constants.js      # Game settings (rates, speeds, colors, etc.)
├── hooks/              # Custom React Hooks
│   └── useGameEngine.js  # Hook to interface React UI with GameEngine
├── contexts/           # React context for global UI state
│   └── SettingsContext.jsx
└── assets/             # Fonts, images (if any)
```

## 8. Technical Implementation Details

### 8.1 Tower Unit Generation States

Tower unit generation falls into three distinct categories:
1. **Isolated Towers** (no connections at all):
   - Can only generate units through self-building mechanism (slow)
   - Self-building rates: 1, 2, or 3 units per 5 seconds based on tower size
   
2. **Terminal Towers** (inbound connections only):
   - Generate units at the standard generation rate
   - Receive additional units from connected towers
   
3. **Transit Towers** (have outbound connections):
   - Cannot generate units automatically
   - All energy is directed to sending units to other towers
   - Can only gain units through inbound connections from other towers

Understanding these distinct tower states is crucial for strategic gameplay.

### 8.2 Tower Connection Validation

The game must enforce specific connection rules:
1. One connection per direction between nodes (A→B and B→A are distinct)
2. For friendly towers, creating B→A when A→B exists will replace the connection
3. Connection breaking can be done by re-selecting the same connection or dragging across it
4. Enforce collision detection for connections passing through other towers
5. Apply the same validation logic to AI-controlled towers for fair gameplay

### 8.3 Tower Sending Capacity Calculation

The sending capacity of a tower follows a precise linear formula:
```
sending_capacity = 1 + (tower_units - 1) / 32
```

This formula ensures:
- Towers with 1 unit send at exactly 1 unit/second
- Towers with 65 units send at exactly 3 units/second
- All values in between scale proportionally

This capacity is then equally divided across all outbound connections, creating strategic decisions about connection quantity versus sending rate per connection.

### 8.4 Victory State Management

1. Create distinct game states: 'playing', 'victorious', 'won', 'lost', 'paused'
2. The 'victorious' state allows gameplay to continue but displays celebration animation
3. Only transition to 'won' state when player explicitly declares victory
4. This approach ensures players can fully enjoy conquering the map after technical victory

## 9. Future Enhancements

* Procedural level generation with balance testing
* Additional tower types with unique abilities
* Power-ups or special abilities that can be activated
* Multiplayer support
* Achievement system
* Tower upgrade mechanics
* Advanced mobile support with gesture controls