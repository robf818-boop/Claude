import React, { useState, useMemo } from 'react';
import { GameSituation, AgeLevel, SkillLevel } from '../types';
import { situations } from '../data/situations';

interface SituationSelectorProps {
  onSelect: (situation: GameSituation) => void;
  ageLevel: AgeLevel;
  skillLevel: SkillLevel;
}

export const SituationSelector: React.FC<SituationSelectorProps> = ({
  onSelect,
  ageLevel,
  skillLevel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter situations based on age and skill level
  const filteredSituations = useMemo(() => {
    return situations.filter(
      (sit) =>
        sit.ageLevel.includes(ageLevel) &&
        sit.skillLevel.includes(skillLevel)
    );
  }, [ageLevel, skillLevel]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(filteredSituations.map((s) => s.playType));
    return ['all', ...Array.from(cats)];
  }, [filteredSituations]);

  // Filter by category
  const displayedSituations = useMemo(() => {
    if (selectedCategory === 'all') return filteredSituations;
    return filteredSituations.filter((s) => s.playType === selectedCategory);
  }, [filteredSituations, selectedCategory]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <p className="text-sm text-gray-600">
          Showing {displayedSituations.length} situation(s) for {ageLevel.toUpperCase()} {skillLevel} level
        </p>
        {displayedSituations.map((situation) => (
          <button
            key={situation.id}
            onClick={() => onSelect(situation)}
            className="w-full text-left p-4 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
          >
            <div className="font-semibold text-gray-900">{situation.name}</div>
            <div className="text-sm text-gray-600 mt-1">{situation.description}</div>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {situation.outs} {situation.outs === 1 ? 'out' : 'outs'}
              </span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                {situation.playType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            </div>
          </button>
        ))}
        {displayedSituations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No situations available for this age and skill level combination.
          </div>
        )}
      </div>
    </div>
  );
};
