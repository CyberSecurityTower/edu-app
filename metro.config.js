const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // نحتفظ بـ crypto لأننا نحتاجها فعلياً
  crypto: require.resolve('react-native-get-random-values'),
  
  // نوجه الباقي للملف الفارغ لإسكات الأخطاء
  zlib: require.resolve('./mocks.js'),
  http: require.resolve('./mocks.js'),
  https: require.resolve('./mocks.js'),
  stream: require.resolve('./mocks.js'),
  net: require.resolve('./mocks.js'),
  tls: require.resolve('./mocks.js'),
  url: require.resolve('./mocks.js'),
  fs: require.resolve('./mocks.js'),
  path: require.resolve('./mocks.js'),
};

module.exports = config;