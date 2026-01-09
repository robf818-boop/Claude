import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface PortfolioMetricsProps {
  metrics: any;
}

export function PortfolioMetrics({ metrics }: PortfolioMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Account Balance */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign size={20} />
            <span className="text-sm font-medium">Account Balance</span>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-white">
            {formatCurrency(metrics.account_balance)}
          </p>
          <p className={`text-sm mt-1 ${metrics.total_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(metrics.total_return_pct)} all time
          </p>
        </div>
      </div>

      {/* Buying Power */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Target size={20} />
            <span className="text-sm font-medium">Buying Power</span>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold text-white">
            {formatCurrency(metrics.buying_power)}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Available to trade
          </p>
        </div>
      </div>

      {/* Open P&L */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            {metrics.open_pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span className="text-sm font-medium">Open P&L</span>
          </div>
        </div>
        <div className="mt-2">
          <p className={`text-3xl font-bold ${metrics.open_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(metrics.open_pnl)}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {metrics.open_positions} open positions
          </p>
        </div>
      </div>

      {/* Risk Score */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield size={20} />
            <span className="text-sm font-medium">Risk Score</span>
          </div>
        </div>
        <div className="mt-2">
          <p className={`text-3xl font-bold ${
            metrics.risk_score < 25 ? 'text-green-400' :
            metrics.risk_score < 50 ? 'text-yellow-400' :
            metrics.risk_score < 75 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {metrics.risk_score}
          </p>
          <p className={`text-sm mt-1 font-medium ${
            metrics.risk_score < 25 ? 'text-green-400' :
            metrics.risk_score < 50 ? 'text-yellow-400' :
            metrics.risk_score < 75 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {metrics.risk_level}
          </p>
        </div>
      </div>
    </div>
  );
}
