import React from 'react';
import { AlertTriangle, Shield, TrendingDown } from 'lucide-react';

interface RiskPanelProps {
  metrics: any;
}

export function RiskPanel({ metrics }: RiskPanelProps) {
  const getStatusColor = (triggered: boolean) => {
    return triggered ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/50 bg-green-500/10';
  };

  const getStatusText = (triggered: boolean) => {
    return triggered ? 'TRIGGERED' : 'NORMAL';
  };

  const getStatusTextColor = (triggered: boolean) => {
    return triggered ? 'text-red-400' : 'text-green-400';
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Shield size={20} />
          Portfolio Risk Metrics
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Total Exposure */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <span className="text-slate-400 text-sm">Total Exposure</span>
          <span className="text-white font-bold">
            ${metrics.total_exposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Current Drawdown */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <span className="text-slate-400 text-sm">Current Drawdown</span>
          <span className={`font-bold ${metrics.current_drawdown_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {metrics.current_drawdown_pct.toFixed(2)}%
          </span>
        </div>

        {/* Daily P&L */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <span className="text-slate-400 text-sm">Daily P&L</span>
          <div className="text-right">
            <div className={`font-bold ${metrics.daily_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${metrics.daily_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-xs ${metrics.daily_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.daily_pnl_pct >= 0 ? '+' : ''}{metrics.daily_pnl_pct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Position Utilization */}
        <div className="pb-3 border-b border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">Position Utilization</span>
            <span className="text-white font-bold">
              {metrics.open_positions}/10 ({metrics.position_utilization_pct.toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${metrics.position_utilization_pct}%` }}
            />
          </div>
        </div>

        {/* Circuit Breakers */}
        <div>
          <h4 className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Circuit Breakers
          </h4>

          {/* Daily Drawdown Limit */}
          <div className={`border rounded-lg p-3 mb-3 ${getStatusColor(metrics.daily_circuit_breaker)}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 text-sm font-medium">Daily Drawdown Limit</span>
              <span className={`text-xs font-bold ${getStatusTextColor(metrics.daily_circuit_breaker)}`}>
                {getStatusText(metrics.daily_circuit_breaker)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">
                {metrics.daily_drawdown_pct.toFixed(2)}% / 3%
              </span>
              <div className="w-24 bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    metrics.daily_circuit_breaker ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(metrics.daily_drawdown_pct) / 3 * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly Drawdown Limit */}
          <div className={`border rounded-lg p-3 ${getStatusColor(metrics.weekly_circuit_breaker)}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 text-sm font-medium">Weekly Drawdown Limit</span>
              <span className={`text-xs font-bold ${getStatusTextColor(metrics.weekly_circuit_breaker)}`}>
                {getStatusText(metrics.weekly_circuit_breaker)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">
                {metrics.weekly_drawdown_pct.toFixed(2)}% / 7%
              </span>
              <div className="w-24 bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    metrics.weekly_circuit_breaker ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(metrics.weekly_drawdown_pct) / 7 * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning if circuit breaker triggered */}
        {(metrics.daily_circuit_breaker || metrics.weekly_circuit_breaker) && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium text-sm">Trading Halted</p>
                <p className="text-red-400 text-xs mt-1">
                  Circuit breaker triggered. All new trades are blocked.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
