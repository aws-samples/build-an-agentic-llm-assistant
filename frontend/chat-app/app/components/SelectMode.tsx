import React, { useState, useEffect } from 'react';

interface SelectModeProps {
  onClick: (mode: 'basic' | 'agentic') => void;
}

const SelectMode: React.FC<SelectModeProps> = ({ onClick }) => {
  // fetch the assistantMode from cache if available otherwise default to basic
  const [mode, setMode] = useState<'basic' | 'agentic'>(() => {
    const storedMode = localStorage.getItem('assistantMode');
    return storedMode === 'agentic' ? 'agentic' : 'basic';
  });

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedMode = e.target.value as 'basic' | 'agentic';
    localStorage.setItem('assistantMode', String(selectedMode));
    setMode(selectedMode);
    onClick(selectedMode);
  };

  return (
    <div className="text-gray-600 text-sm hover:text-gray-800 hover:shadow-sm focus:outline-none flex items-center space-x-2">
      <span>Assistant Mode</span>
      <label>
        <input
          type="radio"
          value="basic"
          checked={mode === 'basic'}
          onChange={handleModeChange}
        />
        <span className="ml-1">Basic</span>
      </label>
      <label>
        <input
          type="radio"
          value="agentic"
          checked={mode === 'agentic'}
          onChange={handleModeChange}
        />
        <span className="ml-1">Agentic</span>
      </label>
    </div>
  );
};

export default SelectMode;