import { AuthGate } from './components/AuthGate';
import { TradingDashboard } from './components/trading/TradingDashboard';

function App() {
  return (
    <AuthGate>
      <TradingDashboard
        symbols={['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD']}
        paperTrading={true}
      />
    </AuthGate>
  );
}

export default App;
