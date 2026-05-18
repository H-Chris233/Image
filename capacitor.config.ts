import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aethergenix.image',
  appName: 'AetherGenix',
  webDir: 'dist',
  server: {
    url: 'https://image.get-money.locker',
    cleartext: false,
  },
};

export default config;
