// src/components/DifficultySelect.jsx - 13级难度选择界面
import React, { useState } from 'react';
import { DIFFICULTY_LEVELS } from '../config/difficulty.js';

const PHASES = [
  {
    key: 'beginner',
    label: '昼钟',
    color: '#4CAF50',
    levels: [1, 2, 3],
    description: '白日尚明，一切看似正常',
  },
  {
    key: 'challenge',
    label: '雾钟',
    color: '#66BB6A',
    levels: [4, 5, 6],
    description: '海雾弥漫，怪事开始增多',
  },
  {
    key: 'hardcore',
    label: '昏钟',
    color: '#FF9800',
    levels: [7, 8, 9],
    description: '黄昏降临，真相开始显露',
  },
  {
    key: 'legend',
    label: '夜钟',
    color: '#F44336',
    levels: [10, 11, 12],
    description: '午夜将至，疯狂蔓延',
  },
  {
    key: 'ultimate',
    label: '第十三声',
    color: '#1A1A2E',
    levels: [13],
    description: '不该存在的钟响',
    special: true,
  },
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
    if (level <= 6) return '#66BB6A';
    if (level <= 9) return '#FF9800';
    if (level <= 12) return '#F44336';
    return '#1A1A2E';
  };

  return (
    <div className="difficulty-select">
      <h2>选择难度</h2>
      <p className="difficulty-hint">
        当前选择: <strong>Lv.{selectedLevel} - {DIFFICULTY_LEVELS[selectedLevel]?.name}</strong>
      </p>

      {PHASES.map((cat) => (
        <div key={cat.key} className="difficulty-category">
          <h3 style={{ color: cat.color }}>
            {cat.label}
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', marginLeft: '0.5rem', opacity: 0.7 }}>
              {cat.description}
            </span>
          </h3>
          <div className="difficulty-grid">
            {cat.levels.map((level) => {
              const config = DIFFICULTY_LEVELS[level];
              const isSelected = level === selectedLevel;
              const isHovered = level === hoveredLevel;
              const isUltimate = cat.special;

              return (
                <button
                  key={level}
                  className={`difficulty-btn ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isUltimate ? 'ultimate' : ''}`}
                  style={{
                    borderColor: cat.color,
                    backgroundColor: isSelected ? cat.color : 'transparent',
                    animation: isUltimate && isSelected ? 'ultimatePulse 2s ease-in-out infinite' : undefined,
                  }}
                  onClick={() => handleSelect(level)}
                  onMouseEnter={() => setHoveredLevel(level)}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  <span className="level-number">Lv.{level}</span>
                  <span className="level-name">{config.name}</span>
                  <span className="level-survival">{config.expected_survival}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="difficulty-info">
        {hoveredLevel && (
          <div className="difficulty-tooltip">
            <h4 style={{ color: getDifficultyColor(hoveredLevel) }}>
              Lv.{hoveredLevel}: {DIFFICULTY_LEVELS[hoveredLevel]?.name}
            </h4>
            <p>{DIFFICULTY_LEVELS[hoveredLevel]?.description}</p>
            <p>预期存活率: {DIFFICULTY_LEVELS[hoveredLevel]?.expected_survival}</p>
            <p>平均存活天数: {DIFFICULTY_LEVELS[hoveredLevel]?.expected_days}</p>
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
