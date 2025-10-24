// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // يجب أن يكون هذا السطر هو الوحيد هنا
      'react-native-reanimated/plugin',
    ],
  };
};