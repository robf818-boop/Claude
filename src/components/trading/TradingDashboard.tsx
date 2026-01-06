/**
 * Trading Dashboard - Main UI Component
 *
 * Real-time visualization of the AutoFlipper trading system.
 * Displays system status, positions, signals, and risk metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Eye,
  Pause,
  Play,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  AutoFlipper,
  createAutoFlipper,
  SystemStatus,
  Position,
  TradingSignal,
  RiskMetrics,
  CircuitBreaker,
  RiskAlert,
} from '../../trading';

interface TradingDashboardProps {
  symbols?: string[];
  paperTrading?: boolean;
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({
  symbols = ['SPY', 'QQQ', 'AAPL'],
  paperTrading = true,
}) => {
  // AutoFlipper instance
  const [flipper, setFlipper] = useState<AutoFlipper | null>(null);

  // State
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreaker[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [accountInfo, setAccountInfo] = useState({
    balance: 0,
    buyingPower: 0,
    equity: 0,
    openPnL: 0,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'positions' | 'risk'>('overview');

  // Initialize AutoFlipper
  useEffect(() => {
    const instance = createAutoFlipper(symbols, { paperTrading });
    setFlipper(instance);

    // Subscribe to events
    instance.on('signal_generated', () => {
      setSignals(instance.getActiveSignals());
    });

    instance.on('position_opened', () => {
      setPositions(instance.getPositions());
      setAccountInfo(instance.getAccountInfo());
    });

    instance.on('position_closed', () => {
      setPositions(instance.getPositions());
      setAccountInfo(instance.getAccountInfo());
    });

    instance.on('risk_alert', () => {
      setAlerts(instance.getAlerts(20));
    });

    return () => {
      instance.stop();
    };
  }, [symbols, paperTrading]);

  // Refresh state periodically
  useEffect(() => {
    if (!flipper) return;

    const interval = setInterval(() => {
      setSystemStatus(flipper.getStatus());
      setPositions(flipper.getPositions());
      setSignals(flipper.getActiveSignals());
      setRiskMetrics(flipper.getRiskMetrics());
      setCircuitBreakers(flipper.getCircuitBreakers());
      setAlerts(flipper.getAlerts(20));
      setAccountInfo(flipper.getAccountInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, [flipper]);

  // Actions
  const handleStart = useCallback(async () => {
    if (flipper) {
      await flipper.start();
      setSystemStatus(flipper.getStatus());
    }
  }, [flipper]);

  const handleStop = useCallback(async () => {
    if (flipper) {
      await flipper.stop();
      setSystemStatus(flipper.getStatus());
    }
  }, [flipper]);

  const handlePause = useCallback(() => {
    if (flipper) {
      flipper.pause('Manual pause from dashboard');
      setSystemStatus(flipper.getStatus());
    }
  }, [flipper]);

  const handleResume = useCallback(() => {
    if (flipper) {
      flipper.resume();
      setSystemStatus(flipper.getStatus());
    }
  }, [flipper]);

  const handleExecuteSignal = useCallback(async (signalId: string) => {
    if (flipper) {
      const result = await flipper.executeSignal(signalId);
      if (!result.success) {
        console.error('Execution failed:', result.error);
      }
    }
  }, [flipper]);

  const handleClosePosition = useCallback(async (positionId: string) => {
    if (flipper) {
      await flipper.closePosition(positionId);
    }
  }, [flipper]);

  // Render helpers
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500';
      case 'elevated':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl font-bold">AutoFlipper Trading Dashboard</h1>
          {paperTrading && (
            <span className="px-2 py-1 bg-blue-600 text-xs rounded">PAPER</span>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!systemStatus?.isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <>
              {!systemStatus?.isPaused ? (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              )}
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Module Status Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ModuleStatusCard
          name="Sentinel"
          status={systemStatus?.sentinel || 'stopped'}
          icon={<Eye className="w-5 h-5" />}
          description="Data Ingestion"
        />
        <ModuleStatusCard
          name="Oracle"
          status={systemStatus?.oracle || 'stopped'}
          icon={<BarChart3 className="w-5 h-5" />}
          description="Analysis Engine"
        />
        <ModuleStatusCard
          name="Executor"
          status={systemStatus?.executor || 'stopped'}
          icon={<Activity className="w-5 h-5" />}
          description="Order Management"
        />
        <ModuleStatusCard
          name="Warden"
          status={systemStatus?.warden || 'stopped'}
          icon={<Shield className="w-5 h-5" />}
          description="Risk Monitoring"
        />
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Account Balance"
          value={`$${accountInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<CircleDollarSign className="w-5 h-5 text-green-400" />}
        />
        <MetricCard
          title="Buying Power"
          value={`$${accountInfo.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<CircleDollarSign className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          title="Open P&L"
          value={`$${accountInfo.openPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColor={accountInfo.openPnL >= 0 ? 'text-green-400' : 'text-red-400'}
          icon={accountInfo.openPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
        />
        <MetricCard
          title="Risk Score"
          value={riskMetrics?.riskScore.toFixed(0) || '0'}
          subtitle={riskMetrics?.riskLevel || 'N/A'}
          icon={<Shield className="w-5 h-5" />}
          valueColor={getRiskLevelColor(riskMetrics?.riskLevel || 'low').replace('bg-', 'text-')}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {(['overview', 'signals', 'positions', 'risk'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg transition ${
              activeTab === tab
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-4">
        {activeTab === 'overview' && (
          <OverviewTab
            signals={signals}
            positions={positions}
            alerts={alerts}
          />
        )}
        {activeTab === 'signals' && (
          <SignalsTab
            signals={signals}
            onExecute={handleExecuteSignal}
          />
        )}
        {activeTab === 'positions' && (
          <PositionsTab
            positions={positions}
            onClose={handleClosePosition}
          />
        )}
        {activeTab === 'risk' && (
          <RiskTab
            metrics={riskMetrics}
            breakers={circuitBreakers}
            alerts={alerts}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ModuleStatusCard: React.FC<{
  name: string;
  status: string;
  icon: React.ReactNode;
  description: string;
}> = ({ name, status, icon, description }) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running':
        return 'text-green-400';
      case 'stopped':
        return 'text-gray-500';
      case 'starting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="font-semibold">{name}</span>
      </div>
      <div className={`text-sm font-medium ${getStatusColor(status)}`}>
        {status.toUpperCase()}
      </div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  valueColor?: string;
}> = ({ title, value, subtitle, icon, valueColor = 'text-white' }) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-sm text-gray-400">{title}</span>
    </div>
    <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
    {subtitle && (
      <div className="text-xs text-gray-500 uppercase">{subtitle}</div>
    )}
  </div>
);

const OverviewTab: React.FC<{
  signals: TradingSignal[];
  positions: Position[];
  alerts: RiskAlert[];
}> = ({ signals, positions, alerts }) => (
  <div className="grid grid-cols-3 gap-4">
    {/* Active Signals */}
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        Active Signals ({signals.length})
      </h3>
      {signals.length === 0 ? (
        <p className="text-gray-500 text-sm">No active signals</p>
      ) : (
        <div className="space-y-2">
          {signals.slice(0, 5).map((signal) => (
            <div
              key={signal.id}
              className={`p-3 rounded-lg ${
                signal.direction === 'bullish' ? 'bg-green-900/30' : 'bg-red-900/30'
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium">{signal.symbol}</span>
                <span className={signal.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                  {signal.direction.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Confluence: {signal.confluenceScore}% | {signal.strength}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Open Positions */}
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-400" />
        Open Positions ({positions.length})
      </h3>
      {positions.length === 0 ? (
        <p className="text-gray-500 text-sm">No open positions</p>
      ) : (
        <div className="space-y-2">
          {positions.slice(0, 5).map((position) => (
            <div key={position.id} className="p-3 rounded-lg bg-gray-700">
              <div className="flex justify-between">
                <span className="font-medium">{position.symbol}</span>
                <span className={position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ${position.unrealizedPnL.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {position.side.toUpperCase()} {position.quantity}x @ ${position.avgEntryPrice.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Recent Alerts */}
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        Recent Alerts ({alerts.length})
      </h3>
      {alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg ${
                alert.level === 'critical'
                  ? 'bg-red-900/30'
                  : alert.level === 'danger'
                    ? 'bg-orange-900/30'
                    : alert.level === 'warning'
                      ? 'bg-yellow-900/30'
                      : 'bg-blue-900/30'
              }`}
            >
              <div className="text-sm font-medium">{alert.category}</div>
              <div className="text-xs text-gray-300">{alert.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const SignalsTab: React.FC<{
  signals: TradingSignal[];
  onExecute: (id: string) => void;
}> = ({ signals, onExecute }) => (
  <div>
    {signals.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No active signals. The Oracle is analyzing market data...
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
            <th className="pb-2">Symbol</th>
            <th className="pb-2">Direction</th>
            <th className="pb-2">Strength</th>
            <th className="pb-2">Confluence</th>
            <th className="pb-2">Entry</th>
            <th className="pb-2">Stop</th>
            <th className="pb-2">Target</th>
            <th className="pb-2">R:R</th>
            <th className="pb-2">Option</th>
            <th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <tr key={signal.id} className="border-b border-gray-700">
              <td className="py-3 font-medium">{signal.symbol}</td>
              <td className={`py-3 ${signal.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                {signal.direction.toUpperCase()}
              </td>
              <td className="py-3">{signal.strength}</td>
              <td className="py-3">{signal.confluenceScore}%</td>
              <td className="py-3">${signal.entry.toFixed(2)}</td>
              <td className="py-3 text-red-400">${signal.stopLoss.toFixed(2)}</td>
              <td className="py-3 text-green-400">${signal.takeProfit[0]?.toFixed(2)}</td>
              <td className="py-3">{signal.riskRewardRatio.toFixed(2)}</td>
              <td className="py-3 text-xs">
                {signal.optionRecommendation?.strategy.replace('_', ' ')}
                <br />
                <span className="text-gray-500">
                  Delta: {signal.optionRecommendation?.preferredDelta}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => onExecute(signal.id)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                >
                  Execute
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const PositionsTab: React.FC<{
  positions: Position[];
  onClose: (id: string) => void;
}> = ({ positions, onClose }) => (
  <div>
    {positions.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No open positions.
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
            <th className="pb-2">Symbol</th>
            <th className="pb-2">Side</th>
            <th className="pb-2">Qty</th>
            <th className="pb-2">Entry</th>
            <th className="pb-2">Current</th>
            <th className="pb-2">P&L</th>
            <th className="pb-2">P&L %</th>
            <th className="pb-2">Greeks</th>
            <th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.id} className="border-b border-gray-700">
              <td className="py-3 font-medium">{position.symbol}</td>
              <td className={`py-3 ${position.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                {position.side.toUpperCase()}
              </td>
              <td className="py-3">{position.quantity}</td>
              <td className="py-3">${position.avgEntryPrice.toFixed(2)}</td>
              <td className="py-3">${position.currentPrice.toFixed(2)}</td>
              <td className={`py-3 ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${position.unrealizedPnL.toFixed(2)}
              </td>
              <td className={`py-3 ${position.unrealizedPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {position.unrealizedPnLPercent.toFixed(2)}%
              </td>
              <td className="py-3 text-xs text-gray-400">
                {position.currentGreeks ? (
                  <>
                    Δ: {position.currentGreeks.delta.toFixed(2)}
                    <br />
                    Θ: {position.currentGreeks.theta.toFixed(2)}
                  </>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="py-3">
                <button
                  onClick={() => onClose(position.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                >
                  Close
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const RiskTab: React.FC<{
  metrics: RiskMetrics | null;
  breakers: CircuitBreaker[];
  alerts: RiskAlert[];
}> = ({ metrics, breakers }) => (
  <div className="grid grid-cols-2 gap-6">
    {/* Risk Metrics */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Portfolio Risk Metrics</h3>
      {metrics ? (
        <div className="space-y-3">
          <RiskMetricRow
            label="Total Exposure"
            value={`$${metrics.totalExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          />
          <RiskMetricRow
            label="Current Drawdown"
            value={`${metrics.currentDrawdownPercent.toFixed(2)}%`}
            warning={metrics.currentDrawdownPercent > 5}
          />
          <RiskMetricRow
            label="Daily P&L"
            value={`$${metrics.dailyPnL.toFixed(2)} (${metrics.dailyPnLPercent.toFixed(2)}%)`}
            positive={metrics.dailyPnL >= 0}
          />
          <RiskMetricRow
            label="Position Utilization"
            value={`${metrics.openPositions}/${metrics.maxPositions} (${metrics.positionUtilization.toFixed(0)}%)`}
          />
          <RiskMetricRow
            label="Concentration Risk"
            value={`${metrics.concentrationRisk.toFixed(1)}%`}
            warning={metrics.concentrationRisk > 20}
          />
          <div className="pt-3 border-t border-gray-700">
            <h4 className="text-sm text-gray-400 mb-2">Portfolio Greeks</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Net Delta: {metrics.netDelta.toFixed(2)}</div>
              <div>Net Gamma: {metrics.netGamma.toFixed(4)}</div>
              <div>Net Theta: ${metrics.netTheta.toFixed(2)}/day</div>
              <div>Net Vega: ${metrics.netVega.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No risk metrics available</p>
      )}
    </div>

    {/* Circuit Breakers */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Circuit Breakers</h3>
      <div className="space-y-3">
        {breakers.map((breaker) => (
          <div
            key={breaker.id}
            className={`p-3 rounded-lg ${
              breaker.status === 'triggered'
                ? 'bg-red-900/50 border border-red-500'
                : breaker.status === 'warning'
                  ? 'bg-yellow-900/30 border border-yellow-500'
                  : 'bg-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{breaker.name}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  breaker.status === 'normal'
                    ? 'bg-green-600'
                    : breaker.status === 'warning'
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                }`}
              >
                {breaker.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {breaker.currentValue.toFixed(1)}% / {breaker.threshold}%
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  breaker.status === 'triggered'
                    ? 'bg-red-500'
                    : breaker.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(100, (breaker.currentValue / breaker.threshold) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RiskMetricRow: React.FC<{
  label: string;
  value: string;
  warning?: boolean;
  positive?: boolean;
}> = ({ label, value, warning, positive }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}</span>
    <span
      className={`font-medium ${
        warning
          ? 'text-yellow-400'
          : positive !== undefined
            ? positive
              ? 'text-green-400'
              : 'text-red-400'
            : 'text-white'
      }`}
    >
      {value}
    </span>
  </div>
);

export default TradingDashboard;
