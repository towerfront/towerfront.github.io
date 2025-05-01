import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LevelManager from '../../game/LevelManager';
import { TEAMS, TOWER_TYPES, TEAM_COLORS } from '../../game/constants';
import Logo from '../Logo';
import LevelList from './LevelList';
import LevelEditCanvas from './LevelEditCanvas';
import LevelProperties from './LevelProperties';

const LevelEditor = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'edit', 'properties'
  const [isDirty, setIsDirty] = useState(false);
  const [notification, setNotification] = useState(null);
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load levels on mount
  useEffect(() => {
    loadLevels();
  }, []);

  // Load selected level when it changes
  useEffect(() => {
    if (selectedLevelId) {
      loadLevelDetails(selectedLevelId);
    } else {
      setCurrentLevel(null);
    }
  }, [selectedLevelId]);

  const loadLevels = () => {
    const allLevels = LevelManager.getAllLevels();
    setLevels(allLevels);
    
    // If no level is selected and we have levels, select the first one
    if (!selectedLevelId && allLevels.length > 0) {
      setSelectedLevelId(allLevels[0].id);
    }
  };

  const loadLevelDetails = (levelId) => {
    if (!levelId) return;
    
    // For editing purposes, we want the raw level data, not the Tower instances
    const customLevels = LevelManager.getCustomLevels();
    
    let levelData;
    let isDefault = false;
    
    if (customLevels[levelId]) {
      levelData = { ...customLevels[levelId], id: levelId };
    } else {
      // This is a default level - get data directly from LevelManager
      try {
        const defaultLevel = LevelManager.loadLevelData(levelId);
        
        if (defaultLevel) {
          // Extract tower data from Tower instances, handle different possible structures
          const towers = defaultLevel.towers.map(tower => {
            // Check if tower has position.x or just x property
            const x = tower.position ? tower.position.x : tower.x;
            const y = tower.position ? tower.position.y : tower.y;
            
            // Check different property names that might exist
            const initialUnits = tower.unitCount || tower.initialUnits || 10;
            
            return {
              x,
              y,
              team: tower.team,
              initialUnits,
              type: tower.type || TOWER_TYPES.NORMAL
            };
          });
          
          levelData = {
            id: levelId,
            name: defaultLevel.name,
            description: defaultLevel.description || "",
            difficulty: defaultLevel.difficulty || "medium",
            towers: towers,
            order: defaultLevel.order || 0,
            isUnlocked: defaultLevel.isUnlocked !== false
          };
          isDefault = true;
        }
      } catch (error) {
        console.error(`Error loading level ${levelId}:`, error);
        showNotification(`Error loading level: ${error.message}`, 'error');
        return;
      }
    }
    
    if (levelData) {
      setCurrentLevel({ ...levelData, isDefault });
      setIsDirty(false);
    } else {
      showNotification(`Couldn't load level: ${levelId}`, 'error');
    }
  };

  const createNewLevel = () => {
    // Check if there are unsaved changes
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Continue without saving?')) {
        return;
      }
    }
    
    const newLevelId = LevelManager.generateNewLevelId();
    const template = LevelManager.getEmptyLevelTemplate();
    
    setCurrentLevel({
      ...template,
      id: newLevelId,
      isDefault: false
    });
    
    setSelectedLevelId(newLevelId);
    setActiveTab('edit');
    setIsDirty(true);
    
    showNotification('New level created!', 'success');
  };

  const saveLevel = () => {
    if (!currentLevel) return;
    
    // If saving a default level, create a copy
    const levelToSave = { ...currentLevel };
    delete levelToSave.isDefault; // Remove the isDefault flag before saving
    
    const success = LevelManager.saveLevelData(currentLevel.id, levelToSave);
    
    if (success) {
      setIsDirty(false);
      showNotification('Level saved successfully!', 'success');
      loadLevels(); // Refresh the levels list
    } else {
      showNotification('Error saving level', 'error');
    }
  };

  const deleteLevel = (levelId) => {
    if (window.confirm('Are you sure you want to delete this level? This cannot be undone.')) {
      const success = LevelManager.deleteLevel(levelId);
      
      if (success) {
        showNotification('Level deleted successfully', 'success');
        
        // If we deleted the current level, select a different one
        if (selectedLevelId === levelId) {
          setSelectedLevelId(null);
          setCurrentLevel(null);
        }
        
        loadLevels(); // Refresh the levels list
      } else {
        showNotification('Could not delete level. Default levels cannot be deleted.', 'error');
      }
    }
  };

  const testLevel = () => {
    if (!currentLevel) return;
    
    // If we have unsaved changes, we need to save first
    if (isDirty) {
      if (window.confirm('Save changes before testing?')) {
        saveLevel();
      } else {
        return; // User cancelled
      }
    }
    
    // Navigate to the game with this level
    navigate(`/play/${currentLevel.id}`);
  };

  const updateLevelName = (name) => {
    if (!currentLevel) return;
    
    setCurrentLevel(prev => ({ ...prev, name }));
    setIsDirty(true);
  };

  const updateLevelData = (data) => {
    if (!currentLevel) return;
    
    // Check if data contains tower and/or hedge information
    const updatedLevel = { ...currentLevel };
    
    if (data.towers) {
      updatedLevel.towers = data.towers;
    }
    
    if (data.hedges) {
      updatedLevel.hedges = data.hedges;
    }
    
    setCurrentLevel(updatedLevel);
    setIsDirty(true);
    console.log("Level data updated:", updatedLevel); // For debugging
  };

  // Keep the old function for backward compatibility but have it call the new one
  const updateLevelTowers = (towers) => {
    updateLevelData({ towers });
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    
    // Clear notification after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const duplicateLevel = () => {
    if (!currentLevel) return;
    
    const newLevelId = LevelManager.generateNewLevelId();
    const duplicatedLevel = {
      ...currentLevel,
      id: newLevelId,
      name: `${currentLevel.name} (Copy)`,
      isDefault: false
    };
    
    setCurrentLevel(duplicatedLevel);
    setSelectedLevelId(newLevelId);
    setIsDirty(true);
    
    showNotification('Level duplicated! Don\'t forget to save.', 'success');
  };

  const exportLevel = () => {
    if (!currentLevel) return;
    
    const exportData = LevelManager.exportLevel(currentLevel.id);
    
    if (exportData) {
      setExportText(exportData);
      setShowExportModal(true);
    } else {
      showNotification('Error exporting level', 'error');
    }
  };

  const importLevel = () => {
    try {
      const levelData = JSON.parse(importText);
      
      if (!levelData || !levelData.towers || !Array.isArray(levelData.towers)) {
        showNotification('Invalid level data format', 'error');
        return;
      }
      
      const newLevelId = LevelManager.importLevel(levelData);
      
      if (newLevelId) {
        setShowImportModal(false);
        setImportText('');
        showNotification('Level imported successfully!', 'success');
        loadLevels();
        setSelectedLevelId(newLevelId);
      } else {
        showNotification('Error importing level', 'error');
      }
    } catch (error) {
      showNotification('Invalid JSON format', 'error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportText)
      .then(() => {
        showNotification('Copied to clipboard!', 'success');
      })
      .catch(err => {
        showNotification('Failed to copy to clipboard', 'error');
      });
  };

  return (
    <div className="level-editor">
      <div className="editor-header">
        <Logo size="small" />
        <h2 className="game-title">Level Editor</h2>
      </div>
      
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="editor-container game-panel">
        <div className="editor-tabs">
          <button 
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Levels
          </button>
          <button 
            className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            disabled={!currentLevel}
          >
            Edit
          </button>
          <button 
            className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
            disabled={!currentLevel}
          >
            Properties
          </button>
        </div>
        
        <div className="editor-content">
          {activeTab === 'list' && (
            <LevelList 
              levels={levels}
              selectedLevelId={selectedLevelId}
              onSelectLevel={setSelectedLevelId}
              onCreateNew={createNewLevel}
              onDelete={deleteLevel}
              onDuplicate={() => {
                if (selectedLevelId) {
                  loadLevelDetails(selectedLevelId);
                  setTimeout(duplicateLevel, 100);
                }
              }}
              onEdit={(levelId) => {
                setSelectedLevelId(levelId);
                setActiveTab('edit');
              }}
              onTest={(levelId) => {
                setSelectedLevelId(levelId);
                setTimeout(testLevel, 100);
              }}
            />
          )}
          
          {activeTab === 'edit' && currentLevel && (
            <LevelEditCanvas 
              level={currentLevel}
              onUpdate={updateLevelData}
            />
          )}
          
          {activeTab === 'properties' && currentLevel && (
            <LevelProperties 
              level={currentLevel}
              onUpdateName={updateLevelName}
            />
          )}
        </div>
        
        <div className="editor-actions">
          {currentLevel && (
            <>
              <button 
                className="game-button editor-button"
                onClick={saveLevel}
                disabled={!isDirty}
              >
                Save Level
              </button>
              <button 
                className="game-button editor-button"
                onClick={testLevel}
              >
                Test Level
              </button>
              <button 
                className="game-button editor-button"
                onClick={exportLevel}
              >
                Export Level
              </button>
            </>
          )}
          <button 
            className="game-button editor-button"
            onClick={() => setShowImportModal(true)}
          >
            Import Level
          </button>
          <button 
            className="game-button editor-button back-button"
            onClick={() => {
              if (isDirty) {
                if (window.confirm('You have unsaved changes. Leave without saving?')) {
                  navigate('/');
                }
              } else {
                navigate('/');
              }
            }}
          >
            Back to Menu
          </button>
        </div>
      </div>
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Export Level</h3>
            <p>Copy this JSON to share your level:</p>
            <textarea 
              className="export-textarea"
              value={exportText}
              readOnly
            />
            <div className="modal-actions">
              <button 
                className="game-button small-button"
                onClick={copyToClipboard}
              >
                Copy to Clipboard
              </button>
              <button 
                className="game-button small-button"
                onClick={() => setShowExportModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Import Level</h3>
            <p>Paste the level JSON here:</p>
            <textarea 
              className="import-textarea"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste level JSON here..."
            />
            <div className="modal-actions">
              <button 
                className="game-button small-button"
                onClick={importLevel}
                disabled={!importText.trim()}
              >
                Import
              </button>
              <button 
                className="game-button small-button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>
        {`
          .level-editor {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
          }
          
          .editor-header {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .editor-container {
            width: 90%;
            max-width: 1200px;
            min-height: 600px;
            display: flex;
            flex-direction: column;
          }
          
          .editor-tabs {
            display: flex;
            border-bottom: 2px solid var(--dark-color);
            margin-bottom: 20px;
          }
          
          .tab-button {
            padding: 10px 20px;
            background-color: var(--secondary-color);
            color: white;
            border: none;
            margin-right: 5px;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            cursor: pointer;
            font-family: 'Cinzel Decorative', serif;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .tab-button.active {
            background-color: var(--dark-color);
          }
          
          .tab-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .editor-content {
            flex: 1;
            min-height: 400px;
            margin-bottom: 20px;
          }
          
          .editor-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
            flex-wrap: wrap;
          }
          
          .editor-button {
            width: auto;
            min-width: 150px;
          }
          
          .notification {
            padding: 10px 20px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            animation: fadeIn 0.3s, fadeOut 0.5s 2.5s;
          }
          
          .notification-success {
            background-color: #34A853;
            color: white;
          }
          
          .notification-error {
            background-color: #EA4335;
            color: white;
          }
          
          .notification-info {
            background-color: #4285F4;
            color: white;
          }
          
          /* Modal styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          
          .modal {
            background-color: var(--secondary-color);
            padding: 20px;
            border-radius: 5px;
            width: 80%;
            max-width: 600px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          }
          
          .modal h3 {
            margin-top: 0;
            font-family: 'Cinzel Decorative', serif;
            color: var(--light-color);
          }
          
          .modal p {
            margin-bottom: 10px;
            color: var(--light-color);
          }
          
          .export-textarea,
          .import-textarea {
            width: 100%;
            height: 200px;
            padding: 10px;
            background-color: var(--dark-color);
            color: var(--light-color);
            border: 1px solid var(--accent-color);
            border-radius: 4px;
            font-family: monospace;
            resize: none;
            margin-bottom: 15px;
          }
          
          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }
          
          .small-button {
            font-size: 0.9rem;
            padding: 8px 15px;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default LevelEditor;
