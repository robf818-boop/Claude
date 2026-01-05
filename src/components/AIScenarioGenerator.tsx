import React, { useState } from 'react';
import { GameSituation, AgeLevel, SkillLevel, PlayerPositions } from '../types';
import { Sparkles } from 'lucide-react';

interface AIScenarioGeneratorProps {
  onGenerate: (situation: GameSituation) => void;
  ageLevel: AgeLevel;
  skillLevel: SkillLevel;
}

export const AIScenarioGenerator: React.FC<AIScenarioGeneratorProps> = ({
  onGenerate,
  ageLevel,
  skillLevel,
}) => {
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState('Little League');
  const [loading, setLoading] = useState(false);

  const generateScenario = () => {
    if (!description.trim()) return;

    setLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      // Parse description to determine scenario parameters
      const lowerDesc = description.toLowerCase();

      // Determine runners
      const runners = {
        first: lowerDesc.includes('first') || lowerDesc.includes('1b') || lowerDesc.includes('bases loaded'),
        second: lowerDesc.includes('second') || lowerDesc.includes('2b') || lowerDesc.includes('bases loaded'),
        third: lowerDesc.includes('third') || lowerDesc.includes('3b') || lowerDesc.includes('bases loaded'),
      };

      // Determine outs
      let outs = 0;
      if (lowerDesc.includes('0 out') || lowerDesc.includes('no out')) outs = 0;
      else if (lowerDesc.includes('1 out') || lowerDesc.includes('one out')) outs = 1;
      else if (lowerDesc.includes('2 out') || lowerDesc.includes('two out')) outs = 2;

      // Determine play type
      let playType = 'general';
      if (lowerDesc.includes('bunt')) playType = 'bunt';
      else if (lowerDesc.includes('fly') || lowerDesc.includes('pop')) playType = 'fly-ball';
      else if (lowerDesc.includes('ground')) playType = 'ground-ball';
      else if (lowerDesc.includes('steal')) playType = 'steal-defense';
      else if (lowerDesc.includes('double')) playType = 'extra-base-hit';

      // Generate appropriate positions based on play type and runners
      const positions: PlayerPositions = generatePositions(playType, runners, outs);

      const scenario: GameSituation = {
        id: `ai-generated-${Date.now()}`,
        name: `AI Generated: ${description.substring(0, 40)}...`,
        description: description,
        outs,
        runners,
        playType,
        ageLevel: [ageLevel],
        skillLevel: [skillLevel],
        positions,
      };

      onGenerate(scenario);
      setLoading(false);
      setDescription('');
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe the Scenario
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., Runner on first, 1 out, ground ball to shortstop&#10;E.g., Bases loaded, fly ball to right field&#10;E.g., Bunt defense with runner on third"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization/Rulebook
        </label>
        <select
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option>Little League</option>
          <option>USSSA</option>
          <option>NFHS (High School)</option>
          <option>Travel Ball</option>
          <option>General Baseball</option>
        </select>
      </div>

      <button
        onClick={generateScenario}
        disabled={!description.trim() || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Sparkles size={20} />
        {loading ? 'Generating Scenario...' : 'Generate Scenario with AI'}
      </button>

      <div className="text-xs text-gray-500 mt-2">
        The AI will analyze your description and create appropriate player positions based on {organization} rules for {ageLevel.toUpperCase()} {skillLevel} level.
      </div>
    </div>
  );
};

// Helper function to generate positions based on scenario
function generatePositions(
  playType: string,
  runners: { first: boolean; second: boolean; third: boolean },
  outs: number
): PlayerPositions {
  // Default positions
  const basePositions: PlayerPositions = {
    P: { x: 50, y: 55, instruction: 'Ready position on mound' },
    C: { x: 50, y: 85, instruction: 'Behind home plate' },
    '1B': { x: 72, y: 72, instruction: 'Cover first base' },
    '2B': { x: 58, y: 48, instruction: 'Standard second base position' },
    '3B': { x: 35, y: 65, instruction: 'Guard third base' },
    SS: { x: 42, y: 48, instruction: 'Standard shortstop position' },
    LF: { x: 20, y: 20, instruction: 'Left field coverage' },
    CF: { x: 50, y: 15, instruction: 'Center field coverage' },
    RF: { x: 80, y: 20, instruction: 'Right field coverage' },
  };

  // Customize based on play type
  if (playType === 'bunt') {
    basePositions.P.instruction = 'Charge on bunt';
    basePositions['1B'].instruction = 'Charge on bunt, field right side';
    basePositions['3B'].instruction = 'Charge on bunt, field left side';
    basePositions['2B'].instruction = 'Cover first base';
    basePositions.SS.instruction = 'Cover second or third';
  } else if (playType === 'fly-ball') {
    basePositions.P.instruction = 'Back up base';
    basePositions['1B'].instruction = 'Cutoff position or cover base';
    basePositions.SS.instruction = 'Cutoff or relay position';
    basePositions['2B'].instruction = 'Cover base or relay';
  } else if (playType === 'ground-ball' && runners.first) {
    basePositions.SS.instruction = 'Turn double play if possible';
    basePositions['2B'].instruction = 'Cover second for force';
    basePositions['1B'].instruction = 'Cover first for relay';
  }

  // Adjust for runners
  if (runners.third && outs < 2) {
    basePositions.C.instruction = 'Ready for play at home';
    basePositions.P.instruction = 'Back up home plate';
  }

  return basePositions;
}
