const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure .cjs works
config.resolver.sourceExts.push('cjs');

// Make sure .lottie is bundled as an asset
config.resolver.assetExts.push('lottie');

// (Optional but recommended) Ensure .json stays in assetExts for Lottie animations
if (!config.resolver.assetExts.includes('json')) {
  config.resolver.assetExts.push('json');
}

// Disable package exports resolution (Expo tweak)
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
