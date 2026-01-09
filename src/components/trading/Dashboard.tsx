import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioMetrics } from './PortfolioMetrics';
import { PositionsTable } from './PositionsTable';
import { RiskPanel } from './RiskPanel';
import { QuickTrade } from './QuickTrade';
import { Activity, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  apiKey: string;
  apiSecret: string;
  backendUrl: string;
}

export function Dashboard({ apiKey, apiSecret, backendUrl }: DashboardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  // Fetch portfolio metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/portfolio/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setError('');
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnected(false);
    }
  }, [backendUrl]);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/portfolio/positions`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  }, [backendUrl]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchPositions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMetrics, fetchPositions]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
      fetchPositions();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMetrics, fetchPositions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Connecting to Alpaca...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-red-300 font-bold text-lg">Connection Error</h3>
              <p className="text-red-400 mt-2">{error}</p>
              <div className="mt-4 text-sm text-red-300">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Make sure the backend server is running</li>
                  <li>Check that you're using the correct API keys</li>
                  <li>Verify your .env file is configured correctly</li>
                </ul>
                <div className="mt-4 bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-400">Start the backend:</p>
                  <code className="text-xs text-green-400">cd backend && python main.py</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-sm text-slate-400">
            {connected ? 'Live' : 'Disconnected'} • Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Portfolio Metrics */}
      {metrics && <PortfolioMetrics metrics={metrics} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Positions */}
          <PositionsTable positions={positions} backendUrl={backendUrl} onPositionClosed={fetchPositions} />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Risk Panel */}
          {metrics && <RiskPanel metrics={metrics} />}

          {/* Quick Trade */}
          <QuickTrade backendUrl={backendUrl} onTradeExecuted={fetchPositions} />
        </div>
      </div>
    </div>
  );
}
