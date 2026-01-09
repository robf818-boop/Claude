import React, { useState } from 'react';
import { Zap, TrendingUp, TrendingDown, Loader2, CheckCircle2 } from 'lucide-react';

interface QuickTradeProps {
  backendUrl: string;
  onTradeExecuted: () => void;
}

export function QuickTrade({ backendUrl, onTradeExecuted }: QuickTradeProps) {
  const [symbol, setSymbol] = useState('SPY');
  const [qty, setQty] = useState('1');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          qty: parseFloat(qty),
          side,
          order_type: 'market'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to place order');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSymbol('SPY');
        setQty('1');
      }, 2000);

      onTradeExecuted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Zap size={20} />
          Quick Trade
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Symbol Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="SPY"
            required
          />
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min="1"
            step="1"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        {/* Side Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={`py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                side === 'buy'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <TrendingUp size={16} />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={`py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                side === 'sell'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <TrendingDown size={16} />
              Sell
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-green-300">
            <CheckCircle2 size={16} />
            Order placed successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || success}
          className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
            success
              ? 'bg-green-500 text-white'
              : side === 'buy'
              ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-slate-600'
              : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-slate-600'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Placing Order...
            </>
          ) : success ? (
            <>
              <CheckCircle2 size={20} />
              Order Placed!
            </>
          ) : (
            <>
              <Zap size={20} />
              Place Market Order
            </>
          )}
        </button>

        {/* Warning */}
        <div className="text-xs text-slate-400 text-center">
          This will place a market order immediately
        </div>
      </form>
    </div>
  );
}
