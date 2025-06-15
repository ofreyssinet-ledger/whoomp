const {resolve} = require('path');

const {getDefaultConfig} = require('expo/metro-config');
const {mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts, sourceExts} = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    projectRoot: resolve(__dirname, '../..'),
    nodeModulesPaths: [
      resolve(__dirname, 'node_modules'),
      resolve(__dirname, '../../node_modules'),
    ],
    sourceExts: [...sourceExts, 'mjs', 'sql'],
    // NOTE: react-native is the default, browser added to fix axios issue where nodejs version is the default export
    unstable_conditionNames: ['react-native', 'browser'],
    unstable_enablePackageExports: true,
    unstable_enableSymlinks: true,
  },
  watchFolders: [
    resolve(__dirname, '../../packages'),
    resolve(__dirname, '../../node_modules'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
