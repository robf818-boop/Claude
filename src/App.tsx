import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import { Dashboard } from './components/trading/Dashboard';
import { ApiConfig } from './components/trading/ApiConfig';

function App() {
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    apiKey: '',
    apiSecret: '',
    backendUrl: 'http://localhost:8000'
  });

  useEffect(() => {
    // Check if API settings are saved in localStorage
    const saved = localStorage.getItem('alpaca_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setApiSettings(config);
        setApiConfigured(true);
      } catch (e) {
        console.error('Failed to load saved config:', e);
      }
    }
  }, []);

  const handleConfigSave = (config: typeof apiSettings) => {
    setApiSettings(config);
    localStorage.setItem('alpaca_config', JSON.stringify(config));
    setApiConfigured(true);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('alpaca_config');
    setApiConfigured(false);
    setApiSettings({
      apiKey: '',
      apiSecret: '',
      backendUrl: 'http://localhost:8000'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg border-b border-blue-500/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp size={32} className="text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">OptionIQ</h1>
                <p className="text-blue-100 text-sm">Automated Options Trading Bot</p>
              </div>
            </div>
            {apiConfigured && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-300">
                  <Activity size={20} />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {!apiConfigured ? (
        <ApiConfig onSave={handleConfigSave} />
      ) : (
        <Dashboard
          apiKey={apiSettings.apiKey}
          apiSecret={apiSettings.apiSecret}
          backendUrl={apiSettings.backendUrl}
        />
      )}
    </div>
  );
}

export default App;
