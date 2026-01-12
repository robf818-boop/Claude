import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Inject Firebase config as global variables for iOS/Capacitor compatibility
      '__firebase_config': JSON.stringify(JSON.stringify({
        apiKey: env.VITE_FIREBASE_API_KEY || '',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: env.VITE_FIREBASE_APP_ID || ''
      })),
      '__app_id': JSON.stringify(env.VITE_UNITIQ_APP_ID || 'unitiq-enterprise-v1'),
      '__initial_auth_token': JSON.stringify(env.VITE_INITIAL_AUTH_TOKEN || '')
    }
  }
})
