/**
 * The Executor - Order Management Module
 *
 * Converts trading signals into specific option contracts and manages orders.
 * Handles position sizing, order execution, and order lifecycle.
 *
 * The Executor acts decisively on the Oracle's insights.
 */

import {
  ExecutorConfig,
  TradingSignal,
  OptionContract,
  OptionChain,
  Order,
  Position,
  OrderStatus,
  AssetClass,
  Side,
  ModuleStatus,
  TradingEvent,
  Greeks,
} from '../core/types';
import { EventBus, getEventBus } from '../events/EventBus';

interface OrderRequest {
  signal: TradingSignal;
  optionContract?: OptionContract;
  quantity: number;
  limitPrice?: number;
}

interface ExecutionResult {
  success: boolean;
  order?: Order;
  error?: string;
}

export class Executor {
  private config: ExecutorConfig;
  private eventBus: EventBus;
  private status: ModuleStatus = 'stopped';

  // Order and position tracking
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private orderIdCounter: number = 0;
  private positionIdCounter: number = 0;

  // Account state (simulated)
  private accountBalance: number = 100000; // $100k starting balance
  private buyingPower: number = 100000;

  // Event subscriptions
  private subscriptionIds: string[] = [];

  constructor(config: ExecutorConfig) {
    this.config = config;
    this.eventBus = getEventBus();
  }

  /**
   * Start the Executor
   */
  public async start(): Promise<void> {
    if (this.status === 'running') {
      console.warn('[Executor] Already running');
      return;
    }

    this.status = 'starting';
    console.log('[Executor] Starting order management...');

    // Subscribe to trading signals
    const signalSubId = this.eventBus.subscribe<TradingSignal>(
      ['signal_generated'],
      (event) => this.onSignalReceived(event),
      30 // Lower priority than Oracle
    );
    this.subscriptionIds.push(signalSubId);

    this.status = 'running';
    console.log('[Executor] Order management active');
    this.emitStatus();
  }

  /**
   * Stop the Executor
   */
  public stop(): void {
    this.status = 'stopped';

    // Unsubscribe from events
    this.subscriptionIds.forEach((id) => this.eventBus.unsubscribe(id));
    this.subscriptionIds = [];

    console.log('[Executor] Stopped');
    this.emitStatus();
  }

  /**
   * Get current status
   */
  public getStatus(): ModuleStatus {
    return this.status;
  }

  /**
   * Get all orders
   */
  public getOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get order by ID
   */
  public getOrder(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  /**
   * Get all positions
   */
  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by symbol
   */
  public getPosition(symbol: string): Position | null {
    return this.positions.get(symbol) || null;
  }

  /**
   * Get account info
   */
  public getAccountInfo(): {
    balance: number;
    buyingPower: number;
    equity: number;
    openPnL: number;
  } {
    const openPnL = this.calculateOpenPnL();
    return {
      balance: this.accountBalance,
      buyingPower: this.buyingPower,
      equity: this.accountBalance + openPnL,
      openPnL,
    };
  }

  /**
   * Execute a trade based on a signal
   */
  public async executeSignal(
    signal: TradingSignal,
    optionChain?: OptionChain
  ): Promise<ExecutionResult> {
    if (this.status !== 'running') {
      return { success: false, error: 'Executor not running' };
    }

    // Validate signal
    if (!signal.isValid) {
      return { success: false, error: 'Invalid signal' };
    }

    // Check if we already have a position in this symbol
    const existingPosition = this.positions.get(signal.symbol);
    if (existingPosition) {
      return {
        success: false,
        error: `Already have position in ${signal.symbol}`,
      };
    }

    // Select option contract if we have chain data
    let optionContract: OptionContract | undefined;
    if (optionChain && signal.optionRecommendation) {
      optionContract = this.selectOptionContract(signal, optionChain);
      if (!optionContract) {
        return {
          success: false,
          error: 'No suitable option contract found',
        };
      }
    }

    // Calculate position size
    const quantity = this.calculatePositionSize(signal, optionContract);
    if (quantity <= 0) {
      return { success: false, error: 'Position size too small' };
    }

    // Create and submit order
    const order = await this.submitOrder({
      signal,
      optionContract,
      quantity,
    });

    return { success: true, order };
  }

  /**
   * Close a position
   */
  public async closePosition(
    positionId: string,
    reason: string = 'Manual close'
  ): Promise<ExecutionResult> {
    const position = this.positions.get(positionId);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    // Create closing order
    const closingOrder = this.createOrder(
      position.symbol,
      position.assetClass,
      position.side === 'long' ? 'short' : 'long', // Opposite side to close
      position.quantity,
      position.optionContract
    );

    // Simulate fill
    await this.simulateFill(closingOrder, position.currentPrice);

    // Close the position
    this.finalizePositionClose(position, closingOrder, reason);

    return { success: true, order: closingOrder };
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === 'pending') {
      order.status = 'cancelled';
      order.cancelledAt = Date.now();

      this.eventBus.emit('order_cancelled', order, 'executor');
      return true;
    }

    return false;
  }

  // Event Handlers

  private async onSignalReceived(
    event: TradingEvent<TradingSignal>
  ): Promise<void> {
    const signal = event.data;

    console.log(
      `[Executor] Received signal: ${signal.direction} ${signal.symbol}`
    );

    // Auto-execute if configured
    if (!this.config.paperTrading) {
      console.log('[Executor] Auto-execution disabled (live trading)');
      return;
    }

    // For paper trading, auto-execute
    const result = await this.executeSignal(signal);
    if (!result.success) {
      console.log(`[Executor] Execution failed: ${result.error}`);
    }
  }

  // Option Selection

  private selectOptionContract(
    signal: TradingSignal,
    chain: OptionChain
  ): OptionContract | null {
    const rec = signal.optionRecommendation;
    if (!rec) return null;

    const contracts = signal.direction === 'bullish' ? chain.calls : chain.puts;
    const targetDelta = Math.abs(rec.preferredDelta);
    const targetDTE = rec.preferredDTE;

    let bestContract: OptionContract | null = null;
    let bestScore = Infinity;

    contracts.forEach((contract) => {
      // Filter criteria
      if (contract.openInterest < rec.minOpenInterest) return;

      const spread = (contract.ask - contract.bid) / contract.mark;
      if (spread > rec.maxBidAskSpread) return;

      if (rec.maxIVRank && contract.ivRank && contract.ivRank > rec.maxIVRank) {
        return;
      }

      // Score based on delta and DTE proximity
      const deltaScore = Math.abs(Math.abs(contract.greeks.delta) - targetDelta);
      const dteScore = Math.abs(contract.daysToExpiration - targetDTE) / 30; // Normalize

      const totalScore = deltaScore * 2 + dteScore; // Weight delta more

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestContract = contract;
      }
    });

    return bestContract;
  }

  // Position Sizing

  private calculatePositionSize(
    signal: TradingSignal,
    optionContract?: OptionContract
  ): number {
    const maxRiskAmount =
      this.accountBalance * (signal.maxRiskPercent / 100);

    if (optionContract) {
      // For options, calculate based on premium
      const premium = optionContract.ask * 100; // Per contract (100 shares)
      const maxContracts = Math.floor(maxRiskAmount / premium);

      // Apply position limit
      const maxPositionValue =
        this.accountBalance * (this.config.maxPositionPercent / 100);
      const positionLimit = Math.floor(maxPositionValue / premium);

      // Apply recommendation limit if available
      const recLimit = signal.optionRecommendation?.contracts || Infinity;

      return Math.min(maxContracts, positionLimit, recLimit, 10); // Max 10 contracts
    } else {
      // For stocks/futures, calculate based on stop loss
      const riskPerShare = Math.abs(signal.entry - signal.stopLoss);
      const shares = Math.floor(maxRiskAmount / riskPerShare);

      // Apply position limit
      const maxPositionValue =
        this.accountBalance * (this.config.maxPositionPercent / 100);
      const positionLimit = Math.floor(maxPositionValue / signal.entry);

      return Math.min(shares, positionLimit);
    }
  }

  // Order Management

  private async submitOrder(request: OrderRequest): Promise<Order> {
    const { signal, optionContract, quantity } = request;

    const order = this.createOrder(
      optionContract?.symbol || signal.symbol,
      optionContract ? 'option' : 'equity',
      signal.direction === 'bullish' ? 'long' : 'short',
      quantity,
      optionContract
    );

    // Store order
    this.orders.set(order.id, order);

    // Emit order submitted event
    this.eventBus.emit('order_submitted', order, 'executor');

    console.log(
      `[Executor] Order submitted: ${order.side} ${order.quantity}x ${order.symbol}`
    );

    // Simulate execution (in paper trading mode)
    if (this.config.paperTrading) {
      const fillPrice = optionContract
        ? optionContract.ask // Buy at ask
        : signal.entry;

      await this.simulateFill(order, fillPrice);
    }

    return order;
  }

  private createOrder(
    symbol: string,
    assetClass: AssetClass,
    side: Side,
    quantity: number,
    optionContract?: OptionContract
  ): Order {
    return {
      id: `ord_${++this.orderIdCounter}_${Date.now()}`,
      clientOrderId: `client_${Date.now()}`,
      timestamp: Date.now(),
      symbol,
      assetClass,
      optionContract,
      side,
      quantity,
      filledQuantity: 0,
      orderType: this.config.defaultOrderType,
      timeInForce: this.config.defaultTimeInForce,
      status: 'pending',
      submittedAt: Date.now(),
    };
  }

  private async simulateFill(order: Order, price: number): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add slippage
    const slippage = price * (Math.random() * this.config.maxSlippage);
    const fillPrice = order.side === 'long' ? price + slippage : price - slippage;

    // Update order
    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.avgFillPrice = fillPrice;
    order.filledAt = Date.now();

    // Emit order filled event
    this.eventBus.emit('order_filled', order, 'executor');

    console.log(
      `[Executor] Order filled: ${order.quantity}x ${order.symbol} @ ${fillPrice.toFixed(2)}`
    );

    // Create or update position
    this.updatePositionFromFill(order);
  }

  private updatePositionFromFill(order: Order): void {
    const existingPosition = Array.from(this.positions.values()).find(
      (p) => p.symbol === order.symbol
    );

    if (existingPosition) {
      // Update existing position
      if (existingPosition.side === order.side) {
        // Adding to position
        const totalCost =
          existingPosition.avgEntryPrice * existingPosition.quantity +
          order.avgFillPrice! * order.filledQuantity;
        const totalQty = existingPosition.quantity + order.filledQuantity;

        existingPosition.avgEntryPrice = totalCost / totalQty;
        existingPosition.quantity = totalQty;
      } else {
        // Closing position
        existingPosition.quantity -= order.filledQuantity;
        if (existingPosition.quantity <= 0) {
          this.positions.delete(existingPosition.id);

          this.eventBus.emit(
            'position_closed',
            {
              position: existingPosition,
              closePrice: order.avgFillPrice,
              pnl: existingPosition.unrealizedPnL,
            },
            'executor'
          );
        }
      }
    } else {
      // Create new position
      const position = this.createPosition(order);
      this.positions.set(position.id, position);

      this.eventBus.emit('position_opened', position, 'executor');

      console.log(
        `[Executor] Position opened: ${position.side} ${position.quantity}x ${position.symbol}`
      );
    }

    // Update buying power
    const cost = order.avgFillPrice! * order.filledQuantity * (order.assetClass === 'option' ? 100 : 1);
    this.buyingPower -= cost;
  }

  private createPosition(order: Order): Position {
    const currentPrice = order.avgFillPrice!;

    return {
      id: `pos_${++this.positionIdCounter}_${Date.now()}`,
      symbol: order.symbol,
      assetClass: order.assetClass,
      side: order.side,
      quantity: order.filledQuantity,
      avgEntryPrice: order.avgFillPrice!,
      currentPrice,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      optionContract: order.optionContract,
      currentGreeks: order.optionContract?.greeks,
      openedAt: Date.now(),
      lastUpdated: Date.now(),
    };
  }

  private finalizePositionClose(
    position: Position,
    closingOrder: Order,
    reason: string
  ): void {
    const pnl =
      (closingOrder.avgFillPrice! - position.avgEntryPrice) *
      position.quantity *
      (position.side === 'long' ? 1 : -1) *
      (position.assetClass === 'option' ? 100 : 1);

    // Update account balance
    this.accountBalance += pnl;
    const cost = position.avgEntryPrice * position.quantity * (position.assetClass === 'option' ? 100 : 1);
    this.buyingPower += cost;

    // Remove position
    this.positions.delete(position.id);

    console.log(
      `[Executor] Position closed: ${position.symbol} | P&L: $${pnl.toFixed(2)} | Reason: ${reason}`
    );

    this.eventBus.emit(
      'position_closed',
      {
        position,
        closePrice: closingOrder.avgFillPrice,
        pnl,
        reason,
      },
      'executor'
    );
  }

  /**
   * Update position prices (called periodically)
   */
  public updatePositionPrices(prices: Map<string, number>): void {
    this.positions.forEach((position) => {
      const newPrice = prices.get(position.symbol);
      if (newPrice) {
        position.currentPrice = newPrice;
        position.unrealizedPnL =
          (newPrice - position.avgEntryPrice) *
          position.quantity *
          (position.side === 'long' ? 1 : -1) *
          (position.assetClass === 'option' ? 100 : 1);
        position.unrealizedPnLPercent =
          (position.unrealizedPnL /
            (position.avgEntryPrice * position.quantity * (position.assetClass === 'option' ? 100 : 1))) *
          100;
        position.lastUpdated = Date.now();

        this.eventBus.emit('position_updated', position, 'executor');
      }
    });
  }

  private calculateOpenPnL(): number {
    let totalPnL = 0;
    this.positions.forEach((position) => {
      totalPnL += position.unrealizedPnL;
    });
    return totalPnL;
  }

  private emitStatus(): void {
    this.eventBus.emit(
      'system_status',
      {
        module: 'executor',
        status: this.status,
      },
      'executor'
    );
  }
}

// Default Executor configuration
export const defaultExecutorConfig: ExecutorConfig = {
  defaultOrderType: 'limit',
  defaultTimeInForce: 'day',
  maxSlippage: 0.001, // 0.1%
  riskPerTradePercent: 2,
  maxPositionPercent: 10,
  targetDelta: 0.70,
  targetDTE: 14,
  maxBidAskSpreadPercent: 0.05,
  minOpenInterest: 500,
  paperTrading: true,
  broker: 'mock',
};
