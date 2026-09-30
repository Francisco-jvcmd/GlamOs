import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.glamos.salon',
  appName: 'GlamOS',
  webDir: 'dist',
  plugins: {
    GoogleSignIn: {
      // El serverClientId debe ser el Web Client ID del proyecto en Google Cloud
      serverClientId: '205191300160-5nuvhdo94rkp84q7h1j663af3e35s893.apps.googleusercontent.com',
    },
  },
};

export default config;
