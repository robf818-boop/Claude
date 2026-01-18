#!/bin/bash

# AutoFlipper Setup Verification Script
# Run this to check if everything is configured correctly

echo "🔍 AutoFlipper Setup Verification"
echo "=================================="
echo ""

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js v18 or higher."
    exit 1
fi

# Check npm
echo ""
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found. Please install npm."
    exit 1
fi

# Check if .env exists
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check if API keys are set
    if grep -q "ALPACA_API_KEY=your_paper_trading_api_key_here" .env; then
        echo "⚠️  WARNING: .env file still has placeholder values"
        echo "   Please edit .env and add your real Alpaca API keys"
    elif grep -q "ALPACA_API_KEY=" .env && grep -q "ALPACA_SECRET_KEY=" .env; then
        echo "✅ API keys are configured (values detected)"
    else
        echo "❌ API keys not found in .env file"
    fi
else
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
    echo "   Then edit .env and add your Alpaca API keys"
fi

# Check if node_modules exists
echo ""
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed"
    echo "   Run: npm install"
fi

# Check if package.json exists
echo ""
echo "Checking project files..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found. Are you in the right directory?"
    exit 1
fi

# Summary
echo ""
echo "=================================="
echo "Setup Status Summary"
echo "=================================="
echo ""

ISSUES=0

if ! command -v node &> /dev/null; then
    ((ISSUES++))
fi

if ! command -v npm &> /dev/null; then
    ((ISSUES++))
fi

if [ ! -f ".env" ]; then
    ((ISSUES++))
fi

if [ ! -d "node_modules" ]; then
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    echo "🎉 All checks passed!"
    echo ""
    echo "You're ready to start the trading system:"
    echo "  npm run dev"
    echo ""
    echo "Next steps:"
    echo "  1. Make sure your Alpaca API keys are in .env"
    echo "  2. Run: npm run dev"
    echo "  3. Open http://localhost:5173"
    echo "  4. Click 'Start System' in the dashboard"
else
    echo "⚠️  Found $ISSUES issue(s) that need attention"
    echo ""
    echo "Please fix the issues above and run this script again."
fi

echo ""
