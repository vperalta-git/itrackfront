const { getDefaultConfig } = require('@expo/metro-config');

// Get the default Expo Metro config
const config = getDefaultConfig(__dirname);

// Customize the minification settings
config.transformer.minifierPath = 'metro-minify-terser';
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: true,
};

// Export the updated config
module.exports = config;
