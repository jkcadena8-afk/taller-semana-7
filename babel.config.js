module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Permite importar las migraciones .sql como texto
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
