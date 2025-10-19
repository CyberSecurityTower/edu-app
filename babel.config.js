// babel.config.js (الشكل الجديد والمصحح)
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // --- السطر الحاسم الذي سيصلح كل شيء ---
    plugins: ['react-native-reanimated/plugin'],
  };
};