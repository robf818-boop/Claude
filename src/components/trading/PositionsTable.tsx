import React, { useState } from 'react';
import { TrendingUp, TrendingDown, X, Loader2 } from 'lucide-react';

interface PositionsTableProps {
  positions: any[];
  backendUrl: string;
  onPositionClosed: () => void;
}

export function PositionsTable({ positions, backendUrl, onPositionClosed }: PositionsTableProps) {
  const [closingPosition, setClosingPosition] = useState<string | null>(null);

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close ${symbol}?`)) return;

    setClosingPosition(symbol);
    try {
      const response = await fetch(`${backendUrl}/api/positions/${symbol}/close`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to close position');
      }

      onPositionClosed();
    } catch (err) {
      alert(`Failed to close position: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClosingPosition(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (positions.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-8">
        <div className="text-center text-slate-400">
          <TrendingUp size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No Open Positions</p>
          <p className="text-sm mt-1">Your positions will appear here once you start trading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <TrendingUp size={20} />
          Open Positions ({positions.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Side
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Current
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Market Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Unrealized P&L
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {positions.map((position, index) => (
              <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-white font-semibold">{position.symbol}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    position.side === 'long'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {Math.abs(position.qty)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatCurrency(position.entry_price)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatCurrency(position.current_price)}
                </td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  {formatCurrency(position.market_value)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`font-semibold ${position.unrealized_pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {position.unrealized_pl >= 0 ? <TrendingUp size={16} className="inline mr-1" /> : <TrendingDown size={16} className="inline mr-1" />}
                    {formatCurrency(position.unrealized_pl)}
                  </div>
                  <div className={`text-xs ${position.unrealized_plpc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {position.unrealized_plpc >= 0 ? '+' : ''}{position.unrealized_plpc.toFixed(2)}%
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleClosePosition(position.symbol)}
                    disabled={closingPosition === position.symbol}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {closingPosition === position.symbol ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <X size={14} />
                        Close
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
