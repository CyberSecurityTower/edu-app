   module.exports = function(api) {
      api.cache(true);
      return {
        presets: ['babel-preset-expo'],
        // This plugin is the reason we are creating this file.
        // It MUST be the last item in the plugins array.
        plugins: ['react-native-reanimated/plugin'],
      };
    };