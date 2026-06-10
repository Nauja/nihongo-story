import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nihongostory.app',
  appName: '日本語ストーリー',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
