import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autoflipper.app',
  appName: 'AutoFlipper',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow connections to Netlify functions for Alpaca API
    allowNavigation: ['*.netlify.app', '*.alpaca.markets']
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'AutoFlipper'
  }
};

export default config;
