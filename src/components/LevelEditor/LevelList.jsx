import React from 'react';

const LevelList = ({ 
  levels, 
  selectedLevelId, 
  onSelectLevel,
  onCreateNew,
  onDelete,
  onDuplicate,
  onEdit,
  onTest
}) => {
  return (
    <div className="level-list">
      <div className="level-list-header">
        <h3>Available Levels</h3>
        <button className="game-button small-button" onClick={onCreateNew}>
          Create New Level
        </button>
      </div>
      
      {levels.length === 0 ? (
        <div className="no-levels">
          No levels available. Create your first level!
        </div>
      ) : (
        <div className="levels-table-container">
          <table className="levels-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Towers</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(level => (
                <tr 
                  key={level.id} 
                  className={selectedLevelId === level.id ? 'selected-level' : ''}
                  onClick={() => onSelectLevel(level.id)}
                >
                  <td>{level.name || level.id}</td>
                  <td>{level.id}</td>
                  <td>{level.towerCount}</td>
                  <td>{level.isCustom ? 'Custom' : 'Default'}</td>
                  <td className="level-actions">
                    <button 
                      className="action-button edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(level.id);
                      }}
                      title="Edit Level"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-button test"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTest(level.id);
                      }}
                      title="Test Level"
                    >
                      🎮
                    </button>
                    <button 
                      className="action-button duplicate"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLevel(level.id);
                        onDuplicate();
                      }}
                      title="Duplicate Level"
                    >
                      📋
                    </button>
                    {level.isCustom && (
                      <button 
                        className="action-button delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(level.id);
                        }}
                        title="Delete Level"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <style>
        {`
          .level-list {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .level-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .level-list-header h3 {
            font-family: 'Cinzel Decorative', serif;
            font-size: 1.5rem;
            margin: 0;
            color: var(--light-color);
          }
          
          .small-button {
            font-size: 0.9rem;
            padding: 8px 15px;
            width: auto;
            min-width: 200px;
          }
          
          .levels-table-container {
            width: 100%;
            overflow-x: auto;
            flex: 1;
            border-radius: 5px;
            background-color: rgba(0, 0, 0, 0.2);
          }
          
          .levels-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            color: var(--light-color);
          }
          
          .levels-table th {
            background-color: var(--dark-color);
            padding: 12px 15px;
            font-family: 'Cinzel Decorative', serif;
            position: sticky;
            top: 0;
            z-index: 1;
          }
          
          .levels-table tr {
            border-bottom: 1px solid rgba(100, 100, 100, 0.3);
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .levels-table tr:hover {
            background-color: rgba(100, 80, 70, 0.2);
          }
          
          .levels-table td {
            padding: 10px 15px;
          }
          
          tr.selected-level {
            background-color: rgba(100, 80, 70, 0.4);
          }
          
          .level-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
          }
          
          .action-button {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
          }
          
          .action-button:hover {
            transform: scale(1.2);
          }
          
          .no-levels {
            text-align: center;
            padding: 40px;
            font-style: italic;
            color: var(--light-color);
          }
        `}
      </style>
    </div>
  );
};

export default LevelList;