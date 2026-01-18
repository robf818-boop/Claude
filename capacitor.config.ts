import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autoflipper.optionsiq',
  appName: 'OptionsIQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow connections to Netlify functions for Alpaca API
    allowNavigation: ['*.netlify.app', '*.alpaca.markets']
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'OptionsIQ'
  }
};

export default config;
