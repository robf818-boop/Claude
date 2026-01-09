import React, { useState } from 'react';
import { Key, Server, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ApiConfigProps {
  onSave: (config: { apiKey: string; apiSecret: string; backendUrl: string }) => void;
}

export function ApiConfig({ onSave }: ApiConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setError('');
    setSuccess(false);

    try {
      // Test backend connection
      const response = await fetch(`${backendUrl}/health`);
      if (!response.ok) {
        throw new Error('Backend server is not running');
      }

      setSuccess(true);

      // Save credentials after successful test
      setTimeout(() => {
        onSave({ apiKey, apiSecret, backendUrl });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    testConnection();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key size={24} />
            Connect to Alpaca
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Enter your paper trading API credentials to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Backend URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Server size={16} className="inline mr-2" />
              Backend Server URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="http://localhost:8000"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Make sure the backend server is running (python backend/main.py)
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Key size={16} className="inline mr-2" />
              Alpaca API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="PKXXXXXXXXXXXXXX"
              required
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Key size={16} className="inline mr-2" />
              Alpaca API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your secret key"
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-medium text-sm mb-2">📝 How to get API keys:</h3>
            <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://app.alpaca.markets/paper/dashboard/overview" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Alpaca Paper Trading Dashboard</a></li>
              <li>Click on "API Keys" in the sidebar</li>
              <li>Generate new keys or copy existing ones</li>
              <li>Make sure you're using PAPER trading keys (starts with "PK")</li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium text-sm">Connection Failed</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
                <p className="text-red-400 text-xs mt-2">
                  Make sure the backend server is running: <code className="bg-slate-900 px-2 py-1 rounded">python backend/main.py</code>
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              <p className="text-green-300 font-medium text-sm">Connection successful! Loading dashboard...</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={testing || success}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Testing Connection...
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={20} />
                Connected!
              </>
            ) : (
              <>
                <Key size={20} />
                Connect to Alpaca
              </>
            )}
          </button>
        </form>
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center text-xs text-slate-400">
        <p>🔒 Your credentials are stored locally in your browser</p>
        <p className="mt-1">They are never sent to any third-party servers</p>
      </div>
    </div>
  );
}
