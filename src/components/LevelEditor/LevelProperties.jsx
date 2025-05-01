import React, { useState, useEffect } from 'react';

const LevelProperties = ({ level, onUpdateName }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    difficulty: 'medium',
    width: 800,
    height: 600,
    isUnlocked: true,
    order: 0
  });

  // Initialize form data when level changes
  useEffect(() => {
    if (level) {
      setFormData({
        id: level.id || '',
        name: level.name || '',
        description: level.description || '',
        difficulty: level.difficulty || 'medium',
        width: level.width || 800,
        height: level.height || 600,
        isUnlocked: level.isUnlocked !== false, // Default to true
        order: level.order || 0
      });
    }
  }, [level]);

  // Update parent component when name changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    const updatedFormData = {
      ...formData,
      [name]: newValue
    };
    
    setFormData(updatedFormData);
    
    // Special handling for name field to update in parent component
    if (name === 'name') {
      onUpdateName(newValue);
    }
    // Note: Other fields currently aren't being passed up to the parent
  };

  return (
    <div className="level-properties">
      <h3>Level Properties</h3>
      
      <div className="property-group">
        <label htmlFor="name">Level Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter level name"
          required
        />
      </div>
      
      <div className="property-group">
        <label htmlFor="id">Level ID:</label>
        <input
          type="text"
          id="id"
          name="id"
          value={formData.id}
          disabled={true}
          placeholder="Generated automatically"
          className="disabled"
        />
        <div className="helper-text">ID is generated automatically and cannot be changed</div>
      </div>
      
      <div className="property-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows="3"
          placeholder="Describe this level"
        />
      </div>
      
      <div className="property-group">
        <label htmlFor="difficulty">Difficulty:</label>
        <select
          id="difficulty"
          name="difficulty"
          value={formData.difficulty}
          onChange={handleInputChange}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </div>
      
      <div className="property-group">
        <label htmlFor="order">Level Order:</label>
        <input
          type="number"
          id="order"
          name="order"
          min="0"
          value={formData.order}
          onChange={handleInputChange}
        />
        <div className="helper-text">Determines the order levels appear in the level select</div>
      </div>
      
      <div className="dimensions-group">
        <div className="property-group half">
          <label htmlFor="width">Width:</label>
          <input
            type="number"
            id="width"
            name="width"
            min="400"
            max="1200"
            value={formData.width}
            onChange={handleInputChange}
            disabled={true}
            className="disabled"
          />
        </div>
        
        <div className="property-group half">
          <label htmlFor="height">Height:</label>
          <input
            type="number"
            id="height"
            name="height"
            min="300"
            max="900"
            value={formData.height}
            onChange={handleInputChange}
            disabled={true}
            className="disabled"
          />
        </div>
        <div className="helper-text">Canvas dimensions cannot be changed in this version</div>
      </div>
      
      <div className="property-group checkbox">
        <input
          type="checkbox"
          id="isUnlocked"
          name="isUnlocked"
          checked={formData.isUnlocked}
          onChange={handleInputChange}
        />
        <label htmlFor="isUnlocked">Available without unlocking</label>
      </div>
      
      <div className="helper-text">Note: Changes to name are saved automatically. Other properties will be added in a future update.</div>
      
      <style>
        {`
          .level-properties {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
          }
          
          .level-properties h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-family: 'Cinzel Decorative', serif;
            color: var(--light-color);
            text-align: center;
          }
          
          .property-group {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
          }
          
          .property-group label {
            margin-bottom: 5px;
            color: var(--light-color);
            font-weight: bold;
          }
          
          .property-group input[type="text"],
          .property-group input[type="number"],
          .property-group select,
          .property-group textarea {
            padding: 8px;
            background-color: var(--dark-color);
            color: var(--light-color);
            border: 1px solid var(--accent-color);
            border-radius: 4px;
            font-family: inherit;
          }
          
          .property-group input.disabled,
          .property-group select.disabled,
          .property-group textarea.disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .property-group input:focus,
          .property-group select:focus,
          .property-group textarea:focus {
            outline: none;
            box-shadow: 0 0 3px var(--accent-color);
          }
          
          .dimensions-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .property-group.half {
            flex: 1;
          }
          
          .property-group.checkbox {
            flex-direction: row;
            align-items: center;
            gap: 10px;
          }
          
          .property-group.checkbox input {
            margin: 0;
          }
          
          .helper-text {
            font-size: 0.8rem;
            color: #aaa;
            margin-top: 5px;
          }
        `}
      </style>
    </div>
  );
};

export default LevelProperties;