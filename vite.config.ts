import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject Firebase config as global variables for iOS/Capacitor compatibility
    '__firebase_config': JSON.stringify(JSON.stringify({
      apiKey: process.env.VITE_FIREBASE_API_KEY || '',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.VITE_FIREBASE_APP_ID || ''
    })),
    '__app_id': JSON.stringify(process.env.VITE_UNITIQ_APP_ID || 'unitiq-enterprise-v1'),
    '__initial_auth_token': JSON.stringify(process.env.VITE_INITIAL_AUTH_TOKEN || '')
  }
})
