/**
 * Event-Driven Options Auto-Flipper
 *
 * A modular, event-driven trading system for options and futures.
 *
 * Architecture:
 * - Sentinel: Real-time data ingestion (candles, option chains, Greeks)
 * - Oracle: Technical analysis and signal generation
 * - Executor: Order management and position handling
 * - Warden: Risk monitoring and circuit breakers
 *
 * All modules communicate through an EventBus for loose coupling.
 */

// Main orchestrator
export { AutoFlipper, createAutoFlipper } from './AutoFlipper';

// Individual modules
export { Sentinel } from './sentinel/Sentinel';
export { Oracle, defaultOracleConfig } from './oracle/Oracle';
export { Executor, defaultExecutorConfig } from './executor/Executor';
export { Warden, defaultWardenConfig } from './warden/Warden';

// Event system
export { EventBus, getEventBus } from './events/EventBus';

// Technical indicators
export {
  calculateEMA,
  calculateEMAValues,
  calculateSMA,
  calculateRSI,
  calculateRSIValues,
  calculateATR,
  calculateATRValues,
  calculateMACD,
  calculateVolumeAnalysis,
  calculateBollingerBands,
  calculateVWAP,
  calculateStochastic,
  findSupportResistance,
} from './utils/indicators';

// All types
export * from './core/types';
