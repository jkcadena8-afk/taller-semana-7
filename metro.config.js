const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro debe reconocer la extension .sql para empaquetar las migraciones
config.resolver.sourceExts.push('sql');

module.exports = config;
