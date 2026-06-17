// src/components/DifficultySelect.jsx - 难度选择界面
import React, { useState } from 'react';
import { DIFFICULTY_LEVELS } from '../config/difficulty.js';

const CATEGORIES = [
  { key: 'base', label: '基础难度', levels: [1, 2, 3], color: '#4CAF50' },
  { key: 'normal', label: '进阶难度', levels: [4, 5, 6, 7, 8, 9], color: '#FF9800' },
  { key: 'hard', label: '硬核难度', levels: [10, 11, 12, 13, 14, 15], color: '#F44336' },
  { key: 'extreme', label: '极限难度', levels: [16, 17, 18, 19, 20, 21], color: '#9C27B0' }
];

export default function DifficultySelect({ onSelect, currentLevel = 1 }) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [hoveredLevel, setHoveredLevel] = useState(null);

  const handleSelect = (level) => {
    setSelectedLevel(level);
    onSelect(level);
  };

  const getDifficultyColor = (level) => {
    if (level <= 3) return '#4CAF50';
    if (level <= 9) return '#FF9800';
    if (level <= 15) return '#F44336';
    return '#9C27B0';
  };

  return (
    <div className="difficulty-select">
      <h2>选择难度</h2>
      <p className="difficulty-hint">
        当前选择: <strong>Level {selectedLevel} - {DIFFICULTY_LEVELS[selectedLevel]?.name}</strong>
      </p>
      
      {CATEGORIES.map(cat => (
        <div key={cat.key} className="difficulty-category">
          <h3 style={{ color: cat.color }}>{cat.label}</h3>
          <div className="difficulty-grid">
            {cat.levels.map(level => {
              const config = DIFFICULTY_LEVELS[level];
              const isSelected = level === selectedLevel;
              const isHovered = level === hoveredLevel;
              
              return (
                <button
                  key={level}
                  className={`difficulty-btn ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                  style={{
                    borderColor: getDifficultyColor(level),
                    backgroundColor: isSelected ? getDifficultyColor(level) : 'transparent'
                  }}
                  onClick={() => handleSelect(level)}
                  onMouseEnter={() => setHoveredLevel(level)}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  <span className="level-number">Lv.{level}</span>
                  <span className="level-name">{config.name}</span>
                  <span className="level-survival">{config.survival}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="difficulty-info">
        {hoveredLevel && (
          <div className="difficulty-tooltip">
            <h4>Level {hoveredLevel}: {DIFFICULTY_LEVELS[hoveredLevel]?.name}</h4>
            <p>{DIFFICULTY_LEVELS[hoveredLevel]?.description}</p>
            <p>预期存活率: {DIFFICULTY_LEVELS[hoveredLevel]?.survival}</p>
            <p>平均存活天数: {DIFFICULTY_LEVELS[hoveredLevel]?.days}</p>
          </div>
        )}
      </div>

      <div className="difficulty-actions">
        <button className="btn-confirm" onClick={() => onSelect(selectedLevel)}>
          确认选择
        </button>
      </div>
    </div>
  );
}
