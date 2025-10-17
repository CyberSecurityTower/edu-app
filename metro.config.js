 // metro.config.js
    const { getDefaultConfig } = require('expo/metro-config');

    const config = getDefaultConfig(__dirname);

    // --- THE FIX IS HERE ---
    // Add 'lottie' to the list of asset extensions.
    config.resolver.assetExts.push('lottie');

    module.exports = config