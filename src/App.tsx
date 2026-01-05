import React, { useState } from 'react';
import { GameSituation, AgeLevel, SkillLevel } from './types';
import { BaseballField } from './components/BaseballField';
import { SituationSelector } from './components/SituationSelector';
import { AIScenarioGenerator } from './components/AIScenarioGenerator';
import { RulesHandbook } from './components/RulesHandbook';
import { PlayerInstructions } from './components/PlayerInstructions';
import { Play, BookOpen, Sparkles, Settings, Users } from 'lucide-react';

type Tab = 'situations' | 'ai-generator' | 'rules' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('situations');
  const [ageLevel, setAgeLevel] = useState<AgeLevel>('12u');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [currentSituation, setCurrentSituation] = useState<GameSituation | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = () => {
    if (!currentSituation) return;

    setIsSimulating(true);
    setSelectedPosition(null);

    // Simulate animation of players moving to positions
    setTimeout(() => {
      setIsSimulating(false);
    }, 1500);
  };

  const handleSelectSituation = (situation: GameSituation) => {
    setCurrentSituation(situation);
    setSelectedPosition(null);
    setIsSimulating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users size={36} />
            DefendIQ
          </h1>
          <p className="mt-2 text-blue-100">
            Master Baseball Defensive Positioning - Interactive training for coaches and players
          </p>
        </div>
      </header>

      {/* Settings Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Age Level:</label>
              <select
                value={ageLevel}
                onChange={(e) => setAgeLevel(e.target.value as AgeLevel)}
                className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="tball">T-Ball</option>
                <option value="8u">8U</option>
                <option value="10u">10U</option>
                <option value="12u">12U</option>
                <option value="14u">14U</option>
                <option value="16u">16U</option>
                <option value="18u">18U</option>
                <option value="high-school">High School</option>
                <option value="travel">Travel Ball</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Skill Level:</label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {currentSituation && (
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="ml-auto flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                <Play size={20} />
                {isSimulating ? 'Simulating...' : 'Simulate Situation'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Field and Instructions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Baseball Field */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              {currentSituation ? (
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {currentSituation.name}
                    </h2>
                    <p className="text-gray-600 mt-1">{currentSituation.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-medium">
                        {currentSituation.outs} {currentSituation.outs === 1 ? 'out' : 'outs'}
                      </span>
                      <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full font-medium">
                        {currentSituation.playType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </div>
                  </div>
                  <BaseballField
                    positions={currentSituation.positions}
                    runners={currentSituation.runners}
                    showInstructions={true}
                    selectedPosition={selectedPosition}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <div className="text-center">
                    <Users size={64} className="mx-auto mb-4" />
                    <p className="text-lg">Select a situation to begin</p>
                    <p className="text-sm mt-2">
                      Choose from preloaded situations or generate with AI
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Player Instructions */}
            {currentSituation && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <PlayerInstructions
                  positions={currentSituation.positions}
                  selectedPosition={selectedPosition}
                  onSelectPosition={setSelectedPosition}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Tabs */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="grid grid-cols-4 border-b">
                <button
                  onClick={() => setActiveTab('situations')}
                  className={`p-3 text-center font-medium transition-colors ${
                    activeTab === 'situations'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Play size={20} className="mx-auto mb-1" />
                  <span className="text-xs">Situations</span>
                </button>
                <button
                  onClick={() => setActiveTab('ai-generator')}
                  className={`p-3 text-center font-medium transition-colors ${
                    activeTab === 'ai-generator'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Sparkles size={20} className="mx-auto mb-1" />
                  <span className="text-xs">AI</span>
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`p-3 text-center font-medium transition-colors ${
                    activeTab === 'rules'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen size={20} className="mx-auto mb-1" />
                  <span className="text-xs">Rules</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`p-3 text-center font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings size={20} className="mx-auto mb-1" />
                  <span className="text-xs">Info</span>
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'situations' && (
                  <SituationSelector
                    onSelect={handleSelectSituation}
                    ageLevel={ageLevel}
                    skillLevel={skillLevel}
                  />
                )}

                {activeTab === 'ai-generator' && (
                  <AIScenarioGenerator
                    onGenerate={handleSelectSituation}
                    ageLevel={ageLevel}
                    skillLevel={skillLevel}
                  />
                )}

                {activeTab === 'rules' && (
                  <RulesHandbook ageLevel={ageLevel} />
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-900">About This Tool</h3>
                    <p className="text-sm text-gray-600">
                      DefendIQ is designed to help coaches teach and players learn proper
                      defensive positioning for various game situations.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Features:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                          <li>Preloaded situations for all age and skill levels</li>
                          <li>AI-powered scenario generation</li>
                          <li>Searchable rules handbook</li>
                          <li>Visual field with player positioning</li>
                          <li>Detailed instructions for each position</li>
                          <li>Practice mode for on-field training</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900">How to Use:</h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                          <li>Select your age and skill level</li>
                          <li>Choose a preloaded situation or generate with AI</li>
                          <li>Review player positions and instructions</li>
                          <li>Click "Simulate" to see the positions</li>
                          <li>Use on-field or at home for practice</li>
                        </ol>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Coach's Note:</strong> This tool complements on-field
                          practice. Use it to prepare players before practice and review
                          situations afterward.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 bg-gray-800 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">
            DefendIQ - Empowering coaches and players with interactive defensive training tools
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supports all age levels from T-Ball to High School and Travel Ball
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
