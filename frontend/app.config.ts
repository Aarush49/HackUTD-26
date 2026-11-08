export default {
  expo: {
    name: 'Canopy Finance',
    slug: 'canopy-finance',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'canopy',
    userInterfaceStyle: 'light',
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-logo.png',
          imageWidth: 390,
          resizeMode: 'contain',
          backgroundColor: '#FAFAF4',
          dark: {
            image: './assets/splash-logo.png',
            backgroundColor: '#FAFAF4',
          },
        },
      ],
    ],
    experiments: { typedRoutes: true },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.canopy.finance',
      config: { usesNonExemptEncryption: false },
    },
    android: {
      package: 'com.canopy.finance',
      adaptiveIcon: { backgroundColor: '#E0F2FE' },
    },
  },
};
