// react-native.config.js
module.exports = {
  dependencies: {
    'react-native-webview': {
      platforms: {
        android: null, // disable Android platform, other platforms will still autolink
      },
    }, 
  },
};
