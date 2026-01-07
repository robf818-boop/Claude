/**
 * Simple Password Authentication Gate
 * Protects the app with a password stored in localStorage after first login
 */

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

// Password hash - change this to your own!
// To generate: btoa('your-password-here')
const PASSWORD_HASH = 'YXV0b2ZsaXBwZXIyMDI0'; // Default: 'autoflipper2024'

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    const stored = localStorage.getItem('autoflipper_auth');
    if (stored === PASSWORD_HASH) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check password
    const inputHash = btoa(password);
    if (inputHash === PASSWORD_HASH) {
      localStorage.setItem('autoflipper_auth', PASSWORD_HASH);
      setIsAuthenticated(true);
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('autoflipper_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold text-white">AutoFlipper</h1>
            <p className="text-gray-400 mt-2">Enter password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg transition-colors"
            >
              Login
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-6">
            Private trading dashboard
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - render children with logout button available
  return (
    <div className="relative">
      {/* Logout button - fixed position */}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition-colors border border-gray-700"
      >
        Logout
      </button>
      {children}
    </div>
  );
};

export default AuthGate;
